import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_admin_update():
    print("Testing Admin Update Override...")
    
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
    
    # 2. Get Admin ID
    me = requests.get(f"{BASE_URL}/auth/me", headers=headers).json()
    user_id = me["id"]
    print(f"Admin ID: {user_id}, Current Email: {me['email']}")

    # 3. Simulate a pending state (optional, but good to verify clearing)
    # Let's set a pending email first via normal flow (just initiate it)
    print("Initiating pending change (to test clearing)...")
    requests.put(f"{BASE_URL}/auth/me", json={"email": "pending.verify@example.com"}, headers=headers)
    
    # Verify pending is set
    # Access DB directly? Or use a getter? user object in response usually has it if I added it to schema?
    # I added `pending_email` to the return dict in `auth.py`. 
    # Let's check `auth.py` return.
    
    # 4. Perform Admin Update (Override)
    new_email = "admin.override@example.com"
    print(f"Admin forcing update to: {new_email}...")
    resp = requests.patch(f"{BASE_URL}/admin/users/{user_id}", json={"email": new_email}, headers=headers)
    
    if resp.status_code != 200:
        print(f"Admin update failed: {resp.status_code} {resp.text}")
        return False
    
    updated_user = resp.json()
    print(f"Admin Update Response: {updated_user}")
    
    if updated_user["email"] != new_email:
        print(f"FAILED: Email not updated. Got {updated_user['email']}")
        return False
        
    print("Email updated. Verifying pending cleared...")
    
    # Check via direct DB or auth/me
    check_resp = requests.get(f"{BASE_URL}/auth/me", headers=headers).json()
    # Note: `auth.py`'s `read_users_me` returns `UserSchema` which does NOT have pending_email by default?
    # `UserSchema` in `schemas.py` is `User`.
    # Let's check `schemas.py`. It has `id`, `username`, `email`, `is_admin`, `created_at`.
    # It does NOT have `pending_email`.
    # So I can't verify it via API unless I check DB.
    
    from database import SessionLocal
    from models import User
    db = SessionLocal()
    db_user = db.query(User).filter(User.id == user_id).first()
    
    print(f"DB State -> Email: {db_user.email}, Pending: {db_user.pending_email}, Code: {db_user.verification_code}")
    
    if db_user.pending_email is None and db_user.verification_code is None:
        print("SUCCESS: Pending fields cleared.")
        return True
    else:
        print("FAILED: Pending fields NOT cleared.")
        return False

if __name__ == "__main__":
    if not test_admin_update():
        sys.exit(1)
