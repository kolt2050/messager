from sqlalchemy import create_engine, Column, String, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import sys

# Append parent directory to path to import models if needed, 
# but here we can just define the base or import from models.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, SQLALCHEMY_DATABASE_URL
from models import SystemSetting

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    inspector = inspect(engine)
    if "system_settings" not in inspector.get_table_names():
        print("Creating system_settings table...")
        SystemSetting.__table__.create(engine)
        
        # Seed with current env vars
        print("Seeding with current environment variables...")
        defaults = {
            "SMTP_HOST": os.environ.get("SMTP_HOST", "smtp.mailersend.net"),
            "SMTP_PORT": os.environ.get("SMTP_PORT", "587"),
            "SMTP_USER": os.environ.get("SMTP_USER", ""),
            "SMTP_PASS": os.environ.get("SMTP_PASS", "")
        }
        
        for key, value in defaults.items():
            if value: # Only save if we have a value
                setting = SystemSetting(key=key, value=str(value))
                db.add(setting)
        
        db.commit()
        print("Migration and seeding complete.")
    existing_count = db.query(SystemSetting).count()
    if existing_count == 0:
         print("Seeding with current environment variables...")
         defaults = {
            "SMTP_HOST": os.environ.get("SMTP_HOST", "smtp.mailersend.net"),
            "SMTP_PORT": os.environ.get("SMTP_PORT", "587"),
            "SMTP_USER": os.environ.get("SMTP_USER", ""),
            "SMTP_PASS": os.environ.get("SMTP_PASS", "")
         }
        
         for key, value in defaults.items():
            if value: # Only save if we have a value
                setting = SystemSetting(key=key, value=str(value))
                db.add(setting)
        
         db.commit()
         print("Seeding complete.")
    else:
         print("Settings already exist, skipping seed.")

if __name__ == "__main__":
    migrate()
