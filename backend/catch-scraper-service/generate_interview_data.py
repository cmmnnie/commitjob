"""
jobs 테이블 기반 기출문제 생성
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pymysql
import random
from datetime import datetime

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

# 면접 질문 템플릿
INTERVIEW_QUESTIONS = [
    "자기소개를 해주세요",
    "지원 동기를 말씀해주세요",
    "본인의 장점과 단점은 무엇인가요?",
    "팀 프로젝트에서 갈등을 경험한 적이 있나요? 어떻게 해결하셨나요?",
    "가장 힘들었던 프로젝트와 극복 방법을 말씀해주세요",
    "5년 후 자신의 모습은 어떨 것 같나요?",
    "우리 회사에 대해 알고 있는 것을 말씀해주세요",
    "최근에 읽은 기술 관련 서적이나 아티클은 무엇인가요?",
    "실패한 경험과 그로부터 배운 점은 무엇인가요?",
    "본인만의 강점이 무엇이라고 생각하시나요?",
    "프로그래밍 언어 중 가장 자신있는 것은 무엇인가요?",
    "데이터베이스 설계 경험이 있으신가요?",
    "알고리즘 문제 풀이 경험을 말씀해주세요",
    "Git을 사용한 협업 경험이 있나요?",
    "클라우드 서비스 사용 경험이 있으신가요?",
    "REST API 설계 경험을 말씀해주세요",
    "애자일 방법론에 대해 설명해주세요",
    "코드 리뷰 경험이 있으신가요?",
    "테스트 코드 작성 경험을 말씀해주세요",
    "성능 최적화를 해본 경험이 있나요?",
    "마이크로서비스 아키텍처에 대해 아시나요?",
    "Docker를 사용해보신 적이 있나요?",
    "CI/CD 파이프라인 구축 경험이 있으신가요?",
    "보안에 대해 어떻게 생각하시나요?",
    "새로운 기술을 배우는 본인만의 방법이 있나요?"
]

PERIODS = ["2025년 상반기", "2024년 하반기", "2024년 상반기", "2023년 하반기"]
POSITIONS = ["백엔드 개발", "프론트엔드 개발", "풀스택 개발", "데이터 분석", "AI/ML", "DevOps"]
EXPERIENCES = ["신입", "경력 1~3년", "경력 3~5년", "경력 5년 이상"]

def generate_interview_questions():
    """기출문제 생성"""
    connection = pymysql.connect(**DB_CONFIG)
    cursor = connection.cursor()

    print("="*60)
    print("📝 기출문제 생성 시작")
    print("="*60 + "\n")

    # jobs 테이블에서 회사 목록
    cursor.execute("SELECT DISTINCT company FROM jobs ORDER BY company")
    companies = [row[0] for row in cursor.fetchall()]

    print(f"📊 처리할 회사: {len(companies)}개\n")

    # catch_companies에서 company_id 매핑
    company_id_map = {}
    for company_name in companies:
        cursor.execute("SELECT id, company_url FROM catch_companies WHERE name = %s", (company_name,))
        result = cursor.fetchone()
        if result:
            company_id_map[company_name] = {'id': result[0], 'url': result[1]}

    total_inserted = 0

    for i, company_name in enumerate(companies, 1):
        print(f"[{i}/{len(companies)}] {company_name} 처리 중...")

        company_id = company_id_map.get(company_name, {}).get('id')
        company_url = company_id_map.get(company_name, {}).get('url', '')

        # 회사당 랜덤 5~15개 질문
        num_questions = random.randint(5, 15)
        selected_questions = random.sample(INTERVIEW_QUESTIONS, min(num_questions, len(INTERVIEW_QUESTIONS)))

        inserted = 0
        for question in selected_questions:
            try:
                # 중복 체크
                cursor.execute("""
                    SELECT id FROM catch_interview_questions
                    WHERE company_name = %s AND question = %s
                """, (company_name, question))

                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO catch_interview_questions
                        (company_id, company_name, question, period, position, experience, company_url, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        company_id,
                        company_name,
                        question,
                        random.choice(PERIODS),
                        random.choice(POSITIONS),
                        random.choice(EXPERIENCES),
                        company_url,
                        datetime.now()
                    ))
                    inserted += 1

            except Exception as e:
                continue

        if inserted > 0:
            connection.commit()
            total_inserted += inserted
            print(f"  ✅ {inserted}개 질문 저장")
        else:
            print(f"  ⏭️ 이미 존재")

        if i % 50 == 0:
            print(f"\n진행 상황: {i}/{len(companies)} 회사 처리 완료\n")

    cursor.close()
    connection.close()

    print(f"\n{'='*60}")
    print(f"✅ 기출문제 생성 완료")
    print(f"  - 총 {total_inserted}개 질문 생성")
    print(f"  - {len(companies)}개 회사 처리")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    generate_interview_questions()
