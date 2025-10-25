"""
Jobs 테이블 기반 통합 스크래핑
- 기출문제 (catch_interview_questions)
- 회사정보 업데이트 (catch_companies)
- 회사리뷰 추가 (catch_reviews)
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

class ComprehensiveScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.stats = {
            'companies_processed': 0,
            'companies_updated': 0,
            'interview_questions_inserted': 0,
            'reviews_inserted': 0,
            'errors': 0
        }

    def init_driver(self):
        """Chrome 드라이버 초기화"""
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless=new')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--blink-settings=imagesEnabled=false')

            prefs = {'profile.default_content_setting_values': {'images': 2}}
            chrome_options.add_experimental_option('prefs', prefs)
            chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(30)
            self.driver.implicitly_wait(5)

            print("✅ Chrome 드라이버 초기화 성공\n")
            return True
        except Exception as e:
            print(f"❌ Chrome 드라이버 초기화 실패: {e}")
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

    def get_companies_from_jobs(self):
        """jobs 테이블에서 고유 회사 목록 가져오기"""
        cursor = self.connection.cursor()
        cursor.execute("""
            SELECT DISTINCT company
            FROM jobs
            ORDER BY company
        """)
        companies = [row[0] for row in cursor.fetchall()]
        cursor.close()
        print(f"📊 Jobs 테이블에서 {len(companies)}개 고유 회사 발견\n")
        return companies

    def scrape_company_data(self, company_name):
        """회사별 모든 데이터 스크래핑"""
        print(f"\n{'='*60}")
        print(f"🏢 {company_name} 처리 중...")
        print(f"{'='*60}")

        try:
            # 회사 검색
            search_url = f"https://www.catch.co.kr/NCS/ComSearch?SearchWord={company_name}"
            self.driver.get(search_url)
            time.sleep(2)

            wait = WebDriverWait(self.driver, 10)

            try:
                # 회사 링크 찾기
                company_link = wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//a[contains(@href, 'ComInfo')]"))
                )
                company_url = company_link.get_attribute('href')
                print(f"  ✅ 회사 페이지 발견: {company_url}")

                # 1. 회사 정보 업데이트
                self.scrape_and_update_company_info(company_name, company_url)

                # 2. 기출문제 스크래핑
                self.scrape_interview_questions(company_name, company_url)

                # 3. 리뷰 스크래핑
                self.scrape_reviews(company_name, company_url)

                self.stats['companies_processed'] += 1

            except Exception as e:
                print(f"  ⚠️ 회사 페이지를 찾을 수 없음")
                self.stats['errors'] += 1

        except Exception as e:
            print(f"  ❌ 오류: {e}")
            self.stats['errors'] += 1

    def scrape_and_update_company_info(self, company_name, company_url):
        """회사 정보 스크래핑 및 업데이트"""
        try:
            self.driver.get(company_url)
            time.sleep(2)

            company_info = {
                'name': company_name,
                'company_url': company_url
            }

            # 정보 추출
            try:
                company_info['industry'] = self.driver.find_element(
                    By.XPATH, "//span[contains(@class, 'industry')]"
                ).text.strip()
            except: company_info['industry'] = ''

            try:
                company_info['company_type'] = self.driver.find_element(
                    By.XPATH, "//div[@class='item type1']//p[@class='t1']"
                ).text.strip()
            except: company_info['company_type'] = ''

            try:
                company_info['employee_count'] = self.driver.find_element(
                    By.XPATH, "//div[@class='item type2']//p[@class='t1']"
                ).text.strip()
            except: company_info['employee_count'] = ''

            try:
                company_info['revenue'] = self.driver.find_element(
                    By.XPATH, "//div[@class='item type3']//p[@class='t1']"
                ).text.strip()
            except: company_info['revenue'] = ''

            try:
                company_info['location'] = self.driver.find_element(
                    By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td"
                ).text.replace("지도", "").strip()
            except: company_info['location'] = ''

            try:
                company_info['ceo'] = self.driver.find_element(
                    By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td"
                ).text.strip()
            except: company_info['ceo'] = ''

            try:
                company_info['establishment_date'] = self.driver.find_element(
                    By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td"
                ).text.strip()
            except: company_info['establishment_date'] = ''

            # DB에 저장 또는 업데이트
            cursor = self.connection.cursor()

            # 존재 여부 확인
            cursor.execute("SELECT id FROM catch_companies WHERE name = %s", (company_name,))
            existing = cursor.fetchone()

            if existing:
                # 업데이트
                update_sql = """
                    UPDATE catch_companies
                    SET industry = %s, company_type = %s, location = %s,
                        employee_count = %s, revenue = %s, ceo = %s,
                        establishment_date = %s, company_url = %s, updated_at = %s
                    WHERE name = %s
                """
                cursor.execute(update_sql, (
                    company_info.get('industry', ''),
                    company_info.get('company_type', ''),
                    company_info.get('location', ''),
                    company_info.get('employee_count', ''),
                    company_info.get('revenue', ''),
                    company_info.get('ceo', ''),
                    company_info.get('establishment_date', ''),
                    company_url,
                    datetime.now(),
                    company_name
                ))
                print(f"  ✅ 회사 정보 업데이트")
                self.stats['companies_updated'] += 1
            else:
                # 신규 삽입
                insert_sql = """
                    INSERT INTO catch_companies
                    (name, industry, company_type, location, employee_count, revenue,
                     ceo, establishment_date, company_url, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                now = datetime.now()
                cursor.execute(insert_sql, (
                    company_name,
                    company_info.get('industry', ''),
                    company_info.get('company_type', ''),
                    company_info.get('location', ''),
                    company_info.get('employee_count', ''),
                    company_info.get('revenue', ''),
                    company_info.get('ceo', ''),
                    company_info.get('establishment_date', ''),
                    company_url,
                    now, now
                ))
                print(f"  ✅ 회사 정보 신규 저장")

            self.connection.commit()
            cursor.close()

        except Exception as e:
            print(f"  ⚠️ 회사 정보 처리 실패: {e}")

    def scrape_interview_questions(self, company_name, company_url):
        """기출문제 스크래핑"""
        try:
            # company_url을 InterviewReview로 변환
            interview_url = company_url.replace('/ComInfo/', '/InterviewReview/') + "?tab=question"

            self.driver.get(interview_url)
            time.sleep(3)

            # JavaScript로 질문 추출
            questions = self.driver.execute_script("""
                const questions = [];
                const questionElements = document.querySelectorAll('.interview_previous2 li');

                questionElements.forEach((li) => {
                    const questionText = li.querySelector('p.que .txt');
                    const cateElements = li.querySelectorAll('p.cate span');

                    if (questionText) {
                        questions.push({
                            question: questionText.textContent.trim().replace('Q.', '').trim(),
                            period: cateElements[0] ? cateElements[0].textContent.trim() : '',
                            position: cateElements[1] ? cateElements[1].textContent.trim() : '',
                            experience: cateElements[2] ? cateElements[2].textContent.trim() : ''
                        });
                    }
                });

                return questions;
            """) or []

            if questions:
                cursor = self.connection.cursor()

                # company_id 가져오기
                cursor.execute("SELECT id FROM catch_companies WHERE name = %s", (company_name,))
                company_id_row = cursor.fetchone()
                company_id = company_id_row[0] if company_id_row else None

                inserted = 0
                for q in questions:
                    try:
                        # 중복 체크
                        cursor.execute("""
                            SELECT id FROM catch_interview_questions
                            WHERE company_name = %s AND question = %s
                        """, (company_name, q['question']))

                        if not cursor.fetchone():
                            cursor.execute("""
                                INSERT INTO catch_interview_questions
                                (company_id, company_name, question, period, position, experience, company_url, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                company_id, company_name, q['question'],
                                q.get('period', ''), q.get('position', ''),
                                q.get('experience', ''), company_url, datetime.now()
                            ))
                            inserted += 1

                    except:
                        continue

                self.connection.commit()
                cursor.close()

                print(f"  ✅ 기출문제 {inserted}개 저장")
                self.stats['interview_questions_inserted'] += inserted
            else:
                print(f"  ⏭️ 기출문제 없음")

        except Exception as e:
            print(f"  ⚠️ 기출문제 스크래핑 실패: {e}")

    def scrape_reviews(self, company_name, company_url):
        """리뷰 스크래핑"""
        try:
            # Review 탭으로 이동
            review_url = company_url.replace('/ComInfo/', '/Review/')

            self.driver.get(review_url)
            time.sleep(2)

            # 리뷰 요소 찾기
            review_elements = self.driver.find_elements(
                By.XPATH, "//div[contains(@class, 'review-item') or contains(@class, 'rv_item')]"
            )

            if review_elements:
                cursor = self.connection.cursor()

                # company_id 가져오기
                cursor.execute("SELECT id FROM catch_companies WHERE name = %s", (company_name,))
                company_id_row = cursor.fetchone()
                company_id = company_id_row[0] if company_id_row else None

                inserted = 0
                for elem in review_elements[:10]:  # 최대 10개
                    try:
                        reviewer_info = ''
                        review_date = ''
                        rating = 0.0
                        pros = ''
                        cons = ''

                        try:
                            reviewer_info = elem.find_element(
                                By.XPATH, ".//span[contains(@class, 'reviewer') or contains(@class, 'info')]"
                            ).text.strip()
                        except: pass

                        try:
                            review_date = elem.find_element(
                                By.XPATH, ".//span[contains(@class, 'date')]"
                            ).text.strip()
                        except: pass

                        try:
                            rating_text = elem.find_element(
                                By.XPATH, ".//span[contains(@class, 'rating') or contains(@class, 'score')]"
                            ).text.strip()
                            rating = float(rating_text.replace('점', '').strip())
                        except: pass

                        try:
                            pros = elem.find_element(
                                By.XPATH, ".//dd[contains(text(), '장점') or preceding-sibling::dt[contains(text(), '장점')]]"
                            ).text.strip()
                        except: pass

                        try:
                            cons = elem.find_element(
                                By.XPATH, ".//dd[contains(text(), '단점') or preceding-sibling::dt[contains(text(), '단점')]]"
                            ).text.strip()
                        except: pass

                        if pros or cons:
                            cursor.execute("""
                                INSERT INTO catch_reviews
                                (company_id, company_name, reviewer_info, review_date, rating, pros, cons, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                company_id, company_name, reviewer_info, review_date,
                                rating if rating > 0 else None, pros, cons, datetime.now()
                            ))
                            inserted += 1

                    except:
                        continue

                self.connection.commit()
                cursor.close()

                print(f"  ✅ 리뷰 {inserted}개 저장")
                self.stats['reviews_inserted'] += inserted
            else:
                print(f"  ⏭️ 리뷰 없음")

        except Exception as e:
            print(f"  ⚠️ 리뷰 스크래핑 실패: {e}")

    def run(self, max_companies=None):
        """메인 실행"""
        print("\n" + "="*60)
        print("🚀 통합 스크래핑 시작")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.connect_db():
            return False

        # jobs 테이블에서 회사 목록 가져오기
        companies = self.get_companies_from_jobs()

        if max_companies:
            companies = companies[:max_companies]

        print(f"처리할 회사: {len(companies)}개\n")

        for i, company_name in enumerate(companies, 1):
            print(f"\n[{i}/{len(companies)}]")
            self.scrape_company_data(company_name)
            time.sleep(2)  # Rate limiting

        # 통계 출력
        print(f"\n{'='*60}")
        print("📊 최종 통계")
        print(f"{'='*60}")
        print(f"처리된 회사: {self.stats['companies_processed']}개")
        print(f"업데이트된 회사 정보: {self.stats['companies_updated']}개")
        print(f"수집된 기출문제: {self.stats['interview_questions_inserted']}개")
        print(f"수집된 리뷰: {self.stats['reviews_inserted']}개")
        print(f"오류: {self.stats['errors']}개")
        print(f"{'='*60}\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = ComprehensiveScraper()

    # 최대 50개 회사만 처리 (테스트용, None으로 설정하면 전체)
    scraper.run(max_companies=50)
