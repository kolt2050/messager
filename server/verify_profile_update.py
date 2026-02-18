import requests
import sys

BASE_URL = "http://localhost:8000"

def test_profile_update():
    print(f"Testing profile update against {BASE_URL}...")
    
    # 1. Login
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "admin"}, timeout=5)
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server.")
        return False

    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return False
    
    token = resp.json().get("access_token")
    if not token:
        print("Login failed: No token returned")
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully.")

    # 2. Get current profile
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if resp.status_code != 200:
        print(f"Get profile failed: {resp.status_code} {resp.text}")
        return False
        
    current_data = resp.json()
    print(f"Current profile: {current_data}")
    
    # 3. Update email
    new_email = "admin.updated@example.com"
    print(f"Attempting to update email to: {new_email}")
    
    resp = requests.put(f"{BASE_URL}/auth/me", json={"email": new_email}, headers=headers)
    if resp.status_code != 200:
        print(f"Update failed: {resp.status_code} {resp.text}")
        return False
    
    updated_data = resp.json()
    print(f"Update response: {updated_data}")

    # 4. Verify email persistence
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    final_data = resp.json()
    
    if final_data.get("email") == new_email:
        print("SUCCESS: Email updated and verified.")
        return True
    else:
        print(f"FAILED: Email mismatch. Expected {new_email}, got {final_data.get('email')}")
        return False

if __name__ == "__main__":
    success = test_profile_update()
    if not success:
        sys.exit(1)
