"""
특정 채용공고를 jobs 테이블에 insert하는 프로그램

사용법:
  python insert_job.py <채용공고_URL>

예시:
  python insert_job.py https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567
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
from datetime import datetime
import traceback
import re

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

class JobInserter:
    def __init__(self):
        self.driver = None
        self.connection = None

    def init_driver(self):
        """Chrome 드라이버 초기화"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--start-maximized')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)

            self.driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            self.driver.set_page_load_timeout(60)
            self.driver.implicitly_wait(10)

            print("✅ Chrome 드라이버 초기화 성공\n")
            return True
        except Exception as e:
            print(f"❌ Chrome 드라이버 초기화 실패: {e}")
            traceback.print_exc()
            return False

    def connect_db(self):
        """DB 연결"""
        try:
            self.connection = pymysql.connect(**DB_CONFIG)
            print("✅ AWS RDS MySQL 연결 성공\n")
            return True
        except Exception as e:
            print(f"❌ DB 연결 실패: {e}")
            return False

    def close(self):
        """리소스 정리"""
        if self.driver:
            self.driver.quit()
        if self.connection:
            self.connection.close()
        print("\n✅ 리소스 정리 완료")

    def scrape_job(self, url):
        """채용공고 스크래핑"""
        try:
            print(f"📋 채용공고 페이지 로딩 중...")
            print(f"   URL: {url}\n")

            self.driver.get(url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)
            job_data = {}

            # 회사명 추출
            try:
                company_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='company']//a"))
                )
                job_data['company'] = company_element.text.strip()
                print(f"✅ 회사명: {job_data['company']}")
            except:
                try:
                    company_element = self.driver.find_element(By.XPATH, "//span[@class='company_name']")
                    job_data['company'] = company_element.text.strip()
                    print(f"✅ 회사명: {job_data['company']}")
                except:
                    print("❌ 회사명 추출 실패")
                    return None

            # 채용공고 제목 추출
            try:
                title_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//h1[@class='tit'] | //h2[@class='tit'] | //div[@class='title']//h1"))
                )
                job_data['title'] = title_element.text.strip()
                print(f"✅ 제목: {job_data['title']}")
            except:
                print("❌ 제목 추출 실패")
                return None

            job_data['url'] = url

            # 카테고리 추출 (URL 또는 페이지에서)
            try:
                category_element = self.driver.find_element(By.XPATH, "//span[@class='category'] | //div[@class='category']")
                job_data['category'] = category_element.text.strip()
            except:
                # URL에서 추출 시도
                if 'backend' in url.lower() or '백엔드' in job_data['title']:
                    job_data['category'] = 'backend'
                elif 'frontend' in url.lower() or '프론트엔드' in job_data['title']:
                    job_data['category'] = 'frontend'
                elif 'fullstack' in url.lower() or '풀스택' in job_data['title']:
                    job_data['category'] = 'fullstack'
                else:
                    job_data['category'] = 'etc'
            print(f"✅ 카테고리: {job_data['category']}")

            # 직무 정보 추출
            job_info_parts = []
            try:
                # 여러 셀렉터 시도
                info_selectors = [
                    "//div[@class='info_box']",
                    "//div[@class='job_info']",
                    "//section[@class='info']",
                    "//div[contains(@class, 'recruit_info')]"
                ]

                for selector in info_selectors:
                    try:
                        info_elements = self.driver.find_elements(By.XPATH, selector)
                        if info_elements:
                            for elem in info_elements:
                                text = elem.text.strip()
                                if text:
                                    job_info_parts.append(text)
                            break
                    except:
                        continue

                if job_info_parts:
                    job_data['job_info'] = '\n'.join(job_info_parts)
                else:
                    job_data['job_info'] = ''
            except:
                job_data['job_info'] = ''

            if job_data['job_info']:
                print(f"✅ 직무 정보: {len(job_data['job_info'])}자")
            else:
                print("⚠️ 직무 정보 없음")

            # 지원 조건 추출
            conditions_parts = []
            try:
                condition_selectors = [
                    "//div[@class='condition']",
                    "//div[@class='requirements']",
                    "//section[@class='condition']",
                    "//div[contains(@class, 'qualification')]"
                ]

                for selector in condition_selectors:
                    try:
                        condition_elements = self.driver.find_elements(By.XPATH, selector)
                        if condition_elements:
                            for elem in condition_elements:
                                text = elem.text.strip()
                                if text:
                                    conditions_parts.append(text)
                            break
                    except:
                        continue

                if conditions_parts:
                    job_data['conditions'] = '\n'.join(conditions_parts)
                else:
                    job_data['conditions'] = ''
            except:
                job_data['conditions'] = ''

            if job_data['conditions']:
                print(f"✅ 지원 조건: {len(job_data['conditions'])}자")
            else:
                print("⚠️ 지원 조건 없음")

            # 등록 정보 추출
            registration_parts = []
            try:
                reg_selectors = [
                    "//div[@class='register_info']",
                    "//div[@class='registration']",
                    "//div[contains(@class, 'deadline')]",
                    "//span[contains(text(), '마감') or contains(text(), '등록')]"
                ]

                for selector in reg_selectors:
                    try:
                        reg_elements = self.driver.find_elements(By.XPATH, selector)
                        if reg_elements:
                            for elem in reg_elements:
                                text = elem.text.strip()
                                if text:
                                    registration_parts.append(text)
                            break
                    except:
                        continue

                if registration_parts:
                    job_data['registration_info'] = '\n'.join(registration_parts)
                else:
                    job_data['registration_info'] = ''
            except:
                job_data['registration_info'] = ''

            if job_data['registration_info']:
                print(f"✅ 등록 정보: {len(job_data['registration_info'])}자")
            else:
                print("⚠️ 등록 정보 없음")

            # company_search_key 생성 (회사명을 정규화)
            job_data['company_search_key'] = job_data['company'].lower().replace(' ', '').replace('\u00A0', '')
            job_data['scraped_at'] = datetime.now()
            job_data['page'] = 1

            return job_data

        except Exception as e:
            print(f"❌ 스크래핑 실패: {e}")
            traceback.print_exc()
            return None

    def check_duplicate(self, url):
        """중복 체크"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT id FROM jobs WHERE url = %s", (url,))
            result = cursor.fetchone()
            cursor.close()
            return result is not None
        except Exception as e:
            print(f"❌ 중복 체크 실패: {e}")
            return False

    def insert_job(self, job_data):
        """jobs 테이블에 삽입"""
        try:
            cursor = self.connection.cursor()

            insert_sql = """
                INSERT INTO jobs
                (company, title, url, category, page, job_info, conditions,
                 registration_info, scraped_at, company_search_key)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            cursor.execute(insert_sql, (
                job_data['company'],
                job_data['title'],
                job_data['url'],
                job_data['category'],
                job_data['page'],
                job_data['job_info'],
                job_data['conditions'],
                job_data['registration_info'],
                job_data['scraped_at'],
                job_data['company_search_key']
            ))

            self.connection.commit()
            job_id = cursor.lastrowid
            cursor.close()

            print(f"\n✅ jobs 테이블에 저장 완료 (ID: {job_id})")
            return job_id

        except Exception as e:
            print(f"\n❌ DB 저장 실패: {e}")
            traceback.print_exc()
            return None

    def run(self, url):
        """메인 실행"""
        print("\n" + "="*60)
        print("📌 특정 채용공고 삽입 프로그램")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.connect_db():
            self.close()
            return False

        # 중복 체크
        print("🔍 중복 체크 중...\n")
        if self.check_duplicate(url):
            print("⚠️ 이미 존재하는 채용공고입니다.")
            self.close()
            return False

        # 스크래핑
        job_data = self.scrape_job(url)

        if not job_data:
            print("\n❌ 채용공고 스크래핑 실패")
            self.close()
            return False

        # 데이터 저장
        print("\n" + "="*60)
        print("💾 DB 저장 중...")
        print("="*60)
        job_id = self.insert_job(job_data)

        if job_id:
            print("\n" + "="*60)
            print("✅ 완료!")
            print(f"   Job ID: {job_id}")
            print(f"   회사: {job_data['company']}")
            print(f"   제목: {job_data['title']}")
            print("="*60 + "\n")

        self.close()
        return job_id is not None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\n" + "="*60)
        print("사용법:")
        print("  python insert_job.py <채용공고_URL>")
        print("\n예시:")
        print("  python insert_job.py https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567")
        print("="*60 + "\n")
        sys.exit(1)

    url = sys.argv[1]

    # URL 검증
    if not url.startswith('http'):
        print("❌ 올바른 URL을 입력하세요 (http:// 또는 https://로 시작)")
        sys.exit(1)

    inserter = JobInserter()
    success = inserter.run(url)

    sys.exit(0 if success else 1)
