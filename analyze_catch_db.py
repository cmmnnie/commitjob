import sqlite3
import json
import sys

# UTF-8 인코딩 설정
sys.stdout.reconfigure(encoding='utf-8')

db = sqlite3.connect('catch.db')
cursor = db.cursor()

# 테이블 목록 가져오기
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]

for table in tables:
    print('\n' + '='*60)
    print(f'테이블: {table}')
    print('='*60)

    # 데이터 건수
    cursor.execute(f'SELECT COUNT(*) FROM {table}')
    count = cursor.fetchone()[0]
    print(f'데이터 건수: {count}')

    # 컬럼 정보
    cursor.execute(f'PRAGMA table_info({table})')
    columns = cursor.fetchall()
    print('\n컬럼 정보:')
    for col in columns:
        print(f'  - {col[1]} ({col[2]})')

    # 샘플 데이터
    cursor.execute(f'SELECT * FROM {table} LIMIT 3')
    rows = cursor.fetchall()
    col_names = [desc[1] for desc in columns]

    print('\n샘플 데이터 (최대 3건):')
    if rows:
        for row in rows:
            data = dict(zip(col_names, row))
            print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print('  (데이터 없음)')

db.close()
