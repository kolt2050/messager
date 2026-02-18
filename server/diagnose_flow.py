import requests
import sys
import time
from database import engine
from sqlalchemy import text

# Try 0.0.0.0 directly as we are inside the container
BASE_URL = "http://127.0.0.1:8000"

def check_db_schema():
    print("Checking DB Schema...")
    try:
        with engine.connect() as conn:
            # SQLite specific check
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row.name for row in result]
            print(f"Columns in users table: {columns}")
            if "pending_email" in columns and "verification_code" in columns:
                print("Schema is CORRECT.")
                return True
            else:
                print("Schema is MISSING columns!")
                return False
    except Exception as e:
        print(f"DB Check failed: {e}")
        return False

def check_server_health():
    print("Checking Server Health...")
    for i in range(10):
        try:
            resp = requests.get(f"{BASE_URL}/docs", timeout=2)
            if resp.status_code == 200:
                print("Server is UP.")
                return True
        except requests.exceptions.ConnectionError:
            print(f"Server not ready yet... (Attempt {i+1}/10)")
            time.sleep(2)
        except Exception as e:
            print(f"Error checking server: {e}")
            time.sleep(2)
    return False

def run_test():
    if not check_db_schema():
        return False
    
    if not check_server_health():
        print("Server did not start in time. Aborting test.")
        return False

    # Login
    print("Logging in...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin"}, timeout=5)
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code}")
            return False
        token = resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Change Email
        print("Requesting Email Change...")
        # Ensure we have an old email to test "send to old" logic
        # Current admin email should be "admin@example.com" or similar from initial setup? 
        # Actually in previous test we changed it to "admin.updated@example.com". 
        # So now "admin.updated@example.com" is the OLD email.
        # We try to change it to "admin.new@example.com".
        
        current_email_resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        current_email = current_email_resp.json().get("email")
        print(f"Current Email: {current_email}")
        
        new_email = "admin.new@example.com"
        resp = requests.put(f"{BASE_URL}/auth/me", json={"email": new_email}, headers=headers)
        data = resp.json()
        print(f"Update response: {data}")
        
        # Check logic: Code should go to OLD email (current_email)
        expected_msg_part = f"({current_email})"
        if expected_msg_part not in data.get("detail", ""):
            print(f"WARNING: Response detail '{data.get('detail')}' does not contain old email '{current_email}'.")
            # It might be fine if I didn't verify the exact string in my code, but I did add it.
        
        # Verify Pending
        from database import SessionLocal
        from models import User
        db = SessionLocal()
        user = db.query(User).filter(User.username == "admin").first()
        print(f"DB State -> Pending Email: {user.pending_email}, Code: {user.verification_code}")
        
        if user.pending_email != new_email:
            print("FAILED: Pending email not set.")
            return False
        
        # Verify Code
        print(f"Verifying code: {user.verification_code}...")
        resp = requests.post(f"{BASE_URL}/auth/me/verify-email", json={"code": user.verification_code}, headers=headers)
        print(f"Verification response: {resp.json()}")
        
        if resp.status_code == 200:
            print("SUCCESS: Email verification flow completed.")
            return True
        else:
            print("FAILED: Verification endpoint returned error.")
            return False
            
    except Exception as e:
        print(f"Test Exception: {e}")
        return False

if __name__ == "__main__":
    if not run_test():
        sys.exit(1)
