"""
프로젝트 루트에서 jobs 테이블을 조회하는 스크립트
"""
import sqlite3
import json

# DB 경로
DB_PATH = 'backend/catch-scraper-service/catch.db'

def query_jobs(limit=10):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 테이블 정보
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"=== 데이터베이스 정보 ===")
    print(f"DB 위치: {DB_PATH}")
    print(f"테이블: {[t[0] for t in tables]}\n")

    # jobs 테이블 카운트
    cursor.execute("SELECT COUNT(*) FROM jobs")
    total = cursor.fetchone()[0]
    print(f"jobs 테이블 총 레코드: {total}건\n")

    # 카테고리별 분포
    cursor.execute("SELECT category, COUNT(*) FROM jobs GROUP BY category")
    categories = cursor.fetchall()
    print("=== 카테고리별 분포 ===")
    for cat, count in categories:
        print(f"  {cat}: {count}건")

    # 샘플 데이터 조회
    cursor.execute(f"""
        SELECT id, company, title, category, url,
               job_info, conditions, registration_info
        FROM jobs
        LIMIT {limit}
    """)
    rows = cursor.fetchall()

    print(f"\n=== 샘플 데이터 (최대 {limit}건) ===")
    for row in rows:
        print(f"\n[ID: {row[0]}]")
        print(f"  회사명: {row[1]}")
        print(f"  제목: {row[2]}")
        print(f"  카테고리: {row[3]}")
        print(f"  URL: {row[4]}")

        # JSON 파싱
        try:
            job_info = json.loads(row[5]) if row[5] else []
            conditions = json.loads(row[6]) if row[6] else []
            registration = json.loads(row[7]) if row[7] else []

            print(f"  직무정보: {', '.join(job_info)}")
            print(f"  조건: {', '.join(conditions)}")
            print(f"  등록정보: {', '.join(registration)}")
        except:
            pass
        print("-" * 80)

    conn.close()

if __name__ == "__main__":
    query_jobs(limit=5)
