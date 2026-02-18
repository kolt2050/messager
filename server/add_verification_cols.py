from database import engine, SessionLocal
from sqlalchemy import text
import sys

def run_migration():
    print("Running migration: Adding verification columns to users table...")
    with engine.connect() as connection:
        with connection.begin():
            try:
                # Add pending_email column
                connection.execute(text("ALTER TABLE users ADD COLUMN pending_email VARCHAR"))
                print("Added pending_email column.")
            except Exception as e:
                print(f"Skipping pending_email (might already exist): {e}")

            try:
                # Add verification_code column
                connection.execute(text("ALTER TABLE users ADD COLUMN verification_code VARCHAR"))
                print("Added verification_code column.")
            except Exception as e:
                print(f"Skipping verification_code (might already exist): {e}")
    
    print("Migration complete.")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
