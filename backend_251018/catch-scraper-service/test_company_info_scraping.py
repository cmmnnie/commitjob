"""
단일 회사 정보 스크래핑 테스트
"""

from scrape_company_info import CompanyInfoScraper

def test_single_company():
    print("\n" + "="*60)
    print("Test: Company Info Scraping (Kakao)")
    print("="*60 + "\n")

    scraper = CompanyInfoScraper()

    if not scraper.init_driver():
        print("❌ 드라이버 초기화 실패")
        return False

    if not scraper.login():
        print("❌ 로그인 실패")
        scraper.close()
        return False

    if not scraper.connect_db():
        print("❌ DB 연결 실패")
        scraper.close()
        return False

    # 카카오 검색
    test_company = "카카오"
    print(f"🔍 {test_company} 검색 중...\n")

    company_url = scraper.search_company_on_catch(test_company)

    if not company_url:
        print(f"❌ {test_company}를 찾을 수 없습니다")
        scraper.close()
        return False

    print(f"✅ URL 발견: {company_url}\n")

    # 회사 정보 스크래핑
    print(f"📋 회사 정보 스크래핑 중...\n")
    company_info = scraper.scrape_company_info(company_url)

    if not company_info:
        print(f"❌ 정보 추출 실패")
        scraper.close()
        return False

    # 추출된 정보 출력
    print("="*60)
    print("추출된 회사 정보:")
    print("="*60)

    # 필드 순서대로 표시
    field_order = [
        'industry', 'company_type', 'employee_count', 'revenue',
        'location', 'ceo', 'establishment_date', 'company_form',
        'credit_rating', 'tags', 'recommendation_keywords',
        'starting_salary', 'average_salary', 'industry_average_salary'
    ]

    for key in field_order:
        if key in company_info:
            value = company_info[key]
            status = "✅" if value else "⚠️ (null)"
            display_value = value if len(str(value)) <= 50 else str(value)[:50] + "..."
            print(f"{status} {key}: {display_value}")

    print("="*60 + "\n")

    # DB 저장
    print("💾 DB 저장 중...\n")
    if scraper.save_company_info(test_company, company_url, company_info):
        print("✅ DB 저장 성공\n")
    else:
        print("❌ DB 저장 실패\n")

    scraper.close()
    return True

if __name__ == "__main__":
    test_single_company()
