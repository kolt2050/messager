from database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    with SessionLocal() as db:
        try:
            db.execute(text("ALTER TABLE messages ADD COLUMN image_url TEXT"))
            db.commit()
            print("Successfully added image_url column to messages table")
        except Exception as e:
            print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    migrate()
