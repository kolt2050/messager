import requests
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def test_smtp_settings():
    print("Testing SMTP Settings API...")
    
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
    
    # 2. Get Settings
    print("Getting current key settings...")
    resp = requests.get(f"{BASE_URL}/admin/settings/smtp", headers=headers)
    if resp.status_code != 200:
        print(f"Get failed: {resp.status_code} {resp.text}")
        return False
    
    curr = resp.json()
    print(f"Current Settings: {curr}")
    
    # 3. Update Settings
    new_settings = {
        "smtp_host": "smtp.test.com",
        "smtp_port": 2525,
        "smtp_user": "test_user",
        "smtp_pass": "test_pass"
    }
    print(f"Updating to: {new_settings}")
    resp = requests.put(f"{BASE_URL}/admin/settings/smtp", json=new_settings, headers=headers)
    if resp.status_code != 200:
        print(f"Update failed: {resp.status_code} {resp.text}")
        return False
    
    # 4. Verify Update
    print("Verifying update...")
    resp = requests.get(f"{BASE_URL}/admin/settings/smtp", headers=headers)
    updated = resp.json()
    print(f"Updated Settings: {updated}")
    
    if (updated["smtp_host"] == "smtp.test.com" and 
        updated["smtp_port"] == 2525 and
        updated["smtp_user"] == "test_user"):
        print("SUCCESS: SMTP settings updated and persisted.")
        
        # Restore (optional, keeping it clean?)
        # Let's restore to defaults if we want, or leave it. 
        # Since this is a test env, leaving it is fine or restoring from env.
        # But to be safe for other tests, let's revert to env defaults if we knew them.
        # For now, just exit success.
        return True
    else:
        print("FAILED: Settings mismatch.")
        return False

if __name__ == "__main__":
    if not test_smtp_settings():
        sys.exit(1)
