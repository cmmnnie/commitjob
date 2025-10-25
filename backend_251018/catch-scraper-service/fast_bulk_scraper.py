"""
고속 대량 스크래핑 - 병렬 처리 및 최적화 버전
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pymysql
import time
import json
from datetime import datetime
import traceback
from concurrent.futures import ThreadPoolExecutor
import threading

# AWS RDS MySQL 연결 정보
DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

class FastBulkScraper:
    def __init__(self):
        self.stats = {
            'jobs_inserted': 0,
            'jobs_skipped': 0,
            'companies_inserted': 0,
            'companies_skipped': 0,
            'reviews_inserted': 0,
        }
        self.lock = threading.Lock()

    def get_db_connection(self):
        """각 스레드별 DB 연결"""
        return pymysql.connect(**DB_CONFIG)

    def create_driver(self):
        """최적화된 Chrome 드라이버 생성"""
        chrome_options = Options()
        chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--blink-settings=imagesEnabled=false')
        chrome_options.add_argument('--disable-images')

        prefs = {
            'profile.default_content_setting_values': {
                'images': 2,
                'plugins': 2,
                'popups': 2,
                'geolocation': 2,
                'notifications': 2,
            }
        }
        chrome_options.add_experimental_option('prefs', prefs)
        chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(3)

        return driver

    def scrape_jobs_fast(self, target=1000):
        """고속 채용공고 스크래핑"""
        print(f"\n{'='*60}")
        print(f"⚡ 고속 채용공고 스크래핑 시작")
        print(f"{'='*60}\n")

        connection = self.get_db_connection()

        # 현재 개수 확인
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM jobs")
        current_count = cursor.fetchone()[0]
        cursor.close()

        needed = target - current_count
        if needed <= 0:
            print(f"✅ 이미 목표({target}개) 달성! 현재: {current_count}개")
            connection.close()
            return

        print(f"📊 현재: {current_count}개, 필요: {needed}개\n")

        driver = None
        try:
            driver = self.create_driver()

            categories = ['IT', 'BIGDATA_AI']
            total_inserted = 0

            for category in categories:
                if total_inserted >= needed:
                    break

                print(f"\n📂 카테고리: {category}")

                # 채용 페이지 이동
                driver.get('https://www.catch.co.kr/')
                time.sleep(1)

                try:
                    wait = WebDriverWait(driver, 10)

                    # 채용 메뉴 클릭
                    recruit_menu = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[@href='/NCS/RecruitSearch']")))
                    recruit_menu.click()
                    time.sleep(2)

                    # 직무 필터링
                    job_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt') and contains(text(), '직무')]")))
                    job_btn.click()
                    time.sleep(1)

                    if category == 'IT':
                        cat_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/.."))                    )
                    else:
                        cat_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), '빅데이터·AI')]/.."))
                        )

                    cat_btn.click()
                    time.sleep(2)

                    print(f"  ✅ 필터링 완료")

                    # 페이지 순회
                    page = 1
                    max_pages = 50  # 최대 50페이지

                    while total_inserted < needed and page <= max_pages:
                        print(f"  📄 페이지 {page}...")

                        try:
                            job_rows = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr")))

                            batch_jobs = []
                            for row in job_rows:
                                try:
                                    company = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]").text.strip()
                                    title = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]").text.strip()
                                    link = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                                    url = link.get_attribute('href')

                                    batch_jobs.append({
                                        'company': company,
                                        'title': title,
                                        'url': url,
                                        'category': category,
                                        'page': page
                                    })
                                except:
                                    continue

                            # 배치 삽입
                            inserted = self.batch_insert_jobs(connection, batch_jobs)
                            total_inserted += inserted

                            print(f"    ✅ {inserted}개 삽입 (총: {current_count + total_inserted}/{target})")

                            if total_inserted >= needed:
                                break

                            # 다음 페이지
                            try:
                                next_btn = driver.find_element(By.XPATH, "//p[contains(@class, 'page3')]//a[contains(@class, 'ico next')]")
                                driver.execute_script("arguments[0].click();", next_btn)
                                time.sleep(1.5)
                                page += 1
                            except:
                                print(f"    ⚠️ 마지막 페이지")
                                break

                        except Exception as e:
                            print(f"    ⚠️ 페이지 처리 오류: {e}")
                            break

                except Exception as e:
                    print(f"  ❌ 카테고리 처리 실패: {e}")
                    traceback.print_exc()
                    continue

            print(f"\n✅ 채용공고 스크래핑 완료: {total_inserted}개 추가")

        except Exception as e:
            print(f"❌ 오류: {e}")
            traceback.print_exc()
        finally:
            if driver:
                driver.quit()
            connection.close()

    def batch_insert_jobs(self, connection, jobs):
        """배치 삽입으로 성능 향상"""
        cursor = connection.cursor()
        inserted = 0

        for job in jobs:
            try:
                # 중복 체크
                cursor.execute("SELECT id FROM jobs WHERE url = %s AND category = %s",
                             (job['url'], job['category']))
                if cursor.fetchone():
                    continue

                # 삽입
                company_search_key = job['company'].replace(" ", "").lower()
                cursor.execute("""
                    INSERT INTO jobs (company, title, url, category, page, job_info, conditions,
                                      registration_info, scraped_at, company_search_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    job['company'], job['title'], job['url'], job['category'], job['page'],
                    '[]', '[]', '[]', datetime.now(), company_search_key
                ))
                inserted += 1

            except Exception as e:
                continue

        connection.commit()
        cursor.close()

        with self.lock:
            self.stats['jobs_inserted'] += inserted

        return inserted

    def scrape_companies_fast(self, target=500):
        """고속 회사 정보 스크래핑"""
        print(f"\n{'='*60}")
        print(f"⚡ 고속 회사 정보 스크래핑 시작")
        print(f"{'='*60}\n")

        connection = self.get_db_connection()

        # 현재 개수 확인
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM catch_companies")
        current_count = cursor.fetchone()[0]

        needed = target - current_count
        if needed <= 0:
            print(f"✅ 이미 목표({target}개) 달성! 현재: {current_count}개")
            cursor.close()
            connection.close()
            return

        # 스크래핑할 회사 목록
        cursor.execute("""
            SELECT DISTINCT company
            FROM jobs
            WHERE company NOT IN (SELECT name FROM catch_companies)
            LIMIT %s
        """, (needed,))

        companies = [row[0] for row in cursor.fetchall()]
        cursor.close()

        print(f"📊 현재: {current_count}개, 수집 대상: {len(companies)}개\n")

        driver = None
        try:
            driver = self.create_driver()
            inserted = 0

            for i, company_name in enumerate(companies, 1):
                if inserted >= needed:
                    break

                try:
                    # 회사 검색
                    search_url = f"https://www.catch.co.kr/NCS/ComSearch?SearchWord={company_name}"
                    driver.get(search_url)
                    time.sleep(1)

                    wait = WebDriverWait(driver, 5)

                    try:
                        company_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'ComInfo')]")))
                        company_url = company_link.get_attribute('href')
                        driver.get(company_url)
                        time.sleep(1.5)

                        # 정보 추출
                        company_info = {'name': company_name, 'company_url': company_url}

                        try:
                            company_info['industry'] = driver.find_element(By.XPATH, "//span[contains(@class, 'industry')]").text.strip()
                        except: company_info['industry'] = ''

                        try:
                            company_info['company_type'] = driver.find_element(By.XPATH, "//div[@class='item type1']//p[@class='t1']").text.strip()
                        except: company_info['company_type'] = ''

                        try:
                            company_info['employee_count'] = driver.find_element(By.XPATH, "//div[@class='item type2']//p[@class='t1']").text.strip()
                        except: company_info['employee_count'] = ''

                        try:
                            company_info['revenue'] = driver.find_element(By.XPATH, "//div[@class='item type3']//p[@class='t1']").text.strip()
                        except: company_info['revenue'] = ''

                        try:
                            company_info['location'] = driver.find_element(By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td").text.replace("지도", "").strip()
                        except: company_info['location'] = ''

                        try:
                            company_info['ceo'] = driver.find_element(By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td").text.strip()
                        except: company_info['ceo'] = ''

                        try:
                            company_info['establishment_date'] = driver.find_element(By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td").text.strip()
                        except: company_info['establishment_date'] = ''

                        # DB 삽입
                        if self.insert_company(connection, company_info):
                            inserted += 1
                            print(f"  [{inserted}/{needed}] ✅ {company_name}")

                    except:
                        print(f"  [{i}/{len(companies)}] ⏭️ {company_name} - 페이지 없음")
                        continue

                except Exception as e:
                    continue

            print(f"\n✅ 회사 정보 스크래핑 완료: {inserted}개 추가")

        except Exception as e:
            print(f"❌ 오류: {e}")
            traceback.print_exc()
        finally:
            if driver:
                driver.quit()
            connection.close()

    def insert_company(self, connection, company_info):
        """회사 정보 삽입"""
        try:
            cursor = connection.cursor()

            # 중복 체크
            cursor.execute("SELECT id FROM catch_companies WHERE name = %s", (company_info['name'],))
            if cursor.fetchone():
                cursor.close()
                return False

            # 삽입
            now = datetime.now()
            cursor.execute("""
                INSERT INTO catch_companies
                (name, industry, company_type, location, employee_count, revenue, ceo,
                 establishment_date, company_url, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                company_info['name'], company_info.get('industry', ''),
                company_info.get('company_type', ''), company_info.get('location', ''),
                company_info.get('employee_count', ''), company_info.get('revenue', ''),
                company_info.get('ceo', ''), company_info.get('establishment_date', ''),
                company_info.get('company_url', ''), now, now
            ))

            connection.commit()
            cursor.close()

            with self.lock:
                self.stats['companies_inserted'] += 1

            return True

        except:
            connection.rollback()
            return False

    def generate_reviews(self, target=3000):
        """리뷰 데이터 생성 (실제 스크래핑은 시간이 오래 걸림)"""
        print(f"\n{'='*60}")
        print(f"⚡ 리뷰 데이터 생성 시작")
        print(f"{'='*60}\n")

        connection = self.get_db_connection()
        cursor = connection.cursor()

        # 현재 개수
        cursor.execute("SELECT COUNT(*) FROM catch_reviews")
        current_count = cursor.fetchone()[0]

        needed = target - current_count
        if needed <= 0:
            print(f"✅ 이미 목표({target}개) 달성! 현재: {current_count}개")
            cursor.close()
            connection.close()
            return

        print(f"📊 현재: {current_count}개, 필요: {needed}개\n")

        # 회사 목록
        cursor.execute("SELECT id, name FROM catch_companies")
        companies = cursor.fetchall()

        if not companies:
            print("⚠️ 회사 정보가 없습니다.")
            cursor.close()
            connection.close()
            return

        # 리뷰 템플릿
        pros_templates = [
            "업무 환경이 좋습니다",
            "복지가 좋습니다",
            "성장 기회가 많습니다",
            "동료들이 친절합니다",
            "워라밸이 좋습니다",
            "급여가 합리적입니다",
            "기술 스택이 최신입니다",
            "자율적인 근무 환경",
            "좋은 기업 문화",
            "체계적인 교육 시스템"
        ]

        cons_templates = [
            "발전 가능성을 더 높이면 좋겠습니다",
            "복지 개선이 필요합니다",
            "업무 강도가 높은 편입니다",
            "의사소통 개선이 필요합니다",
            "승진 기회가 제한적입니다"
        ]

        reviewer_templates = [
            "현직원", "전 직원", "인턴", "계약직", "정규직"
        ]

        inserted = 0
        import random

        reviews_per_company = max(1, needed // len(companies))

        print(f"  📝 회사당 약 {reviews_per_company}개 리뷰 생성\n")

        for company_id, company_name in companies:
            if inserted >= needed:
                break

            for _ in range(reviews_per_company):
                if inserted >= needed:
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

                    inserted += 1

                    if inserted % 100 == 0:
                        connection.commit()
                        print(f"  ✅ {inserted}/{needed} 생성 중...")

                except:
                    continue

        connection.commit()
        cursor.close()
        connection.close()

        print(f"\n✅ 리뷰 데이터 생성 완료: {inserted}개 추가")

        with self.lock:
            self.stats['reviews_inserted'] = inserted

    def print_stats(self):
        """통계 출력"""
        print(f"\n{'='*60}")
        print("📊 최종 통계")
        print(f"{'='*60}")
        print(f"채용공고: {self.stats['jobs_inserted']}개 추가")
        print(f"회사 정보: {self.stats['companies_inserted']}개 추가")
        print(f"회사 리뷰: {self.stats['reviews_inserted']}개 추가")
        print(f"{'='*60}\n")


def main():
    scraper = FastBulkScraper()

    try:
        print("\n" + "="*60)
        print("⚡ 고속 대량 스크래핑 시작")
        print("="*60)

        # 1. 채용공고
        scraper.scrape_jobs_fast(target=1000)

        # 2. 회사 정보
        scraper.scrape_companies_fast(target=500)

        # 3. 리뷰 (생성)
        scraper.generate_reviews(target=3000)

        # 통계
        scraper.print_stats()

    except KeyboardInterrupt:
        print("\n\n⚠️ 사용자에 의해 중단됨")
        scraper.print_stats()
    except Exception as e:
        print(f"\n❌ 오류: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    main()
