"""
최신 채용공고 1000건 생성 (jobs 테이블 기반)
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pymysql
import random
import json
from datetime import datetime, timedelta

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

# 실제 회사명 목록 (jobs 테이블에서 추출한 데이터 기반)
COMPANIES = [
    '네이버', '카카오', '라인', '쿠팡', '배달의민족', '당근마켓', '토스',
    '네이버클라우드', '카카오뱅크', '카카오페이', '라인플러스', '컬리',
    '무신사', '야놀자', '여기어때', '직방', '다방', '집토스', '11번가',
    '인터파크', '위메프', 'SK텔레콤', 'KT', 'LG유플러스', '삼성전자',
    'LG전자', '현대자동차', '기아', 'SK하이닉스', '엔씨소프트', '넷마블',
    '크래프톤', '펄어비스', '스마일게이트', '카카오게임즈', '넥슨',
    'SK', 'LG', '롯데', 'GS', '한화', '두산', '현대중공업',
    'NHN', '카카오엔터프라이즈', '우아한형제들', '비바리퍼블리카',
    '쏘카', '마켓컬리', '코멘토', '원티드', '리멤버', '잡코리아'
]

# 직무 카테고리별 포지션
IT_POSITIONS = [
    '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자',
    'iOS 개발자', 'Android 개발자', '웹 개발자',
    'DevOps 엔지니어', '시스템 엔지니어', '네트워크 엔지니어',
    'QA 엔지니어', '테스트 엔지니어', 'SRE 엔지니어',
    '보안 엔지니어', '클라우드 엔지니어', '데이터베이스 관리자'
]

BIGDATA_POSITIONS = [
    '데이터 사이언티스트', '데이터 분석가', '데이터 엔지니어',
    'ML 엔지니어', 'AI 연구원', 'AI 엔지니어',
    '머신러닝 엔지니어', 'NLP 엔지니어', 'Computer Vision 엔지니어',
    '데이터 아키텍트', '빅데이터 엔지니어', 'BI 개발자'
]

# 기술 스택
TECH_STACKS = {
    'backend': ['Java', 'Spring Boot', 'Node.js', 'Python', 'Django', 'Flask', 'Go', 'Kotlin'],
    'frontend': ['React', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'Next.js', 'Nuxt.js'],
    'mobile': ['Swift', 'Kotlin', 'React Native', 'Flutter'],
    'data': ['Python', 'SQL', 'Spark', 'Hadoop', 'Kafka', 'Airflow', 'TensorFlow', 'PyTorch'],
    'devops': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Jenkins', 'GitLab CI', 'Terraform'],
    'database': ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle']
}

# 경력 조건
EXPERIENCES = ['신입', '경력 1년 이상', '경력 2년 이상', '경력 3년 이상', '경력 5년 이상', '경력 무관']

# 학력 조건
EDUCATIONS = ['학력무관', '초대졸 이상', '대졸 이상', '석사 이상', '박사 이상']

# 고용 형태
EMPLOYMENT_TYPES = ['정규직', '계약직', '인턴', '프리랜서']

def generate_job_info(category):
    """직무 정보 생성"""
    if category == 'IT':
        position = random.choice(IT_POSITIONS)
        if 'Backend' in position or '백엔드' in position:
            tech = random.sample(TECH_STACKS['backend'], random.randint(2, 4))
        elif 'Frontend' in position or '프론트엔드' in position:
            tech = random.sample(TECH_STACKS['frontend'], random.randint(2, 3))
        elif 'iOS' in position or 'Android' in position or '모바일' in position:
            tech = random.sample(TECH_STACKS['mobile'], random.randint(1, 2))
        elif 'DevOps' in position or 'SRE' in position:
            tech = random.sample(TECH_STACKS['devops'], random.randint(2, 4))
        else:
            tech = random.sample(TECH_STACKS['backend'] + TECH_STACKS['frontend'], random.randint(2, 4))
    else:  # BIGDATA_AI
        position = random.choice(BIGDATA_POSITIONS)
        tech = random.sample(TECH_STACKS['data'], random.randint(3, 5))

    return tech

def generate_conditions():
    """지원 조건 생성"""
    conditions = []
    conditions.append(random.choice(EXPERIENCES))
    conditions.append(random.choice(EDUCATIONS))
    conditions.append(random.choice(EMPLOYMENT_TYPES))
    return conditions

def generate_registration_info():
    """등록 정보 생성"""
    days_ago = random.randint(0, 30)
    deadline_days = random.randint(7, 60)

    reg_date = datetime.now() - timedelta(days=days_ago)
    deadline = datetime.now() + timedelta(days=deadline_days)

    return [
        f"~{deadline.strftime('%m.%d')}({['월', '화', '수', '목', '금', '토', '일'][deadline.weekday()]})",
        f"{days_ago}일 전 등록" if days_ago > 0 else "오늘 등록"
    ]

def generate_jobs(count=1000):
    """채용공고 생성"""
    connection = pymysql.connect(**DB_CONFIG)
    cursor = connection.cursor()

    print("="*60)
    print(f"📝 채용공고 {count}건 생성 시작")
    print("="*60 + "\n")

    # 현재 데이터 확인
    cursor.execute("SELECT COUNT(*) as count FROM jobs")
    current_count = cursor.fetchone()[0]
    print(f"📊 현재 jobs 테이블: {current_count}건\n")

    generated = 0
    duplicates = 0
    errors = 0

    for i in range(count):
        try:
            company = random.choice(COMPANIES)
            category = random.choice(['IT', 'BIGDATA_AI'])

            # 직무 정보
            tech_stack = generate_job_info(category)

            if category == 'IT':
                position = random.choice(IT_POSITIONS)
            else:
                position = random.choice(BIGDATA_POSITIONS)

            # 제목 생성
            title_templates = [
                f"[{company}] {position} 채용",
                f"{position} {random.choice(['경력', '신입'])} 채용",
                f"{company} {position} 모집",
                f"[{random.choice(['경력', '신입'])}] {position} 채용",
                f"{position} ({', '.join(tech_stack[:2])}) 채용"
            ]
            title = random.choice(title_templates)

            # URL 생성 (고유값)
            job_id = 500000 + i + random.randint(1, 10000)
            url = f"https://www.catch.co.kr/NCS/RecruitInfoDetails/{job_id}"

            # 중복 체크
            cursor.execute(
                "SELECT id FROM jobs WHERE url = %s AND category = %s",
                (url, category)
            )

            if cursor.fetchone():
                duplicates += 1
                continue

            # 직무 정보, 조건, 등록 정보
            job_info = tech_stack
            conditions = generate_conditions()
            registration_info = generate_registration_info()

            # 회사명 정규화
            company_search_key = company.lower().replace(' ', '').replace('\u00A0', '')

            # INSERT
            cursor.execute("""
                INSERT INTO jobs
                (company, title, url, category, page, job_info, conditions,
                 registration_info, scraped_at, company_search_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                company,
                title,
                url,
                category,
                random.randint(1, 20),
                json.dumps(job_info, ensure_ascii=False),
                json.dumps(conditions, ensure_ascii=False),
                json.dumps(registration_info, ensure_ascii=False),
                datetime.now(),
                company_search_key
            ))

            generated += 1

            # 진행 상황 출력
            if (i + 1) % 100 == 0:
                connection.commit()
                print(f"  ✅ {i + 1}/{count} 처리 완료 (저장: {generated}건)")

        except Exception as e:
            errors += 1
            continue

    connection.commit()

    # 최종 데이터 확인
    cursor.execute("SELECT COUNT(*) as count FROM jobs")
    final_count = cursor.fetchone()[0]

    print(f"\n{'='*60}")
    print("✅ 채용공고 생성 완료")
    print(f"{'='*60}")
    print(f"  - 생성 시도: {count}건")
    print(f"  - 신규 저장: {generated}건")
    print(f"  - 중복 제외: {duplicates}건")
    print(f"  - 오류: {errors}건")
    print(f"  - 최종 총 데이터: {final_count}건")
    print(f"{'='*60}\n")

    cursor.close()
    connection.close()

if __name__ == "__main__":
    generate_jobs(1000)
