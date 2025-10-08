"""
catch.db의 회사 정보를 기반으로 MySQL에 샘플 회사 정보와 리뷰 데이터 생성
"""

import mysql.connector
from datetime import datetime
import json
import random
import sqlite3
import sys
import io

# UTF-8 출력 설정
if sys.stdout.encoding != 'utf-8':
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

# 샘플 데이터
INDUSTRIES = ['IT·인터넷', '금융·보험', '제조·화학', '게임', '유통·무역', '전기·전자', '건설·건축', '의료·제약']
COMPANY_TYPES = ['대기업', '중견기업', '중소기업', '스타트업']
LOCATIONS = ['서울 강남구', '서울 서초구', '서울 송파구', '경기 성남시', '경기 수원시', '부산 해운대구', '대전 유성구']
EMPLOYEE_COUNTS = ['100명~500명', '500명~1000명', '1000명~5000명', '5000명 이상']
REVENUES = ['100억~500억', '500억~1000억', '1000억~5000억', '1조 이상']
COMPANY_FORMS = ['주식회사', '유한회사', '주식회사(코스닥 상장)', '주식회사(코스피 상장)']
CREDIT_RATINGS = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A']
SALARIES = ['3000만원~4000만원', '4000만원~5000만원', '5000만원~6000만원', '6000만원 이상']

# 리뷰 샘플 데이터
REVIEWER_INFOS = [
    '현직원·3년차', '현직원·5년차', '전직원·2년 근무', '전직원·4년 근무',
    '현직원·1년차', '현직원·7년차', '전직원·1년 근무', '현직원·10년 이상'
]

PROS_SAMPLES = [
    '복지가 좋고 워라밸이 보장됩니다',
    '자유로운 분위기에서 일할 수 있어요',
    '최신 기술 스택을 사용하며 성장할 수 있습니다',
    '동료들이 친절하고 협업 문화가 좋습니다',
    '연봉이 업계 평균 이상이고 복지가 우수합니다',
    '리모트 근무가 가능하고 유연근무제를 운영합니다',
    '교육 지원이 잘 되어 있고 자기계발 기회가 많습니다',
    '안정적인 대기업이라 장기근무하기 좋습니다',
    '야근이 거의 없고 칼퇴 문화가 자리잡혀 있습니다',
    '프로젝트가 다양하고 흥미로운 업무를 할 수 있습니다'
]

CONS_SAMPLES = [
    '승진 기회가 제한적이고 연차가 중요합니다',
    '의사결정이 느리고 보수적인 편입니다',
    '야근이 잦고 워라밸이 좋지 않습니다',
    '연봉 인상폭이 크지 않습니다',
    '복지가 부족하고 개선이 필요합니다',
    '팀에 따라 분위기 차이가 큽니다',
    '레거시 시스템이 많아 기술 발전이 더딥니다',
    '수평적 문화를 지향하지만 실제로는 상명하복식입니다',
    '프로젝트 일정이 타이트하고 업무 강도가 높습니다',
    '복지 시설이나 사내 환경 개선이 필요합니다'
]

RATINGS = ['4.5점', '4.0점', '3.5점', '5.0점', '4.2점', '3.8점', '4.7점']

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

def get_company_list(limit=100):
    """catch.db에서 회사 목록 추출"""
    db = sqlite3.connect('catch.db')
    cursor = db.cursor()

    cursor.execute(f"""
        SELECT DISTINCT company
        FROM jobs
        WHERE company IS NOT NULL AND company != ''
        ORDER BY id
        LIMIT {limit}
    """)

    companies = [row[0] for row in cursor.fetchall()]
    db.close()

    print(f"✅ catch.db에서 {len(companies)}개 회사 추출")
    return companies

def generate_company_data(company_name):
    """회사 정보 생성"""
    tags = random.sample(['워라밸', '복지좋음', '급여높음', '성장가능', '자유로운문화', '교육지원', '리모트가능'], k=random.randint(3, 5))
    keywords = random.sample(['최신기술', '협업문화', '유연근무', '성과중심', '수평적', '글로벌', '안정성'], k=random.randint(2, 4))

    return {
        'company_name': company_name,
        'industry': random.choice(INDUSTRIES),
        'company_type': random.choice(COMPANY_TYPES),
        'location': random.choice(LOCATIONS),
        'employee_count': random.choice(EMPLOYEE_COUNTS),
        'revenue': random.choice(REVENUES),
        'ceo': f'{company_name} 대표',
        'establishment_date': f'{random.randint(1990, 2020)}.{random.randint(1, 12):02d}.{random.randint(1, 28):02d}',
        'company_form': random.choice(COMPANY_FORMS),
        'credit_rating': random.choice(CREDIT_RATINGS),
        'tags': json.dumps(tags, ensure_ascii=False),
        'recommendation_keywords': json.dumps(keywords, ensure_ascii=False),
        'starting_salary': random.choice(SALARIES),
        'average_salary': random.choice(SALARIES),
        'industry_average_salary': random.choice(SALARIES),
        'company_url': f'https://www.catch.co.kr/Company/{random.randint(10000, 99999)}'
    }

def insert_company(conn, company_data):
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
                company_url = VALUES(company_url)
        """, tuple(company_data.values()))

        conn.commit()

        cursor.execute("SELECT id FROM companies WHERE company_name = %s",
                      (company_data['company_name'],))
        result = cursor.fetchone()
        return result[0] if result else None

    except Exception as e:
        print(f"❌ 회사 정보 저장 실패: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()

def generate_reviews(num_reviews=10):
    """리뷰 생성"""
    reviews = []
    for _ in range(num_reviews):
        reviews.append({
            'reviewer_info': random.choice(REVIEWER_INFOS),
            'review_date': f'2024.{random.randint(1, 12):02d}.{random.randint(1, 28):02d}',
            'rating': random.choice(RATINGS),
            'pros': random.choice(PROS_SAMPLES),
            'cons': random.choice(CONS_SAMPLES)
        })
    return reviews

def insert_reviews(conn, company_id, company_name, reviews):
    """리뷰를 MySQL에 저장"""
    if not reviews or company_id is None:
        return 0

    cursor = conn.cursor()
    inserted = 0

    try:
        for review in reviews:
            cursor.execute("""
                INSERT INTO company_reviews (
                    company_id, company_name, reviewer_info, review_date,
                    rating, pros, cons
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                company_id,
                company_name,
                review['reviewer_info'],
                review['review_date'],
                review['rating'],
                review['pros'],
                review['cons']
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
    print("회사 정보 및 리뷰 샘플 데이터 생성")
    print("=" * 60)

    # 1. 테이블 생성
    create_tables()

    # 2. 회사 목록 가져오기 (100개)
    companies = get_company_list(100)

    if not companies:
        print("❌ 수집할 회사가 없습니다.")
        return

    # 3. MySQL 연결
    conn = mysql.connector.connect(**MYSQL_CONFIG)

    total_companies = 0
    total_reviews = 0

    # 4. 각 회사 정보 생성 및 저장
    for idx, company_name in enumerate(companies, 1):
        print(f"\n[{idx}/{len(companies)}] {company_name} 정보 생성 중...")

        # 회사 정보 생성
        company_data = generate_company_data(company_name)

        # 회사 정보 저장
        company_id = insert_company(conn, company_data)

        if company_id:
            total_companies += 1
            print(f"  ✅ 회사 정보 저장 완료 (ID: {company_id})")

            # 리뷰 생성 (10건)
            reviews = generate_reviews(10)
            inserted_reviews = insert_reviews(conn, company_id, company_name, reviews)
            total_reviews += inserted_reviews
            print(f"  ✅ 리뷰 {inserted_reviews}건 저장 완료")

    conn.close()

    # 5. 최종 결과 출력
    print("\n" + "=" * 60)
    print("데이터 생성 완료!")
    print(f"✅ 총 {total_companies}개 회사 정보 저장")
    print(f"✅ 총 {total_reviews}개 리뷰 저장")
    print("=" * 60)

if __name__ == "__main__":
    main()
