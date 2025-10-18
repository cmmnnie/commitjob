"""
catch_companies와 catch_reviews 테이블의 전체 데이터를 txt 파일로 저장
"""

import mysql.connector
import json
import sys
import io
from datetime import datetime

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
cursor = conn.cursor(dictionary=True)

# 파일 이름 생성 (날짜 포함)
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
companies_file = f'catch_companies_{timestamp}.txt'
reviews_file = f'catch_reviews_{timestamp}.txt'

# ===========================
# catch_companies 데이터 저장
# ===========================
print(f"catch_companies 테이블 데이터 추출 중...")
cursor.execute("SELECT * FROM catch_companies ORDER BY id")
companies = cursor.fetchall()

with open(companies_file, 'w', encoding='utf-8') as f:
    f.write("=" * 100 + "\n")
    f.write("CATCH_COMPANIES 테이블 전체 데이터\n")
    f.write(f"추출 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"총 {len(companies)}개 회사\n")
    f.write("=" * 100 + "\n\n")

    for idx, company in enumerate(companies, 1):
        f.write(f"\n{'='*100}\n")
        f.write(f"[{idx}] 회사 ID: {company['id']}\n")
        f.write(f"{'='*100}\n")
        f.write(f"회사명: {company['name']}\n")
        f.write(f"업종: {company['industry']}\n")
        f.write(f"기업 규모: {company['company_type']}\n")
        f.write(f"위치: {company['location']}\n")
        f.write(f"사원수: {company['employee_count']}\n")
        f.write(f"매출액: {company['revenue']}\n")
        f.write(f"대표자: {company['ceo']}\n")
        f.write(f"설립일: {company['establishment_date']}\n")
        f.write(f"기업형태: {company['company_form']}\n")
        f.write(f"신용등급: {company['credit_rating']}\n")

        # JSON 형식의 태그 파싱
        if company['tags']:
            try:
                tags = json.loads(company['tags'])
                f.write(f"태그: {', '.join(tags)}\n")
            except:
                f.write(f"태그: {company['tags']}\n")
        else:
            f.write("태그: (없음)\n")

        # JSON 형식의 추천 키워드 파싱
        if company['recommendation_keywords']:
            try:
                keywords = json.loads(company['recommendation_keywords'])
                f.write(f"추천 키워드: {', '.join(keywords)}\n")
            except:
                f.write(f"추천 키워드: {company['recommendation_keywords']}\n")
        else:
            f.write("추천 키워드: (없음)\n")

        f.write(f"초봉: {company['starting_salary']}\n")
        f.write(f"평균연봉: {company['average_salary']}\n")
        f.write(f"업계평균연봉: {company['industry_average_salary']}\n")
        f.write(f"회사 URL: {company['company_url']}\n")
        f.write(f"생성일: {company['created_at']}\n")
        f.write(f"수정일: {company['updated_at']}\n")

print(f"✅ {companies_file} 저장 완료 ({len(companies)}개 회사)")

# ===========================
# catch_reviews 데이터 저장
# ===========================
print(f"\ncatch_reviews 테이블 데이터 추출 중...")
cursor.execute("""
    SELECT r.*, c.name as company_name_full
    FROM catch_reviews r
    JOIN catch_companies c ON r.company_id = c.id
    ORDER BY r.company_id, r.id
""")
reviews = cursor.fetchall()

with open(reviews_file, 'w', encoding='utf-8') as f:
    f.write("=" * 100 + "\n")
    f.write("CATCH_REVIEWS 테이블 전체 데이터\n")
    f.write(f"추출 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write(f"총 {len(reviews)}개 리뷰\n")
    f.write("=" * 100 + "\n\n")

    current_company_id = None
    company_review_count = 0

    for idx, review in enumerate(reviews, 1):
        # 회사가 바뀔 때마다 구분선 추가
        if current_company_id != review['company_id']:
            if current_company_id is not None:
                f.write(f"\n{'='*100}\n")
                f.write(f"{review['company_name_full']} 리뷰 ({company_review_count}건)\n")
                f.write(f"{'='*100}\n\n")
            current_company_id = review['company_id']
            company_review_count = 0

        company_review_count += 1

        f.write(f"\n{'-'*100}\n")
        f.write(f"[리뷰 ID: {review['id']}] {review['company_name_full']} - 리뷰 #{company_review_count}\n")
        f.write(f"{'-'*100}\n")
        f.write(f"회사 ID: {review['company_id']}\n")
        f.write(f"작성자 정보: {review['reviewer_info']}\n")
        f.write(f"작성일: {review['review_date']}\n")
        f.write(f"평점: {review['rating']}점\n")
        f.write(f"\n[장점]\n{review['pros']}\n")
        f.write(f"\n[단점]\n{review['cons']}\n")
        f.write(f"\n생성일: {review['created_at']}\n")

print(f"✅ {reviews_file} 저장 완료 ({len(reviews)}개 리뷰)")

# ===========================
# 통계 정보 저장
# ===========================
stats_file = f'catch_statistics_{timestamp}.txt'

cursor.execute("SELECT COUNT(*) as count FROM catch_companies")
company_count = cursor.fetchone()['count']

cursor.execute("SELECT COUNT(*) as count FROM catch_reviews")
review_count = cursor.fetchone()['count']

cursor.execute("SELECT AVG(rating) as avg_rating, MIN(rating) as min_rating, MAX(rating) as max_rating FROM catch_reviews")
rating_stats = cursor.fetchone()

cursor.execute("""
    SELECT c.name, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
    FROM catch_companies c
    LEFT JOIN catch_reviews r ON c.id = r.company_id
    GROUP BY c.id, c.name
    ORDER BY avg_rating DESC
    LIMIT 10
""")
top_companies = cursor.fetchall()

cursor.execute("""
    SELECT c.name, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
    FROM catch_companies c
    LEFT JOIN catch_reviews r ON c.id = r.company_id
    GROUP BY c.id, c.name
    ORDER BY avg_rating ASC
    LIMIT 10
""")
bottom_companies = cursor.fetchall()

cursor.execute("""
    SELECT industry, COUNT(*) as count
    FROM catch_companies
    GROUP BY industry
    ORDER BY count DESC
""")
industry_stats = cursor.fetchall()

with open(stats_file, 'w', encoding='utf-8') as f:
    f.write("=" * 100 + "\n")
    f.write("CATCH 데이터베이스 통계 정보\n")
    f.write(f"생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("=" * 100 + "\n\n")

    f.write("[전체 통계]\n")
    f.write(f"총 회사 수: {company_count}개\n")
    f.write(f"총 리뷰 수: {review_count}개\n")
    f.write(f"평균 평점: {float(rating_stats['avg_rating']):.2f}점\n")
    f.write(f"최고 평점: {float(rating_stats['max_rating']):.1f}점\n")
    f.write(f"최저 평점: {float(rating_stats['min_rating']):.1f}점\n")

    f.write("\n" + "=" * 100 + "\n")
    f.write("[평점 상위 10개 회사]\n")
    f.write("=" * 100 + "\n")
    for idx, company in enumerate(top_companies, 1):
        f.write(f"{idx:2d}. {company['name']:30s} - 평점: {float(company['avg_rating']):.2f}점 (리뷰 {company['review_count']}개)\n")

    f.write("\n" + "=" * 100 + "\n")
    f.write("[평점 하위 10개 회사]\n")
    f.write("=" * 100 + "\n")
    for idx, company in enumerate(bottom_companies, 1):
        f.write(f"{idx:2d}. {company['name']:30s} - 평점: {float(company['avg_rating']):.2f}점 (리뷰 {company['review_count']}개)\n")

    f.write("\n" + "=" * 100 + "\n")
    f.write("[업종별 회사 분포]\n")
    f.write("=" * 100 + "\n")
    for stat in industry_stats:
        f.write(f"{stat['industry']:20s}: {stat['count']:3d}개\n")

print(f"✅ {stats_file} 저장 완료")

cursor.close()
conn.close()

print("\n" + "=" * 100)
print("전체 데이터 추출 완료!")
print("=" * 100)
print(f"1. 회사 정보: {companies_file}")
print(f"2. 리뷰 정보: {reviews_file}")
print(f"3. 통계 정보: {stats_file}")
print("=" * 100)
