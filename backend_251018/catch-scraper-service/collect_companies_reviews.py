"""
캐치 사이트에서 회사 정보 100개와 각 회사의 리뷰 10건을 수집하여 MySQL DB에 저장하는 스크립트
"""

import requests
import time
import mysql.connector
from datetime import datetime
import json
import sys

# UTF-8 출력 설정
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# MySQL 연결 정보
MYSQL_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb'
}

# Catch Scraper API 주소
SCRAPER_API_BASE = "http://localhost:3000"

def create_tables():
    """MySQL에 companies와 company_reviews 테이블 생성"""
    conn = mysql.connector.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()

    # companies 테이블 생성
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            industry VARCHAR(255),
            company_type VARCHAR(100),
            location TEXT,
            employee_count VARCHAR(100),
            revenue VARCHAR(100),
            ceo VARCHAR(255),
            establishment_date VARCHAR(100),
            company_form VARCHAR(100),
            credit_rating VARCHAR(50),
            tags TEXT,
            recommendation_keywords TEXT,
            starting_salary VARCHAR(100),
            average_salary VARCHAR(100),
            industry_average_salary VARCHAR(100),
            company_url VARCHAR(1024),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_company_name (company_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # company_reviews 테이블 생성
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            reviewer_info VARCHAR(255),
            review_date VARCHAR(100),
            rating VARCHAR(50),
            pros TEXT,
            cons TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
            INDEX idx_company_id (company_id),
            INDEX idx_company_name (company_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    conn.commit()
    cursor.close()
    conn.close()
    print("✅ 테이블 생성 완료")

def get_company_list():
    """catch.db에서 회사 목록 추출 (jobs 테이블에서 중복 제거)"""
    import sqlite3
    db = sqlite3.connect('catch.db')
    cursor = db.cursor()

    # 회사명 중복 제거하여 최대 100개 추출
    cursor.execute("""
        SELECT DISTINCT company
        FROM jobs
        WHERE company IS NOT NULL AND company != ''
        ORDER BY id
        LIMIT 100
    """)

    companies = [row[0] for row in cursor.fetchall()]
    db.close()

    print(f"✅ catch.db에서 {len(companies)}개 회사 추출")
    return companies

def search_company_info(company_name):
    """캐치 스크래퍼 API를 통해 회사 상세 정보 조회"""
    try:
        response = requests.post(
            f"{SCRAPER_API_BASE}/api/search-company-info",
            json={"company_name": company_name},
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('company_detail')
            else:
                print(f"  ⚠️  API 응답: {data.get('message', '알 수 없는 오류')}")
        return None
    except Exception as e:
        print(f"  ❌ API 요청 실패: {e}")
        return None

def insert_company(conn, company_detail, company_url=""):
    """회사 정보를 MySQL에 저장"""
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO companies (
                company_name, industry, company_type, location, employee_count,
                revenue, ceo, establishment_date, company_form, credit_rating,
                tags, recommendation_keywords, starting_salary, average_salary,
                industry_average_salary, company_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                industry = VALUES(industry),
                company_type = VALUES(company_type),
                location = VALUES(location),
                employee_count = VALUES(employee_count),
                revenue = VALUES(revenue),
                ceo = VALUES(ceo),
                establishment_date = VALUES(establishment_date),
                company_form = VALUES(company_form),
                credit_rating = VALUES(credit_rating),
                tags = VALUES(tags),
                recommendation_keywords = VALUES(recommendation_keywords),
                starting_salary = VALUES(starting_salary),
                average_salary = VALUES(average_salary),
                industry_average_salary = VALUES(industry_average_salary),
                company_url = VALUES(company_url),
                updated_at = CURRENT_TIMESTAMP
        """, (
            company_detail.get('company_name', ''),
            company_detail.get('industry', ''),
            company_detail.get('company_type', ''),
            company_detail.get('location', ''),
            company_detail.get('employee_count', ''),
            company_detail.get('revenue', ''),
            company_detail.get('ceo', ''),
            company_detail.get('establishment_date', ''),
            company_detail.get('company_form', ''),
            company_detail.get('credit_rating', ''),
            json.dumps(company_detail.get('tags', []), ensure_ascii=False),
            json.dumps(company_detail.get('recommendation_keywords', []), ensure_ascii=False),
            company_detail.get('starting_salary', ''),
            company_detail.get('average_salary', ''),
            company_detail.get('industry_average_salary', ''),
            company_url
        ))

        conn.commit()

        # 삽입된 company_id 가져오기
        cursor.execute("SELECT id FROM companies WHERE company_name = %s",
                      (company_detail.get('company_name', ''),))
        result = cursor.fetchone()
        company_id = result[0] if result else None

        return company_id

    except Exception as e:
        print(f"❌ 회사 정보 저장 실패: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()

def insert_reviews(conn, company_id, company_name, reviews):
    """회사 리뷰를 MySQL에 저장 (최대 10건)"""
    if not reviews or company_id is None:
        return 0

    cursor = conn.cursor()
    inserted = 0

    try:
        for review in reviews[:10]:  # 최대 10건만
            cursor.execute("""
                INSERT INTO company_reviews (
                    company_id, company_name, reviewer_info, review_date,
                    rating, pros, cons
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                company_id,
                company_name,
                review.get('reviewer_info', ''),
                review.get('review_date', ''),
                review.get('rating', ''),
                review.get('pros', ''),
                review.get('cons', '')
            ))
            inserted += 1

        conn.commit()
        return inserted

    except Exception as e:
        print(f"❌ 리뷰 저장 실패: {e}")
        conn.rollback()
        return inserted
    finally:
        cursor.close()

def main():
    print("=" * 60)
    print("회사 정보 및 리뷰 수집 시작")
    print("=" * 60)

    # 1. 테이블 생성
    create_tables()

    # 2. 회사 목록 가져오기
    companies = get_company_list()

    if not companies:
        print("❌ 수집할 회사가 없습니다.")
        return

    # 3. MySQL 연결
    conn = mysql.connector.connect(**MYSQL_CONFIG)

    total_companies = 0
    total_reviews = 0

    # 4. 각 회사 정보 수집 및 저장
    for idx, company_name in enumerate(companies, 1):
        print(f"\n[{idx}/{len(companies)}] {company_name} 정보 수집 중...")

        # API를 통해 회사 정보 조회
        company_detail = search_company_info(company_name)

        if company_detail:
            # 회사 정보 저장
            company_id = insert_company(conn, company_detail)

            if company_id:
                total_companies += 1
                print(f"  ✅ 회사 정보 저장 완료 (ID: {company_id})")

                # 리뷰 저장
                reviews = company_detail.get('reviews', [])
                if reviews:
                    inserted_reviews = insert_reviews(conn, company_id, company_name, reviews)
                    total_reviews += inserted_reviews
                    print(f"  ✅ 리뷰 {inserted_reviews}건 저장 완료")
                else:
                    print(f"  ⚠️  리뷰 없음")
        else:
            print(f"  ❌ 회사 정보 조회 실패")

        # API 과부하 방지를 위한 딜레이
        time.sleep(2)

    conn.close()

    # 5. 최종 결과 출력
    print("\n" + "=" * 60)
    print("수집 완료!")
    print(f"✅ 총 {total_companies}개 회사 정보 저장")
    print(f"✅ 총 {total_reviews}개 리뷰 저장")
    print("=" * 60)

if __name__ == "__main__":
    main()
