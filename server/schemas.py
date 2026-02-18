from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    email: str
    code: str
    new_password: str

# User Schemas
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdateAdmin(BaseModel):
    email: Optional[str] = None
    is_admin: Optional[bool] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None

# Channel Schemas
class ChannelBase(BaseModel):
    name: str

class ChannelCreate(ChannelBase):
    pass

class Channel(ChannelBase):
    id: int
    created_by: int
    created_at: datetime
    members: List[User] = []

    class Config:
        from_attributes = True

class MemberAdd(BaseModel):
    username: str

# Message Schemas
class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    @field_validator('content')
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        if not v:
            return v
            
        # 1. Truncate to 1024
        v = v[:1024]
        
        # 2. Remove HTML tags (basic regex approach for speed/simplicity without heavy deps like bleach if not installed)
        # Assuming we want to strip ANY potential tag-like structure
        import re
        v = re.sub(r'<[^>]*>', '', v)
        
        # 3. Remove control characters (except newlines and tabs)
        # C0 controls: 00-1F (except 09, 0A, 0D) and 7F
        # Using a regex to clear them
        v = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', v)
        
        return v.strip()

class Message(MessageBase):
    id: int
    channel_id: int
    user_id: int
    created_at: datetime
    # Можно добавить username отправителя для удобства на фронте
    username: Optional[str] = None 
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# System Settings Schemas
class SMTPSettings(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_pass: str

class SystemSetting(BaseModel):
    key: str
    value: Optional[str] = None
    
    class Config:
        from_attributes = True
