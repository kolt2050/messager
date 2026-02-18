import requests

url = "http://localhost:8000/upload"
files = {'file': open('test_image.png', 'rb')}

try:
    response = requests.post(url, files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
