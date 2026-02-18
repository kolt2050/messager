import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_self_demotion():
    print("Testing Admin Self-Demotion Prevention...")
    
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
    print(f"Admin ID: {user_id}")

    # 3. Try to demote self
    print("Attempting to remove admin rights from self...")
    resp = requests.patch(f"{BASE_URL}/admin/users/{user_id}", json={"is_admin": False}, headers=headers)
    
    if resp.status_code == 400:
        print(f"SUCCESS: Server rejected request with 400. Detail: {resp.json().get('detail')}")
        return True
    elif resp.status_code == 200:
        print("FAILED: Server allowed self-demotion!")
        return False
    else:
        print(f"FAILED: Unexpected status code {resp.status_code}. Body: {resp.text}")
        return False

if __name__ == "__main__":
    if not test_self_demotion():
        sys.exit(1)
