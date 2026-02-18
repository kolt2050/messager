import requests
import sys
import time

# Inside the container, localhost should work if the app listens on 0.0.0.0 or 127.0.0.1
# But sometimes it takes a moment to start.
BASE_URL = "http://127.0.0.1:8000"

def get_verification_code(email: str):
    # We must import models/db inside the function or file to avoid import errors if env not set
    # But since we are running in the container app context, it should be fine.
    try:
        from database import SessionLocal
        from models import User
        db = SessionLocal()
        try:
            print(f"Checking DB for pending_email={email}...")
            user = db.query(User).filter(User.pending_email == email).first()
            if user:
                return user.verification_code
            print("User not found or no pending email.")
            return None
        finally:
            db.close()
    except ImportError:
        print("Could not import database models. Ensure script runs in server context.")
        return None

def test_email_change_flow():
    print(f"Testing email change flow against {BASE_URL}...")
    
    # Wait for server
    for i in range(5):
        try:
            requests.get(f"{BASE_URL}/docs", timeout=2)
            break
        except:
            print("Waiting for server...")
            time.sleep(2)
    
    # 1. Login
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin"}, timeout=5)
    except Exception as e:
        print(f"Connection failed: {e}")
        return False

    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code}")
        return False
    
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    # 2. Request Email Change
    new_email = "admin.verify@example.com"
    print(f"Requesting change to: {new_email}")
    
    resp = requests.put(f"{BASE_URL}/auth/me", json={"email": new_email}, headers=headers)
    
    if resp.status_code != 200:
        print(f"Update failed: {resp.status_code} {resp.text}")
        return False

    data = resp.json()
    if not data.get("verification_required"):
        # Maybe it's already verified or something?
        print(f"WARNING: verification_required not True. Data: {data}")
        # If it says 'Procees verified' or similar, we check DB.
        
    print("Verification required response received. Checking DB for code...")
    
    # 3. Get Code (Simulate checking email)
    code = get_verification_code(new_email)
    if not code:
        print("FAILED: No verification code found in DB.")
        return False
    
    print(f"Found code: {code}")
    
    # 4. Submit Code
    print("Submitting verification code...")
    resp = requests.post(f"{BASE_URL}/auth/me/verify-email", json={"code": code}, headers=headers)
    
    if resp.status_code != 200:
        print(f"Verification failed: {resp.status_code} {resp.text}")
        return False
    
    print(f"Verification response: {resp.json()}")
    
    # 5. Verify final state
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    final_email = resp.json().get("email")
    
    if final_email == new_email:
        print(f"SUCCESS: Email successfully changed to {final_email} via verification flow.")
        return True
    else:
        print(f"FAILED: Email mismatch. Expected {new_email}, got {final_email}")
        return False

if __name__ == "__main__":
    success = test_email_change_flow()
    if not success:
        sys.exit(1)
