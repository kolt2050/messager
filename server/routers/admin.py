from typing import List
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Channel, AuditLog
from schemas import UserCreate, User as UserSchema, ChannelCreate, Channel as ChannelSchema, UserUpdateAdmin
from auth_dependencies import get_current_admin, get_password_hash
from email_service import send_password_reset_email

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)]
)

# --- USER MANAGEMENT ---

@router.post("/users", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, password_hash=hashed_password, is_admin=False)
    db.add(new_user)
    
    # Auto-add to "Общий" channel
    default_channel = db.query(Channel).filter(Channel.name == "Общий").first()
    if default_channel:
        default_channel.members.append(new_user)
    
    # Audit Log
    log = AuditLog(user_id=admin.id, action="CREATE_USER", details=f"Created user {user.username}")
    db.add(log)
    
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
        
    db.delete(user)
    
    log = AuditLog(user_id=admin.id, action="DELETE_USER", details=f"Deleted user id {user_id}")
    db.add(log)
    
    db.commit()
    return {"detail": "Пользователь удален"}

@router.get("/users", response_model=List[UserSchema])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.patch("/users/{user_id}", response_model=UserSchema)
def update_user(user_id: int, user_update: UserUpdateAdmin, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user_update.email is not None:
        db_user.email = user_update.email
        # Admin override: clear any pending verification
        db_user.pending_email = None
        db_user.verification_code = None
    if user_update.is_admin is not None:
        if db_user.id == admin.id and user_update.is_admin is False:
             raise HTTPException(status_code=400, detail="Нельзя снять права администратора с самого себя")
        db_user.is_admin = user_update.is_admin
        
    db.commit()
    db.refresh(db_user)
    
    log = AuditLog(user_id=admin.id, action="UPDATE_USER", details=f"Updated user {db_user.username}")
    db.add(log)
    db.commit()
    
    return db_user

@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if not db_user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="У пользователя не указана почта")
        
    # Generate random password
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    db_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    # Send mock email
    send_password_reset_email(db_user.email, db_user.username, new_password)
    
    log = AuditLog(user_id=admin.id, action="RESET_PASSWORD", details=f"Reset password for user {db_user.username}")
    db.add(log)
    db.commit()
    
    return {"detail": f"Новый пароль отправлен на почту {db_user.email}"}

# --- CHANNEL MANAGEMENT (ADMIN) ---
# Note: Users can create channels too, but this is the ADMIN endpoint for managing them (e.g. strict deletion)
# For now, let's put general channel creation in the public API, or restrict creation to admins? 
# Requirement says: "Administrator can create users, delete them, create channels, delete channels"
# AND "User can ... create channels". 
# So both can create. Admin can definitely delete any.

@router.delete("/channels/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Канал не найден")
        
    if channel.name == "Общий":
        raise HTTPException(status_code=400, detail="Нельзя удалить основной канал")
    
    db.delete(channel)
    
    log = AuditLog(user_id=admin.id, action="DELETE_CHANNEL", details=f"Deleted channel {channel.name}")
    db.add(log)
    
    db.commit()
    return {"detail": "Канал удален"}

# --- SYSTEM SETTINGS (ADMIN) ---

from schemas import SMTPSettings, SystemSetting as SystemSettingSchema
from models import SystemSetting
import os

@router.get("/settings/smtp", response_model=SMTPSettings)
def get_smtp_settings(db: Session = Depends(get_db)):
    # Fetch from DB
    settings_kv = {s.key: s.value for s in db.query(SystemSetting).all()}
    
    # Fallback to env if not in DB
    return {
        "smtp_host": settings_kv.get("SMTP_HOST") or os.getenv("SMTP_HOST", ""),
        "smtp_port": int(settings_kv.get("SMTP_PORT") or os.getenv("SMTP_PORT", "587")),
        "smtp_user": settings_kv.get("SMTP_USER") or os.getenv("SMTP_USER", ""),
        "smtp_pass": settings_kv.get("SMTP_PASS") or os.getenv("SMTP_PASS", "")
    }

@router.put("/settings/smtp")
def update_smtp_settings(settings: SMTPSettings, db: Session = Depends(get_db)):
    # Helper to update or create
    def set_value(key, val):
        item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not item:
            item = SystemSetting(key=key)
            db.add(item)
        item.value = str(val)
    
    set_value("SMTP_HOST", settings.smtp_host)
    set_value("SMTP_PORT", settings.smtp_port)
    set_value("SMTP_USER", settings.smtp_user)
    set_value("SMTP_PASS", settings.smtp_pass)
    
    db.commit()
    return {"detail": "Настройки SMTP обновлены"}
