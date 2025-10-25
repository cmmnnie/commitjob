"""
SQLite catch.db 데이터를 MySQL appdb로 마이그레이션하는 스크립트
"""
import sqlite3
import pymysql
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv('../.env')

# MySQL 연결 정보
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASS'),
    'database': os.getenv('DB_NAME'),
    'charset': 'utf8mb4'
}

print("=" * 80)
print("SQLite to MySQL Migration Script")
print("=" * 80)
print(f"\nMySQL Connection Info:")
print(f"  Host: {MYSQL_CONFIG['host']}")
print(f"  Port: {MYSQL_CONFIG['port']}")
print(f"  Database: {MYSQL_CONFIG['database']}")
print(f"  User: {MYSQL_CONFIG['user']}")

# SQLite 연결
sqlite_conn = sqlite3.connect('catch.db')
sqlite_cursor = sqlite_conn.cursor()

# SQLite 데이터 확인
sqlite_cursor.execute("SELECT COUNT(*) FROM jobs")
total_records = sqlite_cursor.fetchone()[0]
print(f"\n[SQLite] Total records in jobs table: {total_records}")

# MySQL 연결
try:
    mysql_conn = pymysql.connect(**MYSQL_CONFIG)
    mysql_cursor = mysql_conn.cursor()
    print(f"\n[MySQL] Connected successfully!")
except Exception as e:
    print(f"\n[ERROR] Failed to connect to MySQL: {e}")
    sqlite_conn.close()
    exit(1)

# 1. jobs 테이블 생성
print("\n[Step 1] Creating jobs table in MySQL...")
create_table_sql = """
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(512) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    category VARCHAR(50) NOT NULL,
    page INT DEFAULT 1,
    job_info TEXT,
    conditions TEXT,
    registration_info TEXT,
    scraped_at DATETIME NOT NULL,
    company_search_key VARCHAR(255),
    INDEX idx_company (company),
    INDEX idx_url (url(255)),
    INDEX idx_category (category),
    INDEX idx_scraped_at (scraped_at),
    INDEX idx_company_search_key (company_search_key),
    UNIQUE KEY uq_jobs_url_category (url(255), category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
"""

try:
    mysql_cursor.execute(create_table_sql)
    mysql_conn.commit()
    print("[SUCCESS] jobs table created or already exists")
except Exception as e:
    print(f"[ERROR] Failed to create table: {e}")
    mysql_conn.close()
    sqlite_conn.close()
    exit(1)

# 2. 기존 데이터 확인
mysql_cursor.execute("SELECT COUNT(*) FROM jobs")
existing_count = mysql_cursor.fetchone()[0]
print(f"\n[Step 2] Existing records in MySQL jobs table: {existing_count}")

if existing_count > 0:
    response = input("MySQL jobs table already has data. Clear it? (yes/no): ")
    if response.lower() == 'yes':
        mysql_cursor.execute("TRUNCATE TABLE jobs")
        mysql_conn.commit()
        print("[INFO] Table cleared")
    else:
        print("[INFO] Skipping truncate, will attempt to insert (duplicates will be ignored)")

# 3. 데이터 마이그레이션
print(f"\n[Step 3] Migrating {total_records} records from SQLite to MySQL...")

sqlite_cursor.execute("""
    SELECT company, title, url, category, page,
           job_info, conditions, registration_info, scraped_at, company_search_key
    FROM jobs
""")

insert_sql = """
    INSERT INTO jobs (company, title, url, category, page,
                     job_info, conditions, registration_info, scraped_at, company_search_key)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        company = VALUES(company),
        title = VALUES(title),
        page = VALUES(page),
        job_info = VALUES(job_info),
        conditions = VALUES(conditions),
        registration_info = VALUES(registration_info),
        scraped_at = VALUES(scraped_at),
        company_search_key = VALUES(company_search_key)
"""

success_count = 0
error_count = 0

for row in sqlite_cursor.fetchall():
    try:
        mysql_cursor.execute(insert_sql, row)
        success_count += 1
        if success_count % 20 == 0:
            print(f"  Migrated {success_count}/{total_records} records...")
    except Exception as e:
        error_count += 1
        print(f"  [ERROR] Failed to insert record: {e}")
        print(f"    Data: {row[0:3]}")  # company, title, url

mysql_conn.commit()

print(f"\n[Step 4] Migration completed!")
print(f"  Success: {success_count} records")
print(f"  Errors: {error_count} records")

# 4. 검증
mysql_cursor.execute("SELECT COUNT(*) FROM jobs")
final_count = mysql_cursor.fetchone()[0]
print(f"\n[Step 5] Verification:")
print(f"  Total records in MySQL: {final_count}")

mysql_cursor.execute("SELECT category, COUNT(*) FROM jobs GROUP BY category")
categories = mysql_cursor.fetchall()
print(f"  Category distribution:")
for cat, count in categories:
    print(f"    {cat}: {count} records")

# 샘플 데이터 확인
print(f"\n[Step 6] Sample data (first 3 records):")
mysql_cursor.execute("SELECT id, company, title, category FROM jobs LIMIT 3")
for row in mysql_cursor.fetchall():
    print(f"  ID {row[0]}: {row[1]} - {row[2]} ({row[3]})")

# 연결 종료
mysql_conn.close()
sqlite_conn.close()

print("\n" + "=" * 80)
print("Migration completed successfully!")
print("=" * 80)
