"""
Catch.co.kr 채용 정보 스크래핑 및 AWS RDS MySQL 삽입 스크립트
- 채용공고, 상세정보, 회사정보를 스크래핑하여 중복 없이 RDS에 저장
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
from urllib.parse import urlparse, parse_qs

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

class CatchScraperToRDS:
    def __init__(self):
        self.driver = None
        self.connection = None

    def init_driver(self):
        """Chrome 드라이버 초기화"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.set_page_load_timeout(30)
            self.driver.implicitly_wait(10)

            print("✅ Chrome 드라이버 초기화 성공")
            return True
        except Exception as e:
            print(f"❌ Chrome 드라이버 초기화 실패: {e}")
            return False

    def connect_db(self):
        """AWS RDS MySQL 연결"""
        try:
            self.connection = pymysql.connect(**DB_CONFIG)
            print("✅ AWS RDS MySQL 연결 성공")
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
        print("✅ 리소스 정리 완료")

    def navigate_to_recruit(self):
        """채용 검색 페이지로 이동"""
        try:
            self.driver.get(BASE_URL)
            time.sleep(2)

            wait = WebDriverWait(self.driver, 10)
            recruit_menu = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/NCS/RecruitSearch']"))
            )
            recruit_menu.click()
            time.sleep(2)

            print("✅ 채용 검색 페이지 이동 완료")
            return True
        except Exception as e:
            print(f"❌ 채용 검색 페이지 이동 실패: {e}")
            return False

    def filter_category(self, category='IT'):
        """카테고리 필터링 (IT개발 또는 빅데이터·AI)"""
        try:
            wait = WebDriverWait(self.driver, 10)

            # 직무 버튼 클릭
            job_category_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt') and contains(text(), '직무')]"))
            )
            job_category_btn.click()
            time.sleep(1)

            # 카테고리 선택
            if category == 'IT':
                category_btn = wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/.."))
                )
            else:  # BIGDATA_AI
                category_btn = wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt')]//span[contains(text(), '빅데이터·AI')]/.."))
                )

            category_btn.click()
            time.sleep(2)

            print(f"✅ {category} 카테고리 필터링 완료")
            return True
        except Exception as e:
            print(f"❌ 카테고리 필터링 실패: {e}")
            return False

    def extract_job_list(self, max_pages=3):
        """채용 공고 목록 추출"""
        jobs = []

        try:
            for page in range(1, max_pages + 1):
                print(f"\n📄 페이지 {page} 스크래핑 중...")
                time.sleep(2)

                wait = WebDriverWait(self.driver, 10)
                job_rows = wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr"))
                )

                for row in job_rows:
                    try:
                        # 회사명
                        company = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]").text.strip()

                        # 공고 제목
                        title = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]").text.strip()

                        # URL
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

                        job = {
                            'company': company,
                            'title': title,
                            'url': url,
                            'page': page,
                            'job_info': job_info,
                            'conditions': conditions,
                            'registration_info': registration_info
                        }

                        jobs.append(job)
                        print(f"  - {company}: {title}")

                    except Exception as e:
                        print(f"  ⚠️ 공고 추출 실패: {e}")
                        continue

                # 다음 페이지로 이동
                if page < max_pages:
                    try:
                        next_btn = self.driver.find_element(By.XPATH, "//p[contains(@class, 'page3')]//a[contains(@class, 'ico next')]")
                        next_btn.click()
                        time.sleep(2)
                    except:
                        print(f"  ⚠️ 페이지 {page+1}로 이동 실패 (마지막 페이지일 수 있음)")
                        break

            print(f"\n✅ 총 {len(jobs)}개 공고 추출 완료")
            return jobs

        except Exception as e:
            print(f"❌ 공고 목록 추출 실패: {e}")
            return jobs

    def extract_job_detail(self, job_url):
        """채용 공고 상세 정보 추출"""
        try:
            self.driver.get(job_url)
            time.sleep(2)

            wait = WebDriverWait(self.driver, 10)

            detail = {
                'job_type': '',
                'location': '',
                'career_level': '',
                'education': '',
                'job_description': '',
                'deadline': ''
            }

            try:
                # 기본 정보 (경력, 고용형태, 학력, 지역)
                basic_info = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='group bg1']//p[@class='txt']")))
                basic_text = basic_info.text.strip()

                parts = basic_text.split("|")
                for part in parts:
                    part = part.strip()
                    if "경력" in part:
                        detail['career_level'] = part
                    elif "정규직" in part or "계약직" in part or "인턴" in part:
                        detail['job_type'] = part
                    elif "학력" in part:
                        detail['education'] = part
                    elif "구" in part or "시" in part:
                        detail['location'] = part
            except:
                pass

            try:
                # 직무 설명
                job_desc = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='group bg2']//p[@class='txt']")))
                detail['job_description'] = job_desc.text.strip()
            except:
                pass

            try:
                # 마감일
                deadline_elem = self.driver.find_element(By.XPATH, "//div[@class='group bg3']//span[contains(@class, 'd-day')]")
                detail['deadline'] = deadline_elem.text.strip()
            except:
                pass

            return detail

        except Exception as e:
            print(f"  ⚠️ 상세 정보 추출 실패: {e}")
            return {}

    def extract_company_info(self, company_name):
        """회사 정보 추출 (검색을 통해)"""
        try:
            # 회사 검색 페이지로 이동
            search_url = f"https://www.catch.co.kr/NCS/ComSearch?SearchWord={company_name}"
            self.driver.get(search_url)
            time.sleep(2)

            wait = WebDriverWait(self.driver, 10)

            # 첫 번째 회사 링크 클릭
            company_link = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'ComInfo')]"))
            )
            company_url = company_link.get_attribute('href')
            self.driver.get(company_url)
            time.sleep(3)

            company_info = {
                'name': company_name,
                'industry': '',
                'company_type': '',
                'location': '',
                'employee_count': '',
                'revenue': '',
                'ceo': '',
                'establishment_date': '',
                'company_form': '',
                'credit_rating': '',
                'company_url': company_url
            }

            try:
                # 업종
                industry = self.driver.find_element(By.XPATH, "//span[contains(@class, 'industry')]")
                company_info['industry'] = industry.text.strip()
            except:
                pass

            try:
                # 기업 규모
                company_type = self.driver.find_element(By.XPATH, "//div[@class='item type1']//p[@class='t1']")
                company_info['company_type'] = company_type.text.strip()
            except:
                pass

            try:
                # 사원수
                employee = self.driver.find_element(By.XPATH, "//div[@class='item type2']//p[@class='t1']")
                company_info['employee_count'] = employee.text.strip()
            except:
                pass

            try:
                # 매출액
                revenue = self.driver.find_element(By.XPATH, "//div[@class='item type3']//p[@class='t1']")
                company_info['revenue'] = revenue.text.strip()
            except:
                pass

            try:
                # 주소
                location = self.driver.find_element(By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td")
                company_info['location'] = location.text.replace("지도", "").strip()
            except:
                pass

            try:
                # CEO
                ceo = self.driver.find_element(By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td")
                company_info['ceo'] = ceo.text.strip()
            except:
                pass

            try:
                # 개업일
                establishment = self.driver.find_element(By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td")
                company_info['establishment_date'] = establishment.text.strip()
            except:
                pass

            return company_info

        except Exception as e:
            print(f"  ⚠️ 회사 정보 추출 실패: {e}")
            return None

    def insert_job_to_db(self, job, category, detail=None):
        """채용공고 DB 삽입 (중복 방지)"""
        try:
            cursor = self.connection.cursor()

            # 중복 체크 (URL + category 기준)
            check_sql = "SELECT id FROM jobs WHERE url = %s AND category = %s"
            cursor.execute(check_sql, (job['url'], category))
            existing = cursor.fetchone()

            if existing:
                print(f"  ⏭️ 이미 존재: {job['company']} - {job['title']}")
                cursor.close()
                return False

            # 회사 검색 키 생성 (공백 제거)
            company_search_key = job['company'].replace(" ", "").lower()

            # 삽입
            insert_sql = """
                INSERT INTO jobs (company, title, url, category, page, job_info, conditions,
                                  registration_info, scraped_at, company_search_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = (
                job['company'],
                job['title'],
                job['url'],
                category,
                job['page'],
                json.dumps(job.get('job_info', []), ensure_ascii=False),
                json.dumps(job.get('conditions', []), ensure_ascii=False),
                json.dumps(job.get('registration_info', []), ensure_ascii=False),
                datetime.now(),
                company_search_key
            )

            cursor.execute(insert_sql, values)
            self.connection.commit()
            cursor.close()

            print(f"  ✅ 삽입 성공: {job['company']} - {job['title']}")
            return True

        except Exception as e:
            print(f"  ❌ DB 삽입 실패: {e}")
            self.connection.rollback()
            return False

    def insert_company_to_db(self, company_info):
        """회사 정보 DB 삽입 (중복 방지)"""
        try:
            cursor = self.connection.cursor()

            # 중복 체크 (회사명 기준)
            check_sql = "SELECT id FROM catch_companies WHERE name = %s"
            cursor.execute(check_sql, (company_info['name'],))
            existing = cursor.fetchone()

            if existing:
                print(f"  ⏭️ 회사 정보 이미 존재: {company_info['name']}")
                cursor.close()
                return False

            # 삽입
            insert_sql = """
                INSERT INTO catch_companies
                (name, industry, company_type, location, employee_count, revenue, ceo,
                 establishment_date, company_form, credit_rating, company_url, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                company_info.get('company_form', ''),
                company_info.get('credit_rating', ''),
                company_info.get('company_url', ''),
                now,
                now
            )

            cursor.execute(insert_sql, values)
            self.connection.commit()
            cursor.close()

            print(f"  ✅ 회사 정보 삽입 성공: {company_info['name']}")
            return True

        except Exception as e:
            print(f"  ❌ 회사 정보 삽입 실패: {e}")
            self.connection.rollback()
            return False

    def run(self, categories=['IT', 'BIGDATA_AI'], max_pages=3, scrape_companies=False):
        """전체 스크래핑 프로세스 실행"""
        print("\n" + "="*60)
        print("🚀 Catch.co.kr 스크래핑 시작")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.connect_db():
            return False

        total_jobs = 0
        total_companies = 0

        for category in categories:
            print(f"\n{'='*60}")
            print(f"📂 카테고리: {category}")
            print(f"{'='*60}\n")

            if not self.navigate_to_recruit():
                continue

            if not self.filter_category(category):
                continue

            # 공고 목록 추출
            jobs = self.extract_job_list(max_pages)

            # 공고 DB 삽입
            print(f"\n💾 DB 삽입 시작...")
            for i, job in enumerate(jobs, 1):
                print(f"[{i}/{len(jobs)}] 처리 중...")

                # 공고 삽입
                if self.insert_job_to_db(job, category):
                    total_jobs += 1

                # 회사 정보 스크래핑 및 삽입 (선택적)
                if scrape_companies:
                    company_info = self.extract_company_info(job['company'])
                    if company_info:
                        if self.insert_company_to_db(company_info):
                            total_companies += 1
                        time.sleep(2)  # Rate limiting

        print(f"\n{'='*60}")
        print(f"✅ 스크래핑 완료!")
        print(f"  - 삽입된 채용공고: {total_jobs}개")
        if scrape_companies:
            print(f"  - 삽입된 회사 정보: {total_companies}개")
        print(f"{'='*60}\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = CatchScraperToRDS()

    # 실행 설정
    # scrape_companies=True로 설정하면 회사 정보도 스크래핑 (시간 소요)
    scraper.run(
        categories=['IT', 'BIGDATA_AI'],  # 스크래핑할 카테고리
        max_pages=5,  # 각 카테고리당 페이지 수
        scrape_companies=False  # 회사 정보 스크래핑 여부
    )
