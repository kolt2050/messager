from typing import List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import get_db
from models import User, Channel, Message
from schemas import ChannelCreate, Channel as ChannelSchema, MessageCreate, Message as MessageSchema, MemberAdd
from auth_dependencies import get_current_user

router = APIRouter(
    tags=["chat"]
)

# --- WEB SOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# --- CHANNELS ---

@router.get("/channels", response_model=List[ChannelSchema])
def get_channels(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_admin:
        return db.query(Channel).all()
    
    # Return channels where user is owner or member
    return db.query(Channel).filter(
        (Channel.created_by == current_user.id) | 
        (Channel.members.contains(current_user))
    ).all()

@router.post("/channels", response_model=ChannelSchema)
def create_channel(channel: ChannelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_channel = db.query(Channel).filter(Channel.name == channel.name).first()
    if db_channel:
        raise HTTPException(status_code=400, detail="Канал с таким именем уже существует")
    
    new_channel = Channel(name=channel.name, created_by=current_user.id)
    # Automatically add creator as a member
    new_channel.members.append(current_user)
    
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    
    return new_channel

@router.delete("/channels/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")
    
    if channel.name == "Общий":
        raise HTTPException(status_code=400, detail="Нельзя удалить основной канал")
    
    # Check if user is creator or admin
    if channel.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете удалять только созданные вами каналы")
    
    db.delete(channel)
    db.commit()
    
    import asyncio
    asyncio.create_task(manager.broadcast({"type": "channel_deleted", "id": channel_id}))
    
    return {"detail": "Канал удален"}

# --- MEMBER MANAGEMENT ---

@router.post("/channels/{channel_id}/members")
def add_member(channel_id: int, member_data: MemberAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")
    
    if channel.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только автор канала может добавлять участников")
    
    user_to_add = db.query(User).filter(User.username == member_data.username).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user_to_add in channel.members:
        return {"detail": "Пользователь уже является участником"}
    
    channel.members.append(user_to_add)
    db.commit()
    return {"detail": f"Пользователь {user_to_add.username} добавлен"}

@router.delete("/channels/{channel_id}/members/{user_id}")
def remove_member(channel_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")
    
    if channel.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только автор канала может удалять участников")
    
    user_to_remove = db.query(User).filter(User.id == user_id).first()
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user_to_remove.id == channel.created_by:
        raise HTTPException(status_code=400, detail="Нельзя удалить автора канала")
    
    if user_to_remove in channel.members:
        channel.members.remove(user_to_remove)
        db.commit()
    
    return {"detail": "Участник удален"}

# --- MESSAGES ---

@router.get("/channels/{channel_id}/messages", response_model=List[MessageSchema])
def get_messages(channel_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")
    
    if not current_user.is_admin and current_user not in channel.members and channel.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="У вас нет доступа к этому каналу")
    
    messages = db.query(Message).filter(Message.channel_id == channel_id).all()
    for msg in messages:
        msg.username = msg.user.username
    return messages

@router.post("/channels/{channel_id}/messages", response_model=MessageSchema)
async def create_message(channel_id: int, message: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")

    if not current_user.is_admin and current_user not in channel.members and channel.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="У вас нет доступа к этому каналу")

    new_message = Message(
        channel_id=channel_id,
        user_id=current_user.id,
        content=message.content,
        image_url=message.image_url
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    msg_data = {
        "id": new_message.id,
        "channel_id": new_message.channel_id,
        "user_id": new_message.user_id,
        "content": new_message.content,
        "image_url": new_message.image_url,
        "username": current_user.username,
        "created_at": new_message.created_at.isoformat()
    }
    
    # Broadcast to all connected clients
    await manager.broadcast({"type": "new_message", "message": msg_data})
    
    new_message.username = current_user.username
    return new_message

@router.delete("/messages/{message_id}")
async def delete_message(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    
    if message.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете удалять только свои сообщения")
    
    db.delete(message)
    db.commit()
    
    await manager.broadcast({"type": "message_deleted", "id": message_id, "channel_id": message.channel_id})
    
    return {"detail": "Сообщение удалено"}

# --- WEBSOCKET ---

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive, maybe implement ping/pong or ignore specific inputs
    except WebSocketDisconnect:
        manager.disconnect(websocket)
