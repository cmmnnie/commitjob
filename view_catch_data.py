import mysql.connector
import json
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
cursor = conn.cursor(dictionary=True)

# 회사 정보 샘플 조회
print("=" * 80)
print("catch_companies 테이블 - 샘플 데이터 (5건)")
print("=" * 80)
cursor.execute("SELECT * FROM catch_companies LIMIT 5")
companies = cursor.fetchall()

for company in companies:
    print(f"\n[ID: {company['id']}] {company['name']}")
    print(f"  업종: {company['industry']}")
    print(f"  규모: {company['company_type']}")
    print(f"  위치: {company['location']}")
    print(f"  사원수: {company['employee_count']}")
    print(f"  매출: {company['revenue']}")
    print(f"  평균연봉: {company['average_salary']}")
    tags = json.loads(company['tags']) if company['tags'] else []
    print(f"  태그: {', '.join(tags)}")

# 리뷰 정보 샘플 조회
print("\n" + "=" * 80)
print("catch_reviews 테이블 - 샘플 데이터 (5건)")
print("=" * 80)
cursor.execute("""
    SELECT r.*, c.name as company_name
    FROM catch_reviews r
    JOIN catch_companies c ON r.company_id = c.id
    LIMIT 5
""")
reviews = cursor.fetchall()

for review in reviews:
    print(f"\n[리뷰 ID: {review['id']}] {review['company_name']}")
    print(f"  작성자: {review['reviewer_info']}")
    print(f"  작성일: {review['review_date']}")
    print(f"  평점: {review['rating']}점")
    print(f"  장점: {review['pros']}")
    print(f"  단점: {review['cons']}")

# 통계 조회
print("\n" + "=" * 80)
print("데이터 통계")
print("=" * 80)

cursor.execute("SELECT COUNT(*) as count FROM catch_companies")
company_count = cursor.fetchone()['count']
print(f"총 회사 수: {company_count}개")

cursor.execute("SELECT COUNT(*) as count FROM catch_reviews")
review_count = cursor.fetchone()['count']
print(f"총 리뷰 수: {review_count}개")

cursor.execute("SELECT AVG(rating) as avg_rating FROM catch_reviews")
avg_rating = cursor.fetchone()['avg_rating']
print(f"전체 평균 평점: {float(avg_rating):.2f}점")

cursor.execute("""
    SELECT c.name, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
    FROM catch_companies c
    LEFT JOIN catch_reviews r ON c.id = r.company_id
    GROUP BY c.id
    ORDER BY avg_rating DESC
    LIMIT 5
""")
top_companies = cursor.fetchall()
print("\n평점 상위 5개 회사:")
for idx, company in enumerate(top_companies, 1):
    print(f"  {idx}. {company['name']}: {float(company['avg_rating']):.2f}점 (리뷰 {company['review_count']}개)")

cursor.close()
conn.close()
