import sqlite3
import json

conn = sqlite3.connect('catch.db')
cursor = conn.cursor()

# 첫 번째 레코드를 가져옴
cursor.execute('SELECT * FROM jobs LIMIT 1')
row = cursor.fetchone()

# 컬럼명 가져오기
cursor.execute('PRAGMA table_info(jobs)')
columns = [col[1] for col in cursor.fetchall()]

print('=== jobs 테이블 샘플 데이터 (1건) ===\n')
for i, col_name in enumerate(columns):
    value = row[i]
    print(f'{col_name}:')
    if col_name in ['job_info', 'conditions', 'registration_info']:
        try:
            parsed = json.loads(value) if value else []
            print(f'  {parsed}')
        except:
            print(f'  {value}')
    else:
        print(f'  {value}')
    print()

conn.close()
