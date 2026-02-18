from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from models import User
from auth_dependencies import get_password_hash
from routers import auth, chat, admin, files
from fastapi.staticfiles import StaticFiles
import os
import time
import logging
from datetime import datetime
from fastapi import FastAPI, Request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api_logger")

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Messager API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    client_ip = request.client.host if request.client else "unknown"
    status_code = response.status_code
    
    log_entry = f"[{now}] {client_ip} - {request.method} {request.url.path} - Status: {status_code} ({duration:.2f}ms)"
    
    if 200 <= status_code < 400:
        print(f"✅ SUCCESS: {log_entry}")
    else:
        print(f"❌ FAILURE: {log_entry}")
        
    return response

# Create uploads directory if not exists
os.makedirs("static/uploads", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="static/uploads"), name="uploads")

# CORS (Allow all for simplicity in this task, or strictly client url)
# origins = [
#     "http://localhost",
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
#     "*" # For Docker to Docker comms if needed or lazy dev
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(files.router)
from routers import utils
app.include_router(utils.router)

@app.get("/")
def read_root():
    return {
        "message": "Messager API is running",
        "documentation": "/docs",
        "status": "ready"
    }

@app.on_event("startup")
def startup_event():
    # Create default admin if not exists
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            hashed_password = get_password_hash("admin")
            admin_user = User(username="admin", password_hash=hashed_password, is_admin=True)
            db.add(admin_user)
            db.commit()
            print("Admin user created: admin/admin")
        
        # Create default channel
        from models import Channel
        default_channel = db.query(Channel).filter(Channel.name == "Общий").first()
        if not default_channel:
            new_channel = Channel(name="Общий", created_by=admin_user.id if admin_user else 1)
            # Add creator as member if available
            if admin_user:
                new_channel.members.append(admin_user)
            db.add(new_channel)
            db.commit()
            db.refresh(new_channel)
            default_channel = new_channel
            print("Default channel 'Общий' created")
        
        # Ensure all existing users are members of the default channel
        all_users = db.query(User).all()
        added_count = 0
        for u in all_users:
            if u not in default_channel.members:
                default_channel.members.append(u)
                added_count += 1
        
        if added_count > 0:
            db.commit()
            print(f"Synced {added_count} users to 'Общий' channel")
    finally:
        db.close()
