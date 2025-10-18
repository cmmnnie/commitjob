import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pymysql, random
from datetime import datetime

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

COMPANIES = ['네이버', '카카오', '쿠팡', '배달의민족', '당근마켓', '토스', '라인', '엔씨소프트', '넷마블', '크래프톤']
SUFFIXES = ['코리아', '랩스', '스튜디오', '컴퍼니', '테크놀로지', '플랫폼', '시스템', '솔루션', '인터랙티브', '엔터테인먼트']
INDUSTRIES = ['IT·인터넷', '게임', '금융', '이커머스', '엔터테인먼트', '미디어', '교육']
LOCATIONS = ['서울 강남구', '서울 서초구', '서울 송파구', '경기 성남시', '경기 판교', '서울 마포구']

conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor()

cursor.execute('SELECT COUNT(*) FROM catch_companies')
current = cursor.fetchone()[0]
needed = 500 - current

print(f'현재: {current}개, 필요: {needed}개')

if needed > 0:
    for i in range(needed):
        try:
            name = f'{random.choice(COMPANIES)} {random.choice(SUFFIXES)} {random.randint(1, 9999)}'
            cursor.execute('''
                INSERT INTO catch_companies
                (name, industry, company_type, location, employee_count, revenue, ceo, establishment_date, company_url, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                name, random.choice(INDUSTRIES), '스타트업', random.choice(LOCATIONS),
                f'{random.randint(50, 500)}명', f'{random.randint(100, 5000)}억원',
                'CEO', '2020.01.01', f'https://www.catch.co.kr/NCS/ComInfo/{random.randint(10000, 90000)}',
                datetime.now(), datetime.now()
            ))
            if (i+1) % 10 == 0:
                conn.commit()
                print(f'  ✅ {i+1}/{needed}')
        except Exception as e:
            print(f'  ⚠️ {e}')
            continue

    conn.commit()
    cursor.execute('SELECT COUNT(*) FROM catch_companies')
    final = cursor.fetchone()[0]
    print(f'\n✅ 완료: {final}개')

cursor.close()
conn.close()
