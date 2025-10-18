"""
Requests 라이브러리를 사용한 간단한 스크래핑
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
from bs4 import BeautifulSoup
import pymysql
import json
from datetime import datetime
import time

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

def test_catch_api():
    """Catch.co.kr API 테스트"""
    print("="*60)
    print("🔍 Catch.co.kr API 테스트")
    print("="*60 + "\n")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    # 채용 검색 페이지 접근 시도
    urls_to_try = [
        'https://www.catch.co.kr/NCS/RecruitSearch',
        'https://www.catch.co.kr/api/recruitment',
        'https://www.catch.co.kr/NCS/API/GetRecruitList'
    ]

    for url in urls_to_try:
        try:
            print(f"📡 {url} 테스트 중...")
            response = requests.get(url, headers=headers, timeout=10)
            print(f"  - 상태 코드: {response.status_code}")
            print(f"  - Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
            print(f"  - 응답 크기: {len(response.content)} bytes\n")

            if response.status_code == 200:
                # HTML 파싱 시도
                soup = BeautifulSoup(response.text, 'html.parser')
                job_rows = soup.find_all('tr')
                print(f"  - 발견된 <tr> 태그: {len(job_rows)}개\n")

        except Exception as e:
            print(f"  ❌ 오류: {e}\n")

    print("\n⚠️ Catch.co.kr는 JavaScript 기반 SPA로 Selenium 필요")
    print("   Requests만으로는 데이터 수집 불가능\n")

if __name__ == "__main__":
    test_catch_api()
