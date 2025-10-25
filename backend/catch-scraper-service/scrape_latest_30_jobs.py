"""
Catch.co.kr 최신 채용공고 30건 스크래핑
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

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

BASE_URL = 'https://www.catch.co.kr/'

class LatestJobScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.stats = {
            'total_scraped': 0,
            'total_inserted': 0,
            'duplicates': 0,
            'errors': 0
        }

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
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-software-rasterizer')
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)

            self.driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                "userAgent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

    def navigate_to_recruit_page(self):
        """채용 검색 페이지로 이동"""
        try:
            print("📍 채용 검색 페이지로 이동 중...")
            self.driver.get(f"{BASE_URL}NCS/RecruitSearch")
            time.sleep(3)
            print("✅ 채용 검색 페이지 진입 성공\n")
            return True
        except Exception as e:
            print(f"❌ 페이지 이동 실패: {e}")
            traceback.print_exc()
            return False

    def select_category(self, category_name):
        """카테고리 선택"""
        try:
            print(f"📂 카테고리 선택: {category_name}")

            # 직무 버튼 클릭
            job_category_btn = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bt') and contains(text(), '직무')]"))
            )
            self.driver.execute_script("arguments[0].click();", job_category_btn)
            time.sleep(2)

            # 카테고리 선택
            if category_name == "IT":
                xpath = "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/.."
            else:  # BIGDATA_AI
                xpath = "//button[contains(@class, 'bt')]//span[contains(text(), '빅데이터·AI')]/.."

            category_btn = WebDriverWait(self.driver, 15).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
            self.driver.execute_script("arguments[0].click();", category_btn)
            time.sleep(3)

            print(f"✅ {category_name} 카테고리 선택 완료\n")
            return True
        except Exception as e:
            print(f"❌ 카테고리 선택 실패: {e}")
            traceback.print_exc()
            return False

    def scrape_page_jobs(self, page_num, category):
        """한 페이지의 채용공고 스크래핑"""
        jobs = []
        try:
            time.sleep(2)

            # 테이블이 로드될 때까지 대기
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//tbody//tr"))
            )

            # 테이블 행 가져오기
            rows = self.driver.find_elements(By.XPATH, "//tbody//tr")

            for idx, row in enumerate(rows, 1):
                try:
                    # 회사명
                    company_elem = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]")
                    company = company_elem.text.strip()

                    # 제목 및 URL
                    title_elem = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]")
                    title = title_elem.text.strip()

                    link_elem = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                    url = link_elem.get_attribute('href')

                    # 직무정보
                    job_info_elems = row.find_elements(By.XPATH, ".//p[contains(@class, 'job')]//span")
                    job_info = [elem.text.strip() for elem in job_info_elems if elem.text.strip()]

                    # 조건
                    conditions_elems = row.find_elements(By.XPATH, ".//p[contains(@class, 'cond')]")
                    conditions = [elem.text.strip() for elem in conditions_elems if elem.text.strip()]

                    # 등록정보
                    reg_info_elems = row.find_elements(By.XPATH, ".//p[contains(@class, 'date2') or contains(@class, 'num_dday')]")
                    registration_info = [elem.text.strip() for elem in reg_info_elems if elem.text.strip()]

                    if company and title and url:
                        jobs.append({
                            'company': company,
                            'title': title,
                            'url': url,
                            'job_info': job_info,
                            'conditions': conditions,
                            'registration_info': registration_info,
                            'page': page_num,
                            'category': category
                        })

                except Exception as e:
                    continue

            return jobs
        except Exception as e:
            print(f"  ⚠️ 페이지 {page_num} 스크래핑 실패: {e}")
            return jobs

    def insert_jobs(self, jobs):
        """채용공고를 DB에 저장"""
        if not jobs:
            return 0

        cursor = self.connection.cursor()
        inserted = 0

        for job in jobs:
            try:
                # 중복 체크
                cursor.execute(
                    "SELECT id FROM jobs WHERE url = %s AND category = %s",
                    (job['url'], job['category'])
                )

                if cursor.fetchone():
                    self.stats['duplicates'] += 1
                    continue

                # 회사명 정규화
                company_search_key = job['company'].lower().replace(' ', '').replace('\u00A0', '')

                # INSERT
                cursor.execute("""
                    INSERT INTO jobs
                    (company, title, url, category, page, job_info, conditions,
                     registration_info, scraped_at, company_search_key)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    job['company'],
                    job['title'],
                    job['url'],
                    job['category'],
                    job['page'],
                    json.dumps(job['job_info'], ensure_ascii=False),
                    json.dumps(job['conditions'], ensure_ascii=False),
                    json.dumps(job['registration_info'], ensure_ascii=False),
                    datetime.now(),
                    company_search_key
                ))
                inserted += 1
                self.stats['total_inserted'] += 1

            except Exception as e:
                self.stats['errors'] += 1
                continue

        self.connection.commit()
        cursor.close()
        return inserted

    def go_to_next_page(self):
        """다음 페이지로 이동"""
        try:
            next_btn = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//p[contains(@class, 'page3')]//a[contains(@class, 'ico next')]"))
            )
            self.driver.execute_script("arguments[0].click();", next_btn)
            time.sleep(3)
            return True
        except Exception as e:
            return False

    def scrape_category(self, category_name, category_code, max_pages=2):
        """특정 카테고리의 채용공고 스크래핑 (최대 30건)"""
        print(f"\n{'='*60}")
        print(f"🔍 {category_name} 카테고리 스크래핑 시작")
        print(f"{'='*60}\n")

        if not self.select_category(category_code):
            return

        page_num = 1
        category_scraped = 0

        while page_num <= max_pages and self.stats['total_scraped'] < 30:
            print(f"📄 페이지 {page_num} 스크래핑 중...")

            jobs = self.scrape_page_jobs(page_num, category_code)

            if jobs:
                inserted = self.insert_jobs(jobs)
                category_scraped += len(jobs)
                self.stats['total_scraped'] += len(jobs)

                print(f"  ✅ {len(jobs)}건 수집, {inserted}건 저장 (중복: {len(jobs)-inserted}건)")
                print(f"  📊 전체 진행: {self.stats['total_scraped']}/30건\n")
            else:
                print(f"  ⚠️ 데이터 없음\n")
                break

            # 30건 도달 시 중단
            if self.stats['total_scraped'] >= 30:
                print(f"\n✅ 목표 30건 도달! 스크래핑 종료\n")
                break

            # 다음 페이지로 이동
            if not self.go_to_next_page():
                print(f"  ⏭️ 다음 페이지 없음\n")
                break

            page_num += 1

        print(f"\n{category_name} 카테고리: {category_scraped}건 수집 완료\n")

    def run(self):
        """메인 실행"""
        print("\n" + "="*60)
        print("🚀 Catch.co.kr 최신 채용공고 30건 스크래핑 시작")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.connect_db():
            return False

        if not self.navigate_to_recruit_page():
            return False

        # IT개발 카테고리 스크래핑 (최대 2페이지)
        self.scrape_category("IT개발", "IT", max_pages=2)

        # 30건 미만이면 빅데이터·AI 카테고리도 스크래핑
        if self.stats['total_scraped'] < 30:
            self.navigate_to_recruit_page()
            remaining = 30 - self.stats['total_scraped']
            print(f"\n📊 남은 목표: {remaining}건\n")
            self.scrape_category("빅데이터·AI", "BIGDATA_AI", max_pages=2)

        # 최종 통계
        print(f"\n{'='*60}")
        print("📊 최종 통계")
        print(f"{'='*60}")
        print(f"총 수집: {self.stats['total_scraped']}건")
        print(f"신규 저장: {self.stats['total_inserted']}건")
        print(f"중복 제외: {self.stats['duplicates']}건")
        print(f"오류: {self.stats['errors']}건")
        print(f"{'='*60}\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = LatestJobScraper()
    scraper.run()
