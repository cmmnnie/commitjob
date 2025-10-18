"""
간단한 테스트 스크립트 - 1페이지만 스크래핑하여 RDS에 삽입
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import pymysql
import time
import json
from datetime import datetime

# AWS RDS MySQL 연결 정보
DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

BASE_URL = 'https://www.catch.co.kr/'

def test_scrape():
    driver = None
    connection = None

    try:
        print("\n" + "="*60)
        print("테스트 스크래핑 시작 (IT 카테고리, 1페이지만)")
        print("="*60 + "\n")

        # Chrome 드라이버 초기화
        print("1. Chrome 드라이버 초기화...")
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')

        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        print("   ✅ 성공\n")

        # DB 연결
        print("2. AWS RDS MySQL 연결...")
        connection = pymysql.connect(**DB_CONFIG)
        print("   ✅ 성공\n")

        # 채용 페이지 이동
        print("3. 채용 페이지 이동...")
        driver.get(BASE_URL)
        time.sleep(2)

        wait = WebDriverWait(driver, 10)
        recruit_menu = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//a[@href='/NCS/RecruitSearch']"))
        )
        recruit_menu.click()
        time.sleep(2)
        print("   ✅ 성공\n")

        # IT 카테고리 필터링
        print("4. IT 카테고리 필터링...")
        job_category_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt') and contains(text(), '직무')]"))
        )
        job_category_btn.click()
        time.sleep(1)

        category_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/.."))
        )
        category_btn.click()
        time.sleep(2)
        print("   ✅ 성공\n")

        # 공고 목록 추출
        print("5. 공고 목록 추출...")
        job_rows = wait.until(
            EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr"))
        )

        jobs = []
        for i, row in enumerate(job_rows[:5], 1):  # 처음 5개만
            try:
                company = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]").text.strip()
                title = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]").text.strip()
                link = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                url = link.get_attribute('href')

                job = {
                    'company': company,
                    'title': title,
                    'url': url,
                    'page': 1
                }
                jobs.append(job)
                print(f"   [{i}] {company}: {title}")

            except Exception as e:
                print(f"   ⚠️ 공고 {i} 추출 실패: {e}")
                continue

        print(f"\n   ✅ 총 {len(jobs)}개 공고 추출 완료\n")

        # DB 삽입
        print("6. DB 삽입...")
        cursor = connection.cursor()
        inserted = 0
        skipped = 0

        for i, job in enumerate(jobs, 1):
            try:
                # 중복 체크
                check_sql = "SELECT id FROM jobs WHERE url = %s AND category = %s"
                cursor.execute(check_sql, (job['url'], 'IT'))
                existing = cursor.fetchone()

                if existing:
                    print(f"   [{i}] ⏭️ 이미 존재: {job['company']}")
                    skipped += 1
                    continue

                # 삽입
                company_search_key = job['company'].replace(" ", "").lower()
                insert_sql = """
                    INSERT INTO jobs (company, title, url, category, page, job_info, conditions,
                                      registration_info, scraped_at, company_search_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """

                values = (
                    job['company'],
                    job['title'],
                    job['url'],
                    'IT',
                    1,
                    '[]',
                    '[]',
                    '[]',
                    datetime.now(),
                    company_search_key
                )

                cursor.execute(insert_sql, values)
                connection.commit()
                inserted += 1
                print(f"   [{i}] ✅ 삽입 성공: {job['company']}")

            except Exception as e:
                print(f"   [{i}] ❌ DB 삽입 실패: {e}")
                connection.rollback()

        cursor.close()

        print(f"\n{'='*60}")
        print(f"✅ 테스트 완료!")
        print(f"   - 새로 삽입: {inserted}개")
        print(f"   - 중복 스킵: {skipped}개")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

    finally:
        if driver:
            driver.quit()
        if connection:
            connection.close()
        print("리소스 정리 완료")


if __name__ == "__main__":
    test_scrape()
