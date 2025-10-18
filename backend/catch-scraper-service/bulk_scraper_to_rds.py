"""
대량 Catch.co.kr 스크래핑 스크립트
목표: 채용공고 1000건, 회사정보 500건, 회사리뷰 3000건
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

class BulkCatchScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.stats = {
            'jobs_inserted': 0,
            'jobs_skipped': 0,
            'companies_inserted': 0,
            'companies_skipped': 0,
            'reviews_inserted': 0,
            'reviews_skipped': 0
        }

    def init_driver(self):
        """Chrome 드라이버 초기화 (개선된 버전)"""
        try:
            chrome_options = Options()

            # 성능 최적화 옵션
            chrome_options.add_argument('--headless=new')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-software-rasterizer')
            chrome_options.add_argument('--disable-logging')
            chrome_options.add_argument('--log-level=3')
            chrome_options.add_argument('--silent')

            # 안정성 옵션
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--allow-running-insecure-content')
            chrome_options.add_argument('--ignore-certificate-errors')

            # User agent
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

            # 메모리 최적화
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-browser-side-navigation')
            chrome_options.add_argument('--dns-prefetch-disable')

            # 이미지/CSS 로딩 안 함 (속도 향상)
            prefs = {
                'profile.default_content_setting_values': {
                    'images': 2,
                    'plugins': 2,
                    'popups': 2,
                    'geolocation': 2,
                    'notifications': 2,
                    'auto_select_certificate': 2,
                    'fullscreen': 2,
                    'mouselock': 2,
                    'mixed_script': 2,
                    'media_stream': 2,
                    'media_stream_mic': 2,
                    'media_stream_camera': 2,
                    'protocol_handlers': 2,
                    'ppapi_broker': 2,
                    'automatic_downloads': 2,
                    'midi_sysex': 2,
                    'push_messaging': 2,
                    'ssl_cert_decisions': 2,
                    'metro_switch_to_desktop': 2,
                    'protected_media_identifier': 2,
                    'app_banner': 2,
                    'site_engagement': 2,
                    'durable_storage': 2
                }
            }
            chrome_options.add_experimental_option('prefs', prefs)
            chrome_options.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
            chrome_options.add_experimental_option('useAutomationExtension', False)

            # 서비스 생성
            service = Service(ChromeDriverManager().install())

            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(60)
            self.driver.implicitly_wait(5)

            print("✅ Chrome 드라이버 초기화 성공\n")
            return True
        except Exception as e:
            print(f"❌ Chrome 드라이버 초기화 실패: {e}")
            traceback.print_exc()
            return False

    def connect_db(self):
        """AWS RDS MySQL 연결"""
        try:
            self.connection = pymysql.connect(**DB_CONFIG)
            print("✅ AWS RDS MySQL 연결 성공\n")
            return True
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            return False

    def close(self):
        """리소스 정리"""
        if self.driver:
            self.driver.quit()
        if self.connection:
            self.connection.close()
        print("\n✅ 리소스 정리 완료")

    def safe_get(self, url, retries=3):
        """안전한 페이지 로드 (재시도 포함)"""
        for attempt in range(retries):
            try:
                self.driver.get(url)
                return True
            except Exception as e:
                print(f"  ⚠️ 페이지 로드 실패 (시도 {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2)
                else:
                    return False
        return False

    def scrape_jobs(self, target=1000):
        """채용공고 대량 스크래핑"""
        print(f"\n{'='*60}")
        print(f"📋 채용공고 스크래핑 시작 (목표: {target}건)")
        print(f"{'='*60}\n")

        categories = ['IT', 'BIGDATA_AI']
        total_scraped = 0

        for category in categories:
            if total_scraped >= target:
                break

            print(f"\n📂 카테고리: {category}")

            # 채용 검색 페이지로 이동
            if not self.safe_get(BASE_URL):
                continue

            time.sleep(2)

            try:
                wait = WebDriverWait(self.driver, 15)
                recruit_menu = wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//a[@href='/NCS/RecruitSearch']"))
                )
                recruit_menu.click()
                time.sleep(3)

                # 카테고리 필터링
                job_category_btn = wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt') and contains(text(), '직무')]"))
                )
                job_category_btn.click()
                time.sleep(2)

                if category == 'IT':
                    category_btn = wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/.."))
                    )
                else:
                    category_btn = wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), '빅데이터·AI')]/.."))
                    )

                category_btn.click()
                time.sleep(3)

                print(f"  ✅ 필터링 완료\n")

                # 페이지 반복
                page = 1
                while total_scraped < target:
                    print(f"  📄 페이지 {page} 스크래핑 중...")
                    time.sleep(2)

                    try:
                        job_rows = wait.until(
                            EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr"))
                        )

                        for row in job_rows:
                            if total_scraped >= target:
                                break

                            try:
                                company = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]").text.strip()
                                title = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]").text.strip()
                                link = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                                url = link.get_attribute('href')

                                # 직무 정보
                                try:
                                    job_info_elements = row.find_elements(By.XPATH, ".//div[@class='part1']//span")
                                    job_info = [el.text.strip() for el in job_info_elements if el.text.strip()]
                                except:
                                    job_info = []

                                # 근무 조건
                                try:
                                    condition_elements = row.find_elements(By.XPATH, ".//div[@class='part2']//span")
                                    conditions = [el.text.strip() for el in condition_elements if el.text.strip()]
                                except:
                                    conditions = []

                                # 접수 정보
                                try:
                                    registration_elements = row.find_elements(By.XPATH, ".//div[@class='part3']//span")
                                    registration_info = [el.text.strip() for el in registration_elements if el.text.strip()]
                                except:
                                    registration_info = []

                                # DB 삽입
                                if self.insert_job(company, title, url, category, page, job_info, conditions, registration_info):
                                    total_scraped += 1
                                    print(f"    [{total_scraped}/{target}] ✅ {company}: {title[:50]}...")

                            except Exception as e:
                                continue

                        # 다음 페이지
                        if total_scraped < target:
                            try:
                                next_btn = self.driver.find_element(By.XPATH, "//p[contains(@class, 'page3')]//a[contains(@class, 'ico next')]")
                                self.driver.execute_script("arguments[0].click();", next_btn)
                                time.sleep(3)
                                page += 1
                            except:
                                print(f"    ⚠️ 다음 페이지 없음 (마지막 페이지)")
                                break

                    except Exception as e:
                        print(f"    ⚠️ 페이지 처리 오류: {e}")
                        break

            except Exception as e:
                print(f"  ❌ 카테고리 처리 실패: {e}")
                continue

        print(f"\n✅ 채용공고 스크래핑 완료: {total_scraped}건 삽입")
        return total_scraped

    def insert_job(self, company, title, url, category, page, job_info, conditions, registration_info):
        """채용공고 DB 삽입"""
        try:
            cursor = self.connection.cursor()

            # 중복 체크
            check_sql = "SELECT id FROM jobs WHERE url = %s AND category = %s"
            cursor.execute(check_sql, (url, category))
            if cursor.fetchone():
                self.stats['jobs_skipped'] += 1
                cursor.close()
                return False

            # 삽입
            company_search_key = company.replace(" ", "").lower()
            insert_sql = """
                INSERT INTO jobs (company, title, url, category, page, job_info, conditions,
                                  registration_info, scraped_at, company_search_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = (
                company, title, url, category, page,
                json.dumps(job_info, ensure_ascii=False),
                json.dumps(conditions, ensure_ascii=False),
                json.dumps(registration_info, ensure_ascii=False),
                datetime.now(),
                company_search_key
            )

            cursor.execute(insert_sql, values)
            self.connection.commit()
            cursor.close()

            self.stats['jobs_inserted'] += 1
            return True

        except Exception as e:
            self.connection.rollback()
            return False

    def scrape_companies(self, target=500):
        """회사 정보 대량 스크래핑"""
        print(f"\n{'='*60}")
        print(f"🏢 회사 정보 스크래핑 시작 (목표: {target}건)")
        print(f"{'='*60}\n")

        # jobs 테이블에서 고유 회사명 가져오기
        cursor = self.connection.cursor()
        cursor.execute("""
            SELECT DISTINCT company
            FROM jobs
            WHERE company NOT IN (SELECT name FROM catch_companies)
            LIMIT %s
        """, (target * 2,))

        companies = [row[0] for row in cursor.fetchall()]
        cursor.close()

        print(f"  📊 스크래핑 대상 회사: {len(companies)}개\n")

        scraped = 0
        for i, company_name in enumerate(companies, 1):
            if scraped >= target:
                break

            print(f"  [{i}/{len(companies)}] {company_name} 처리 중...")

            try:
                # 회사 검색
                search_url = f"https://www.catch.co.kr/NCS/ComSearch?SearchWord={company_name}"
                if not self.safe_get(search_url):
                    continue

                time.sleep(2)

                wait = WebDriverWait(self.driver, 10)

                try:
                    company_link = wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'ComInfo')]"))
                    )
                    company_url = company_link.get_attribute('href')

                    if not self.safe_get(company_url):
                        continue

                    time.sleep(3)

                    # 회사 정보 추출
                    company_info = {'name': company_name, 'company_url': company_url}

                    try:
                        industry = self.driver.find_element(By.XPATH, "//span[contains(@class, 'industry')]")
                        company_info['industry'] = industry.text.strip()
                    except:
                        company_info['industry'] = ''

                    try:
                        company_type = self.driver.find_element(By.XPATH, "//div[@class='item type1']//p[@class='t1']")
                        company_info['company_type'] = company_type.text.strip()
                    except:
                        company_info['company_type'] = ''

                    try:
                        employee = self.driver.find_element(By.XPATH, "//div[@class='item type2']//p[@class='t1']")
                        company_info['employee_count'] = employee.text.strip()
                    except:
                        company_info['employee_count'] = ''

                    try:
                        revenue = self.driver.find_element(By.XPATH, "//div[@class='item type3']//p[@class='t1']")
                        company_info['revenue'] = revenue.text.strip()
                    except:
                        company_info['revenue'] = ''

                    try:
                        location = self.driver.find_element(By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td")
                        company_info['location'] = location.text.replace("지도", "").strip()
                    except:
                        company_info['location'] = ''

                    try:
                        ceo = self.driver.find_element(By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td")
                        company_info['ceo'] = ceo.text.strip()
                    except:
                        company_info['ceo'] = ''

                    try:
                        establishment = self.driver.find_element(By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td")
                        company_info['establishment_date'] = establishment.text.strip()
                    except:
                        company_info['establishment_date'] = ''

                    # DB 삽입
                    if self.insert_company(company_info):
                        scraped += 1
                        print(f"    ✅ 성공 ({scraped}/{target})")

                    time.sleep(2)  # Rate limiting

                except Exception as e:
                    print(f"    ⚠️ 회사 페이지 접근 실패")
                    continue

            except Exception as e:
                print(f"    ⚠️ 처리 실패")
                continue

        print(f"\n✅ 회사 정보 스크래핑 완료: {scraped}건 삽입")
        return scraped

    def insert_company(self, company_info):
        """회사 정보 DB 삽입"""
        try:
            cursor = self.connection.cursor()

            # 중복 체크
            check_sql = "SELECT id FROM catch_companies WHERE name = %s"
            cursor.execute(check_sql, (company_info['name'],))
            if cursor.fetchone():
                self.stats['companies_skipped'] += 1
                cursor.close()
                return False

            # 삽입
            insert_sql = """
                INSERT INTO catch_companies
                (name, industry, company_type, location, employee_count, revenue, ceo,
                 establishment_date, company_url, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            now = datetime.now()
            values = (
                company_info['name'],
                company_info.get('industry', ''),
                company_info.get('company_type', ''),
                company_info.get('location', ''),
                company_info.get('employee_count', ''),
                company_info.get('revenue', ''),
                company_info.get('ceo', ''),
                company_info.get('establishment_date', ''),
                company_info.get('company_url', ''),
                now, now
            )

            cursor.execute(insert_sql, values)
            self.connection.commit()
            cursor.close()

            self.stats['companies_inserted'] += 1
            return True

        except Exception as e:
            self.connection.rollback()
            return False

    def scrape_reviews(self, target=3000):
        """회사 리뷰 대량 스크래핑"""
        print(f"\n{'='*60}")
        print(f"💬 회사 리뷰 스크래핑 시작 (목표: {target}건)")
        print(f"{'='*60}\n")

        # catch_companies에서 회사 목록 가져오기
        cursor = self.connection.cursor()
        cursor.execute("SELECT id, name, company_url FROM catch_companies")
        companies = cursor.fetchall()
        cursor.close()

        print(f"  📊 리뷰 수집 대상 회사: {len(companies)}개\n")

        total_reviews = 0

        for i, (company_id, company_name, company_url) in enumerate(companies, 1):
            if total_reviews >= target:
                break

            print(f"  [{i}/{len(companies)}] {company_name} 리뷰 수집 중...")

            try:
                if not company_url:
                    continue

                # 회사 페이지로 이동
                if not self.safe_get(company_url):
                    continue

                time.sleep(2)

                try:
                    # 리뷰 탭 클릭
                    wait = WebDriverWait(self.driver, 10)
                    review_tab = wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), '리뷰') or contains(@href, 'Review')]"))
                    )
                    review_tab.click()
                    time.sleep(3)

                    # 리뷰 목록 추출
                    review_elements = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'review-item') or contains(@class, 'rv_item')]")

                    company_reviews = 0
                    for review_elem in review_elements:
                        if total_reviews >= target:
                            break

                        try:
                            # 리뷰 정보 추출
                            reviewer_info = ''
                            review_date = ''
                            rating = 0.0
                            pros = ''
                            cons = ''

                            try:
                                reviewer_info = review_elem.find_element(By.XPATH, ".//span[contains(@class, 'reviewer') or contains(@class, 'info')]").text.strip()
                            except:
                                pass

                            try:
                                review_date = review_elem.find_element(By.XPATH, ".//span[contains(@class, 'date')]").text.strip()
                            except:
                                pass

                            try:
                                rating_elem = review_elem.find_element(By.XPATH, ".//span[contains(@class, 'rating') or contains(@class, 'score')]")
                                rating_text = rating_elem.text.strip()
                                rating = float(rating_text.replace('점', '').strip())
                            except:
                                pass

                            try:
                                pros = review_elem.find_element(By.XPATH, ".//dd[contains(text(), '장점') or preceding-sibling::dt[contains(text(), '장점')]]").text.strip()
                            except:
                                pass

                            try:
                                cons = review_elem.find_element(By.XPATH, ".//dd[contains(text(), '단점') or preceding-sibling::dt[contains(text(), '단점')]]").text.strip()
                            except:
                                pass

                            # DB 삽입
                            if self.insert_review(company_id, company_name, reviewer_info, review_date, rating, pros, cons):
                                total_reviews += 1
                                company_reviews += 1

                        except Exception as e:
                            continue

                    print(f"    ✅ {company_reviews}개 리뷰 수집 ({total_reviews}/{target})")

                except Exception as e:
                    print(f"    ⚠️ 리뷰 탭 접근 실패")
                    continue

            except Exception as e:
                print(f"    ⚠️ 처리 실패")
                continue

        print(f"\n✅ 리뷰 스크래핑 완료: {total_reviews}건 삽입")
        return total_reviews

    def insert_review(self, company_id, company_name, reviewer_info, review_date, rating, pros, cons):
        """리뷰 DB 삽입"""
        try:
            cursor = self.connection.cursor()

            insert_sql = """
                INSERT INTO catch_reviews
                (company_id, company_name, reviewer_info, review_date, rating, pros, cons, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = (
                company_id,
                company_name,
                reviewer_info,
                review_date,
                rating if rating > 0 else None,
                pros,
                cons,
                datetime.now()
            )

            cursor.execute(insert_sql, values)
            self.connection.commit()
            cursor.close()

            self.stats['reviews_inserted'] += 1
            return True

        except Exception as e:
            self.connection.rollback()
            return False

    def print_stats(self):
        """통계 출력"""
        print(f"\n{'='*60}")
        print("📊 최종 통계")
        print(f"{'='*60}")
        print(f"채용공고:")
        print(f"  - 새로 삽입: {self.stats['jobs_inserted']}건")
        print(f"  - 중복 스킵: {self.stats['jobs_skipped']}건")
        print(f"\n회사 정보:")
        print(f"  - 새로 삽입: {self.stats['companies_inserted']}건")
        print(f"  - 중복 스킵: {self.stats['companies_skipped']}건")
        print(f"\n회사 리뷰:")
        print(f"  - 새로 삽입: {self.stats['reviews_inserted']}건")
        print(f"  - 중복 스킵: {self.stats['reviews_skipped']}건")
        print(f"{'='*60}\n")


def main():
    scraper = BulkCatchScraper()

    try:
        print("\n" + "="*60)
        print("🚀 대량 Catch.co.kr 스크래핑 시작")
        print("="*60)

        if not scraper.init_driver():
            return

        if not scraper.connect_db():
            return

        # 1. 채용공고 1000건
        scraper.scrape_jobs(target=1000)

        # 2. 회사정보 500건
        scraper.scrape_companies(target=500)

        # 3. 회사리뷰 3000건
        scraper.scrape_reviews(target=3000)

        # 통계 출력
        scraper.print_stats()

    except KeyboardInterrupt:
        print("\n\n⚠️ 사용자에 의해 중단됨")
        scraper.print_stats()
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        traceback.print_exc()
    finally:
        scraper.close()


if __name__ == "__main__":
    main()
