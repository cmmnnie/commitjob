"""
Jobs 테이블의 모든 회사에 대해 Catch.co.kr에서 면접 기출질문 스크래핑
-> catch_interview_questions 테이블에 저장
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

DB_CONFIG = {
    'host': 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    'port': 3306,
    'user': 'appuser',
    'password': 'Woolim114!',
    'database': 'appdb',
    'charset': 'utf8mb4'
}

# Catch.co.kr 로그인 정보
CATCH_LOGIN = {
    'id': 'test0137',
    'password': '#test0808'
}

class InterviewQuestionsScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.is_logged_in = False
        self.stats = {
            'total_companies': 0,
            'processed': 0,
            'inserted_questions': 0,
            'companies_with_questions': 0,
            'companies_without_questions': 0,
            'not_found': 0,
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

    def login(self):
        """Catch.co.kr 로그인"""
        try:
            print(f"🔐 Catch.co.kr 로그인 시도 (사용자: {CATCH_LOGIN['id']})\n")

            # 홈페이지로 이동
            self.driver.get("https://www.catch.co.kr/")
            time.sleep(2)

            wait = WebDriverWait(self.driver, 15)

            # 로그인 버튼 찾기 및 클릭
            try:
                login_button = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//a[contains(text(), '로그인')]"))
                )
                self.driver.execute_script("arguments[0].click();", login_button)
                print("  로그인 버튼 클릭 완료")
            except:
                print("  ⚠️ 로그인 버튼을 찾을 수 없습니다 (이미 로그인 상태일 수 있음)")
                self.is_logged_in = True
                return True

            time.sleep(2)

            # 로그인 폼이 나타날 때까지 대기
            try:
                wait.until(EC.presence_of_element_located((By.ID, "id_login")))
            except:
                print("  ⚠️ 로그인 폼을 찾을 수 없습니다 (이미 로그인 상태일 수 있음)")
                self.is_logged_in = True
                return True

            # 아이디 입력
            id_input = self.driver.find_element(By.ID, "id_login")
            id_input.clear()
            id_input.send_keys(CATCH_LOGIN['id'])

            # 비밀번호 입력
            from selenium.webdriver.common.keys import Keys
            pw_input = self.driver.find_element(By.ID, "pw_login")
            pw_input.clear()
            pw_input.send_keys(CATCH_LOGIN['password'])

            # Enter 키로 제출
            pw_input.send_keys(Keys.RETURN)
            print("  로그인 정보 입력 및 제출 완료")

            # 로그인 성공 확인
            time.sleep(3)
            wait.until(
                lambda driver: "Login" not in driver.current_url or
                len(driver.find_elements(By.ID, "id_login")) == 0
            )
            self.is_logged_in = True
            print(f"✅ Catch.co.kr 로그인 성공\n")
            return True

        except Exception as e:
            print(f"❌ 로그인 실패: {e}")
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

    def get_companies_from_jobs(self):
        """jobs 테이블에서 catch_interview_questions에 없는 회사 목록 가져오기 (최신 채용공고 순)"""
        cursor = self.connection.cursor()

        # catch_interview_questions에 없는 회사들을 최신 채용공고 날짜 순으로 조회
        cursor.execute("""
            SELECT j2.company FROM (
                SELECT j1.company, MAX(j1.scraped_at) AS scraped_at
                FROM jobs j1
                WHERE NOT EXISTS (
                    SELECT 1 FROM catch_interview_questions ciq WHERE trim(ciq.company) = trim(j1.company)
                )
                GROUP BY j1.company
            ) j2
            ORDER BY j2.scraped_at DESC
        """)

        companies = [row[0] for row in cursor.fetchall()]
        cursor.close()

        self.stats['total_companies'] = len(companies)
        print(f"📊 Jobs 테이블에서 {len(companies)}개 미등록 회사 발견 (최신 채용공고 순)\n")
        return companies

    def generate_search_terms(self, company_name):
        """단계적 검색어 생성 (예: '뱅크샐러드 코리아' → ['뱅크샐러드 코리아', '뱅크샐러드'])"""
        terms = [company_name.strip()]

        # 공백으로 구분된 경우, 마지막 단어를 제거한 버전 추가
        parts = company_name.strip().split()
        if len(parts) > 1:
            # 마지막 단어 제거
            terms.append(' '.join(parts[:-1]))

        # '코리아', 'Korea', '인터내셔널' 등의 접미사 제거
        import re
        suffixes = ['코리아', 'korea', '인터내셔널', 'international', '홀딩스', 'holdings']
        for suffix in suffixes:
            pattern = re.compile(r'\s*' + suffix + r'\s*$', re.IGNORECASE)
            if pattern.search(company_name):
                shortened = pattern.sub('', company_name).strip()
                if shortened and shortened not in terms:
                    terms.append(shortened)

        return terms

    def search_company(self, company_name):
        """Catch.co.kr에서 회사 검색"""
        try:
            search_url = "https://www.catch.co.kr/Comp/CompMajor/SearchPage"

            self.driver.get(search_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)

            # 검색어 정리: 앞뒤 공백 제거
            search_term = company_name.strip()

            # 검색창 찾기
            search_input = wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='궁금한 기업을 검색해 보세요.']"))
            )
            search_input.clear()
            search_input.send_keys(search_term)

            # 검색 버튼 클릭
            search_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@class='bt_sch']"))
            )
            search_button.click()

            # 검색 결과 로딩 대기
            time.sleep(3)

            # 검색 결과에서 정확한 기업명 찾기
            company_links = wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='list_corp_round']//li//p[@class='name']//a"))
            )

            # 정규화 함수: 띄어쓰기 제거, 소문자 변환, 특수문자 제거
            def normalize_name(name):
                normalized = name.replace('\u00A0', '').replace(' ', '').lower()
                normalized = normalized.replace('(주)', '').replace('주식회사', '')
                normalized = normalized.replace('㈜', '').replace('()', '')
                return normalized

            normalized_input = normalize_name(company_name.strip())
            target_company_url = None

            # 디버깅: 검색 결과 출력
            print(f"  🔍 검색어: '{company_name.strip()}' (정규화: '{normalized_input}')")
            print(f"  📋 검색 결과 {len(company_links)}개:")
            for i, link in enumerate(company_links[:5]):  # 상위 5개만 출력
                print(f"     {i+1}. {link.text.strip()} (정규화: '{normalize_name(link.text.strip())}')")

            # 1차 시도: 정규화된 이름으로 정확 매칭
            for link in company_links:
                company_text = link.text.strip()
                if normalize_name(company_text) == normalized_input:
                    target_company_url = link.get_attribute('href')
                    print(f"  ✅ 정확한 기업명 매칭: '{company_name.strip()}' → '{company_text}'")
                    break

            # 2차 시도: 정규화된 이름으로 부분 매칭 (정확한 매칭 실패 시)
            if not target_company_url:
                for link in company_links:
                    company_text = link.text.strip()
                    normalized_result = normalize_name(company_text)
                    if normalized_input in normalized_result or normalized_result in normalized_input:
                        target_company_url = link.get_attribute('href')
                        print(f"  ✅ 부분 매칭으로 기업 발견: '{company_name.strip()}' → '{company_text}'")
                        break

            if not target_company_url:
                print(f"  ❌ 매칭 실패: 검색 결과에서 '{company_name.strip()}'와 일치하는 기업을 찾을 수 없음")

            return target_company_url

        except Exception as e:
            print(f"  ⚠️ 검색 실패: {e}")
            return None

    def scrape_interview_questions(self, company_url, max_questions=20):
        """회사별 면접 기출질문 스크래핑"""
        try:
            # URL을 InterviewReview 경로로 변환하고 ?tab=question 파라미터 추가
            interview_review_url = company_url.replace('/CompSummary/', '/InterviewReview/') + "?tab=question"

            self.driver.get(interview_review_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)

            # 페이지 로딩 대기
            time.sleep(2)

            # 면접 질문 수집
            interview_questions = []

            try:
                # JavaScript로 면접 질문 추출 (기출질문 탭 - interview_previous2)
                questions = self.driver.execute_script(
                    """
                    const questions = [];
                    const questionElements = document.querySelectorAll('.interview_previous2 li');

                    questionElements.forEach((li) => {
                        const questionText = li.querySelector('p.que .txt');
                        const cateElements = li.querySelectorAll('p.cate span');

                        if (questionText) {
                            const period = cateElements[0] ? cateElements[0].textContent.trim() : '';
                            const position = cateElements[1] ? cateElements[1].textContent.trim() : '';
                            const experience = cateElements[2] ? cateElements[2].textContent.trim() : '';

                            questions.push({
                                question: questionText.textContent.trim().replace('Q.', '').trim(),
                                period: period,
                                position: position,
                                experience: experience
                            });
                        }
                    });

                    return questions;
                    """
                ) or []

                # 최대 개수로 제한
                interview_questions = questions[:max_questions]

            except Exception as e:
                print(f"  ⚠️ JavaScript 추출 실패: {e}")
                # 대체 XPath로 시도
                try:
                    question_elements = wait.until(
                        EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='interview_previous2']//li"))
                    )

                    for elem in question_elements[:max_questions]:
                        try:
                            question = elem.find_element(By.CSS_SELECTOR, "p.que .txt").text.strip()
                            period = ""
                            position = ""
                            experience = ""

                            try:
                                cate_elements = elem.find_elements(By.CSS_SELECTOR, "p.cate span")
                                if len(cate_elements) > 0:
                                    period = cate_elements[0].text.strip()
                                if len(cate_elements) > 1:
                                    position = cate_elements[1].text.strip()
                                if len(cate_elements) > 2:
                                    experience = cate_elements[2].text.strip()
                            except:
                                pass

                            interview_questions.append({
                                "question": question.replace('Q.', '').strip(),
                                "period": period,
                                "position": position,
                                "experience": experience
                            })

                        except Exception as elem_error:
                            continue

                except Exception as fallback_error:
                    print(f"  ⚠️ 대체 방법도 실패: {fallback_error}")

            return interview_questions

        except Exception as e:
            print(f"  ⚠️ 기출질문 추출 실패: {e}")
            return []

    def save_interview_questions(self, company_name, company_url, questions):
        """면접 질문을 DB에 저장"""
        try:
            cursor = self.connection.cursor()

            # catch_companies 테이블에서 company_id 조회
            cursor.execute("SELECT id FROM catch_companies WHERE company = %s", (company_name,))
            company_result = cursor.fetchone()
            company_id = company_result[0] if company_result else None

            inserted_count = 0

            for q in questions:
                # 중복 체크 (컬럼명: company_name이 아니라 company)
                cursor.execute("""
                    SELECT id FROM catch_interview_questions
                    WHERE company = %s AND question = %s
                """, (company_name, q['question']))

                if cursor.fetchone():
                    continue  # 이미 존재하는 질문은 건너뛰기

                # 신규 삽입 (컬럼명: company_name이 아니라 company)
                insert_sql = """
                    INSERT INTO catch_interview_questions
                    (company_id, company, question, period, position, experience, company_url, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(insert_sql, (
                    company_id,
                    company_name,
                    q['question'],
                    q.get('period', ''),
                    q.get('position', ''),
                    q.get('experience', ''),
                    company_url,
                    datetime.now()
                ))
                inserted_count += 1

            self.connection.commit()
            cursor.close()

            if inserted_count > 0:
                print(f"  ✅ {inserted_count}개 질문 저장 완료")
                self.stats['inserted_questions'] += inserted_count
                self.stats['companies_with_questions'] += 1
            else:
                print(f"  ℹ️ 중복된 질문들이거나 이미 저장되어 있습니다")

            return inserted_count

        except Exception as e:
            print(f"  ⚠️ DB 저장 실패: {e}")
            traceback.print_exc()
            return 0

    def process_company(self, company_name, index, total):
        """개별 회사 처리"""
        print(f"\n[{index}/{total}] 🏢 {company_name}")
        print("-" * 60)

        try:
            # 단계적 검색어 생성
            search_terms = self.generate_search_terms(company_name)
            print(f"  🔍 검색어 목록: {', '.join(search_terms)}")

            company_url = None
            # 각 검색어로 순차 시도
            for i, search_term in enumerate(search_terms):
                if i > 0:
                    print(f"  🔄 재시도 ({i}/{len(search_terms) - 1}): '{search_term}'")

                company_url = self.search_company(search_term)

                if company_url:
                    print(f"  ✅ 검색 성공: '{search_term}'")
                    break

            if not company_url:
                print(f"  ⚠️ Catch.co.kr에서 찾을 수 없음 (시도한 검색어: {', '.join(search_terms)})")
                self.stats['not_found'] += 1
                self.stats['processed'] += 1
                return

            # 면접 질문 스크래핑
            questions = self.scrape_interview_questions(company_url, max_questions=20)

            if not questions or len(questions) == 0:
                print(f"  ℹ️ 기출질문이 없습니다")
                self.stats['companies_without_questions'] += 1
                self.stats['processed'] += 1
                return

            print(f"  ✅ {len(questions)}개 기출질문 발견")

            # DB에 저장
            saved_count = self.save_interview_questions(company_name, company_url, questions)

            if saved_count > 0:
                self.stats['processed'] += 1
            else:
                self.stats['processed'] += 1

        except Exception as e:
            print(f"  ❌ 처리 실패: {e}")
            traceback.print_exc()
            self.stats['errors'] += 1
            self.stats['processed'] += 1

    def run_single_company(self, company_name):
        """단일 회사 면접질문 스크래핑"""
        print("\n" + "="*60)
        print(f"🚀 단일 회사 면접질문 스크래핑 시작: {company_name}")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.login():
            self.close()
            return False

        if not self.connect_db():
            self.close()
            return False

        # 단일 회사 처리
        self.process_company(company_name, 1, 1)

        # 최종 통계
        print(f"\n{'='*60}")
        print("📊 스크래핑 완료")
        print(f"{'='*60}")
        print(f"회사: {company_name}")
        print(f"처리 완료: {self.stats['processed']}개")
        print(f"기출질문이 있는 회사: {self.stats['companies_with_questions']}개")
        print(f"저장된 질문 수: {self.stats['inserted_questions']}개")
        print(f"기출질문이 없는 회사: {self.stats['companies_without_questions']}개")
        print(f"찾을 수 없음: {self.stats['not_found']}개")
        print(f"오류: {self.stats['errors']}개")
        print(f"{'='*60}\n")

        self.close()
        return True

    def run(self):
        """메인 실행"""
        print("\n" + "="*60)
        print("🚀 면접 기출질문 스크래핑 시작")
        print("   대상: Jobs 테이블 중 catch_interview_questions에 없는 회사만")
        print("   순서: 최신 채용공고의 회사부터 우선 처리")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.login():
            self.close()
            return False

        if not self.connect_db():
            self.close()
            return False

        # 회사 목록 가져오기
        companies = self.get_companies_from_jobs()

        # 각 회사 처리
        for idx, company_name in enumerate(companies, 1):
            self.process_company(company_name, idx, len(companies))

            # 진행 상황 출력
            if idx % 10 == 0:
                print(f"\n{'='*60}")
                print(f"📊 중간 통계 ({idx}/{len(companies)})")
                print(f"{'='*60}")
                print(f"처리 완료: {self.stats['processed']}개")
                print(f"기출질문이 있는 회사: {self.stats['companies_with_questions']}개")
                print(f"저장된 질문 수: {self.stats['inserted_questions']}개")
                print(f"기출질문이 없는 회사: {self.stats['companies_without_questions']}개")
                print(f"찾을 수 없음: {self.stats['not_found']}개")
                print(f"오류: {self.stats['errors']}개")
                print(f"{'='*60}\n")

            time.sleep(1)  # Rate limiting

        # 최종 통계
        print(f"\n{'='*60}")
        print("📊 최종 통계")
        print(f"{'='*60}")
        print(f"전체 회사: {self.stats['total_companies']}개")
        print(f"처리 완료: {self.stats['processed']}개")
        print(f"기출질문이 있는 회사: {self.stats['companies_with_questions']}개")
        print(f"저장된 질문 수: {self.stats['inserted_questions']}개")
        print(f"기출질문이 없는 회사: {self.stats['companies_without_questions']}개")
        print(f"찾을 수 없음: {self.stats['not_found']}개")
        print(f"오류: {self.stats['errors']}개")
        print(f"{'='*60}\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = InterviewQuestionsScraper()

    # Command line argument로 특정 회사명이 전달된 경우 단일 회사만 스크래핑
    if len(sys.argv) > 1:
        company_name = ' '.join(sys.argv[1:])  # 회사명에 공백이 포함될 수 있으므로 join
        scraper.run_single_company(company_name)
    else:
        scraper.run()
