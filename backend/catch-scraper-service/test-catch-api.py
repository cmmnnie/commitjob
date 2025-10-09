import requests
import json

# 회사 검색 테스트
url = 'http://localhost:3000/api/search-company-info'
data = {'company_name': '카카오'}

print(f"Testing: {url}")
print(f"Payload: {json.dumps(data, ensure_ascii=False)}")

try:
    response = requests.post(url, json=data, timeout=60)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
except Exception as e:
    print(f"Error: {e}")
