import sqlite3

conn = sqlite3.connect('catch.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print(f'총 테이블 개수: {len(tables)}개\n')
print('테이블별 데이터 건수:')

for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f'  - {table_name}: {count}건')

conn.close()
