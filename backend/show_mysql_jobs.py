import pymysql
import os
from dotenv import load_dotenv
import json

# .env 파일 로드
load_dotenv()

# MySQL 연결 설정
conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASS'),
    database=os.getenv('DB_NAME'),
    charset='utf8mb4'
)

cursor = conn.cursor()

# 테이블 정보 조회
cursor.execute("DESCRIBE jobs")
columns_info = cursor.fetchall()

print("=== jobs 테이블 스키마 ===\n")
print(f"{'컬럼명':<25} {'타입':<30} {'Null':<8} {'Key':<8} {'Default':<15} {'Extra':<15}")
print("=" * 110)
for col in columns_info:
    print(f"{col[0]:<25} {col[1]:<30} {col[2]:<8} {col[3]:<8} {str(col[4]):<15} {col[5]:<15}")

# 데이터 건수 조회
cursor.execute("SELECT COUNT(*) FROM jobs")
total_count = cursor.fetchone()[0]
print(f"\n총 데이터 건수: {total_count}건\n")

# 카테고리별 건수
cursor.execute("SELECT category, COUNT(*) FROM jobs GROUP BY category")
print("=== 카테고리별 건수 ===")
for cat, count in cursor.fetchall():
    print(f"  {cat}: {count}건")

# 샘플 데이터 3건 조회
cursor.execute("SELECT * FROM jobs LIMIT 3")
rows = cursor.fetchall()

# 컬럼명 가져오기
cursor.execute("DESCRIBE jobs")
column_names = [col[0] for col in cursor.fetchall()]

print("\n" + "=" * 110)
print("=== 샘플 데이터 (3건) ===\n")

for idx, row in enumerate(rows, 1):
    print(f"--- 레코드 {idx} ---")
    for i, col_name in enumerate(column_names):
        value = row[i]
        if col_name in ['job_info', 'conditions', 'registration_info']:
            try:
                if isinstance(value, str):
                    parsed = json.loads(value)
                    print(f"  {col_name}: {parsed}")
                else:
                    print(f"  {col_name}: {value}")
            except:
                print(f"  {col_name}: {value}")
        else:
            print(f"  {col_name}: {value}")
    print()

cursor.close()
conn.close()
