from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models import User
from schemas import Token, User as UserSchema, PasswordChange, UserUpdate, PasswordResetRequest, PasswordResetConfirm
import schemas
from auth_dependencies import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me")
async def update_user_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    response_data = {"detail": "Профиль обновлен"}

    # If email is changing
    if data.email is not None and data.email != current_user.email:
        # Check if email is already taken
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Этот Email уже используется")

        # Generate code
        import secrets
        code = secrets.token_hex(3).upper() # 6 chars
        
        current_user.pending_email = data.email
        current_user.verification_code = code
        
        # Send email
        target_email = current_user.email if current_user.email else current_user.pending_email
        from email_service import send_verification_email
        send_verification_email(target_email, current_user.username, code)
        
        if current_user.email:
            response_data["detail"] = f"Код подтверждения отправлен на ваш текущий Email ({current_user.email})"
        else:
            response_data["detail"] = f"Код подтверждения отправлен на новый Email ({current_user.pending_email})"
        
        response_data["verification_required"] = True
    
    db.commit()
    db.refresh(current_user)
    
    # Return user data usually, but here we might want to signal verification needed
    # We will return the user object, but valid client should check pending status via specific flow
    # Simplest for now: return simple JSON with instruction, OR return User with extra field?
    # Let's return the UserSchema, but maybe we need a custom response to indicate verification step?
    # The frontend expects UserSchema. Let's return UserSchema but add a custom header or rely on client to handle specific flow?
    # Implementation Plan said "Returns status verification_required". 
    # Let's change response model to generic dict or enable a specific field in schema?
    # For simplicity, returning the User object is standard. 
    # We can rely on the fact that if data.email was sent, frontend should look for "verification_required" in a JSON response if we changed response_model.
    # To keep it compatible: let's return a dict combining user fields + status.
    # OR better: The frontend calls this generic update.
    # Let's change response_model to None (JSON) to allow custom fields.
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "detail": response_data["detail"],
        "verification_required": response_data.get("verification_required", False),
        "pending_email": current_user.pending_email # helpful for UI
    }

from pydantic import BaseModel

class VerifyEmail(BaseModel):
    code: str

@router.post("/me/verify-email")
async def verify_email_me(
    data: VerifyEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.pending_email or not current_user.verification_code:
        raise HTTPException(status_code=400, detail="Нет ожидающего подтверждения")
    
    if data.code.strip().upper() != current_user.verification_code:
        raise HTTPException(status_code=400, detail="Неверный код")
    
    # Apply change
    current_user.email = current_user.pending_email
    current_user.pending_email = None
    current_user.verification_code = None
    
    db.commit()
    return {"detail": "Email успешно подтвержден"}

@router.post("/update-password")
async def update_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный старый пароль"
        )
    
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"detail": "Пароль успешно изменен"}

@router.post("/me/reset-password")
async def reset_password_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У вас не указан Email. Обратитесь к администратору."
        )

    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for i in range(12))

    current_user.password_hash = get_password_hash(new_password)
    db.commit()

    from email_service import send_password_reset_email
    send_password_reset_email(current_user.email, current_user.username, new_password)

    return {"detail": f"Новый пароль отправлен на {current_user.email}"}

@router.post("/request-password-reset")
async def request_password_reset(
    data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Don't reveal user existence
        return {"detail": "Если этот Email зарегистрирован, мы отправили код подтверждения."}
    
    import secrets
    code = secrets.token_hex(3).upper()
    user.verification_code = code
    db.commit()
    
    from email_service import send_verification_email
    # Reusing verification email or creating a new one? 
    # Let's use a generic code sender or create specific one. 
    # For now reusing send_verification_email but changing subject inside it? 
    # Or better: just send code.
    send_verification_email(user.email, user.username, code)
    
    return {"detail": "Если этот Email зарегистрирован, мы отправили код подтверждения."}

@router.post("/reset-password-confirm")
async def reset_password_confirm(
    data: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Неверный Email или код")
        
    if not user.verification_code or user.verification_code != data.code.strip().upper():
        raise HTTPException(status_code=400, detail="Неверный код")
        
    user.password_hash = get_password_hash(data.new_password)
    user.verification_code = None
    db.commit()
    
    return {"detail": "Пароль успешно сброшен"}
