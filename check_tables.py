import mysql.connector
import sys
import io

# UTF-8 출력 설정
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

MYSQL_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb'
}

conn = mysql.connector.connect(**MYSQL_CONFIG)
cursor = conn.cursor()

# 테이블 목록 조회
cursor.execute("SHOW TABLES")
tables = cursor.fetchall()
print("현재 테이블 목록:")
for table in tables:
    print(f"  - {table[0]}")

# companies 테이블 구조 조회
if ('companies',) in tables:
    print("\ncompanies 테이블 구조:")
    cursor.execute("DESCRIBE companies")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[0]}: {col[1]}")
else:
    print("\ncompanies 테이블이 존재하지 않습니다.")

cursor.close()
conn.close()
