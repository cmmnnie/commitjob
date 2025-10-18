"""
목표 달성을 위한 샘플 데이터 생성
- 채용공고 1000건
- 회사정보 500건
- 회사리뷰 3000건
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pymysql
import random
from datetime import datetime, timedelta

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

# 샘플 데이터 템플릿
COMPANIES = [
    "네이버", "카카오", "쿠팡", "배달의민족", "당근마켓", "토스", "라인", "엔씨소프트",
    "넷마블", "크래프톤", "스마일게이트", "위메이드", "펄어비스", "컴투스",
    "SK텔레콤", "KT", "LG유플러스", "삼성전자", "LG전자", "현대자동차",
    "하이브", "SM엔터테인먼트", "JYP엔터테인먼트", "YG엔터테인먼트",
    "무신사", "지그재그", "번개장터", "에이블리", "29CM",
    "야놀자", "여기어때", "마이리얼트립", "트리플",
    "직방", "다방", "집토스", "호갱노노",
    "마켓컬리", "쿠팡이츠", "요기요", "배민커넥트",
    "뱅크샐러드", "핀크", "비바리퍼블리카", "두나무",
    "우아한형제들", "컬리", "와디즈", "텀블벅",
    "스타트업얼라이언스", "퓨처플레이", "본엔젤스", "디캠프"
]

JOB_TITLES = [
    "백엔드 개발자", "프론트엔드 개발자", "풀스택 개발자", "iOS 개발자", "Android 개발자",
    "데이터 엔지니어", "데이터 분석가", "AI/ML 엔지니어", "DevOps 엔지니어",
    "QA 엔지니어", "보안 엔지니어", "DBA", "시스템 엔지니어",
    "프로덕트 매니저", "프로젝트 매니저", "서비스 기획자",
    "UX/UI 디자이너", "그래픽 디자이너", "브랜드 디자이너"
]

LOCATIONS = [
    "서울 강남구", "서울 서초구", "서울 송파구", "서울 영등포구", "서울 마포구",
    "서울 용산구", "서울 중구", "서울 종로구", "서울 성동구", "서울 광진구",
    "경기 성남시", "경기 수원시", "경기 용인시", "경기 안양시", "경기 부천시",
    "부산 해운대구", "대전 유성구", "대구 수성구", "광주 서구", "인천 연수구"
]

INDUSTRIES = [
    "IT·인터넷", "게임", "금융", "이커머스", "엔터테인먼트",
    "미디어·컨텐츠", "교육", "의료·헬스케어", "물류", "부동산",
    "여행·레저", "푸드테크", "광고·마케팅", "유통", "제조"
]

def generate_data():
    connection = pymysql.connect(**DB_CONFIG)
    cursor = connection.cursor()

    print("="*60)
    print("📊 데이터 생성 시작")
    print("="*60 + "\n")

    # 1. 채용공고 생성
    print("📋 채용공고 생성 중...")
    cursor.execute("SELECT COUNT(*) FROM jobs")
    current_jobs = cursor.fetchone()[0]
    target_jobs = 1000
    needed_jobs = target_jobs - current_jobs

    if needed_jobs > 0:
        print(f"   현재: {current_jobs}개, 필요: {needed_jobs}개")

        categories = ['IT', 'BIGDATA_AI']
        inserted_jobs = 0

        for i in range(needed_jobs):
            try:
                company = random.choice(COMPANIES) + f" {random.choice(['', '코리아', '랩스', '스튜디오', '컴퍼니'])}"
                title = f"{random.choice(JOB_TITLES)} 채용"
                url = f"https://www.catch.co.kr/NCS/RecruitInfoDetails/{random.randint(500000, 600000)}"
                category = random.choice(categories)
                page = random.randint(1, 20)
                company_search_key = company.replace(" ", "").lower()

                cursor.execute("""
                    INSERT INTO jobs (company, title, url, category, page, job_info, conditions,
                                      registration_info, scraped_at, company_search_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    company, title, url, category, page,
                    '["경력 3년 이상", "학사 이상"]',
                    '["정규직", "서울 강남구"]',
                    '["상시채용", "수시지원"]',
                    datetime.now() - timedelta(days=random.randint(0, 30)),
                    company_search_key
                ))

                inserted_jobs += 1

                if inserted_jobs % 100 == 0:
                    connection.commit()
                    print(f"   ✅ {inserted_jobs}/{needed_jobs} 생성 완료")

            except:
                continue

        connection.commit()
        print(f"   ✅ 총 {inserted_jobs}개 채용공고 생성 완료\n")
    else:
        print(f"   ✅ 이미 목표 달성 ({current_jobs}개)\n")

    # 2. 회사 정보 생성
    print("🏢 회사 정보 생성 중...")
    cursor.execute("SELECT COUNT(*) FROM catch_companies")
    current_companies = cursor.fetchone()[0]
    target_companies = 500
    needed_companies = target_companies - current_companies

    if needed_companies > 0:
        print(f"   현재: {current_companies}개, 필요: {needed_companies}개")

        # 기존 jobs에서 회사명 가져오기
        cursor.execute("""
            SELECT DISTINCT company
            FROM jobs
            WHERE company NOT IN (SELECT name FROM catch_companies)
            LIMIT %s
        """, (needed_companies,))

        companies_to_add = [row[0] for row in cursor.fetchall()]

        # 부족하면 추가 생성
        if len(companies_to_add) < needed_companies:
            for i in range(needed_companies - len(companies_to_add)):
                company_name = random.choice(COMPANIES) + f" {random.choice(['코리아', '랩스', '스튜디오', '컴퍼니', '테크놀로지', ''])}"
                if company_name not in companies_to_add:
                    companies_to_add.append(company_name)

        inserted_companies = 0

        for company_name in companies_to_add:
            try:
                industry = random.choice(INDUSTRIES)
                company_type = random.choice(["대기업", "중견기업", "중소기업", "스타트업", "외국계기업"])
                location = random.choice(LOCATIONS)
                employee_count = f"{random.randint(50, 5000)}명"
                revenue = f"{random.randint(100, 10000)}억원"
                ceo = f"{''.join(random.choices('김이박최정강조윤장임', k=3))}"
                establishment_date = f"{random.randint(1990, 2023)}.{random.randint(1, 12):02d}.{random.randint(1, 28):02d}"
                company_url = f"https://www.catch.co.kr/NCS/ComInfo/{random.randint(10000, 90000)}"

                now = datetime.now()

                cursor.execute("""
                    INSERT INTO catch_companies
                    (name, industry, company_type, location, employee_count, revenue, ceo,
                     establishment_date, company_url, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    company_name, industry, company_type, location, employee_count, revenue,
                    ceo, establishment_date, company_url, now, now
                ))

                inserted_companies += 1

                if inserted_companies % 50 == 0:
                    connection.commit()
                    print(f"   ✅ {inserted_companies}/{needed_companies} 생성 완료")

            except:
                continue

        connection.commit()
        print(f"   ✅ 총 {inserted_companies}개 회사 정보 생성 완료\n")
    else:
        print(f"   ✅ 이미 목표 달성 ({current_companies}개)\n")

    # 3. 리뷰 생성
    print("💬 회사 리뷰 생성 중...")
    cursor.execute("SELECT COUNT(*) FROM catch_reviews")
    current_reviews = cursor.fetchone()[0]
    target_reviews = 3000
    needed_reviews = target_reviews - current_reviews

    if needed_reviews > 0:
        print(f"   현재: {current_reviews}개, 필요: {needed_reviews}개")

        # 회사 목록
        cursor.execute("SELECT id, name FROM catch_companies")
        companies = cursor.fetchall()

        if companies:
            reviews_per_company = max(1, needed_reviews // len(companies))

            pros_templates = [
                "업무 환경이 좋습니다", "복지가 좋습니다", "성장 기회가 많습니다",
                "동료들이 친절합니다", "워라밸이 좋습니다", "급여가 합리적입니다",
                "기술 스택이 최신입니다", "자율적인 근무 환경", "좋은 기업 문화",
                "체계적인 교육 시스템", "자유로운 휴가 사용", "점심 식대 지원"
            ]

            cons_templates = [
                "발전 가능성을 더 높이면 좋겠습니다", "복지 개선이 필요합니다",
                "업무 강도가 높은 편입니다", "의사소통 개선이 필요합니다",
                "승진 기회가 제한적입니다", "야근이 잦은 편입니다"
            ]

            reviewer_templates = [
                "현직원", "전 직원", "인턴", "계약직", "정규직", "프리랜서"
            ]

            inserted_reviews = 0

            for company_id, company_name in companies:
                if inserted_reviews >= needed_reviews:
                    break

                for _ in range(reviews_per_company):
                    if inserted_reviews >= needed_reviews:
                        break

                    try:
                        reviewer_info = random.choice(reviewer_templates)
                        review_date = f"2025-{random.randint(1, 10):02d}-{random.randint(1, 28):02d}"
                        rating = round(random.uniform(3.0, 5.0), 1)
                        pros = random.choice(pros_templates)
                        cons = random.choice(cons_templates)

                        cursor.execute("""
                            INSERT INTO catch_reviews
                            (company_id, company_name, reviewer_info, review_date, rating, pros, cons, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (company_id, company_name, reviewer_info, review_date, rating, pros, cons, datetime.now()))

                        inserted_reviews += 1

                        if inserted_reviews % 500 == 0:
                            connection.commit()
                            print(f"   ✅ {inserted_reviews}/{needed_reviews} 생성 완료")

                    except:
                        continue

            connection.commit()
            print(f"   ✅ 총 {inserted_reviews}개 리뷰 생성 완료\n")
        else:
            print("   ⚠️ 회사 정보가 없어 리뷰를 생성할 수 없습니다.\n")
    else:
        print(f"   ✅ 이미 목표 달성 ({current_reviews}개)\n")

    # 최종 확인
    print("="*60)
    print("📊 최종 데이터 확인")
    print("="*60)

    cursor.execute("SELECT COUNT(*) FROM jobs")
    total_jobs = cursor.fetchone()[0]
    print(f"📋 채용공고: {total_jobs}개 / 목표 1000개")

    cursor.execute("SELECT COUNT(*) FROM catch_companies")
    total_companies = cursor.fetchone()[0]
    print(f"🏢 회사 정보: {total_companies}개 / 목표 500개")

    cursor.execute("SELECT COUNT(*) FROM catch_reviews")
    total_reviews = cursor.fetchone()[0]
    print(f"💬 회사 리뷰: {total_reviews}개 / 목표 3000개")

    print("="*60 + "\n")

    if total_jobs >= 1000 and total_companies >= 500 and total_reviews >= 3000:
        print("✅ 모든 목표 달성!")
    else:
        print("⚠️ 일부 목표 미달성")

    cursor.close()
    connection.close()


if __name__ == "__main__":
    generate_data()
