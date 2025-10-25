"""
면접 기출질문 스크래핑 테스트 - 1개 회사만
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
from selenium.webdriver.common.keys import Keys
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

CATCH_LOGIN = {
    'id': 'test0137',
    'password': '#test0808'
}

# 테스트할 회사
TEST_COMPANY = '카카오'

class TestScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.is_logged_in = False

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
            login_button = wait.until(
                EC.presence_of_element_located((By.XPATH, "//a[contains(text(), '로그인')]"))
            )
            self.driver.execute_script("arguments[0].click();", login_button)
            print("로그인 버튼 클릭 완료")

            time.sleep(2)

            # 로그인 폼이 나타날 때까지 대기
            wait.until(EC.presence_of_element_located((By.ID, "id_login")))

            # 아이디 입력
            id_input = self.driver.find_element(By.ID, "id_login")
            id_input.clear()
            id_input.send_keys(CATCH_LOGIN['id'])

            # 비밀번호 입력
            pw_input = self.driver.find_element(By.ID, "pw_login")
            pw_input.clear()
            pw_input.send_keys(CATCH_LOGIN['password'])

            # Enter 키로 제출
            pw_input.send_keys(Keys.RETURN)
            print("로그인 정보 입력 및 제출 완료")

            # 로그인 성공 확인
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

    def search_company(self, company_name):
        """회사 검색"""
        try:
            print(f"🔍 회사 검색: {company_name}")
            search_url = "https://www.catch.co.kr/Comp/CompMajor/SearchPage"

            self.driver.get(search_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)

            # 검색창 찾기
            search_input = wait.until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='궁금한 기업을 검색해 보세요.']"))
            )
            search_input.clear()
            search_input.send_keys(company_name)

            # 검색 버튼 클릭
            search_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[@class='bt_sch']"))
            )
            search_button.click()

            # 검색 결과 로딩 대기
            time.sleep(3)

            # 검색 결과에서 기업명 찾기
            company_links = wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='list_corp_round']//li//p[@class='name']//a"))
            )

            def normalize_name(name):
                return name.replace('\u00A0', '').replace(' ', '').lower()

            normalized_input = normalize_name(company_name)
            target_company_url = None

            for link in company_links:
                company_text = link.text.strip()
                if normalize_name(company_text) == normalized_input:
                    target_company_url = link.get_attribute('href')
                    print(f"✅ 기업 발견: '{company_name}' → '{company_text}'")
                    print(f"✅ URL: {target_company_url}\n")
                    break

            return target_company_url

        except Exception as e:
            print(f"❌ 검색 실패: {e}")
            traceback.print_exc()
            return None

    def scrape_interview_questions(self, company_url):
        """면접 기출질문 스크래핑"""
        try:
            print(f"📋 면접 기출질문 페이지 이동...")
            # URL을 InterviewReview 경로로 변환
            interview_review_url = company_url.replace('/CompSummary/', '/InterviewReview/') + "?tab=question"
            print(f"📋 URL: {interview_review_url}\n")

            self.driver.get(interview_review_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)
            time.sleep(2)

            interview_questions = []

            try:
                # JavaScript로 면접 질문 추출
                print("📝 JavaScript로 질문 추출 시도...")
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

                interview_questions = questions[:20]
                print(f"✅ JavaScript로 {len(interview_questions)}개 질문 추출 성공\n")

            except Exception as e:
                print(f"⚠️ JavaScript 추출 실패: {e}")
                print("XPath로 재시도...\n")

                # XPath로 재시도
                try:
                    question_elements = wait.until(
                        EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='interview_previous2']//li"))
                    )
                    print(f"찾은 요소 개수: {len(question_elements)}")

                    for elem in question_elements[:20]:
                        try:
                            question = elem.find_element(By.XPATH, ".//p[@class='que']//span[@class='txt']").text.strip()
                            period = ""
                            position = ""
                            experience = ""

                            try:
                                period = elem.find_element(By.XPATH, ".//p[@class='date']//span[@class='txt']").text.strip()
                            except:
                                pass

                            try:
                                position = elem.find_element(By.XPATH, ".//p[@class='role']//span[@class='txt']").text.strip()
                            except:
                                pass

                            try:
                                experience = elem.find_element(By.XPATH, ".//p[@class='dday']//span[@class='txt']").text.strip()
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

                    print(f"✅ XPath로 {len(interview_questions)}개 질문 추출 성공\n")

                except Exception as fallback_error:
                    print(f"❌ XPath도 실패: {fallback_error}\n")

            # 질문 내용 출력
            if interview_questions:
                print("="*60)
                print("추출된 질문 목록:")
                print("="*60)
                for i, q in enumerate(interview_questions[:5], 1):
                    print(f"{i}. {q['question']}")
                    print(f"   시기: {q['period']}, 직무: {q['position']}, 경력: {q['experience']}")
                print("="*60 + "\n")

            return interview_questions

        except Exception as e:
            print(f"❌ 기출질문 추출 실패: {e}")
            traceback.print_exc()
            return []

    def save_to_db(self, company_name, company_url, questions):
        """DB에 저장"""
        try:
            cursor = self.connection.cursor()

            # company_id 조회
            cursor.execute("SELECT id FROM catch_companies WHERE company = %s", (company_name,))
            company_result = cursor.fetchone()
            company_id = company_result[0] if company_result else None
            print(f"Company ID: {company_id}\n")

            inserted_count = 0

            for q in questions:
                # 중복 체크 (컬럼명: company)
                cursor.execute("""
                    SELECT id FROM catch_interview_questions
                    WHERE company = %s AND question = %s
                """, (company_name, q['question']))

                if cursor.fetchone():
                    print(f"⏭️ 중복 질문 건너뜀: {q['question'][:50]}...")
                    continue

                # 신규 삽입 (컬럼명: company)
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
                print(f"✅ 삽입 성공: {q['question'][:50]}...")

            self.connection.commit()
            cursor.close()

            print(f"\n✅ 총 {inserted_count}개 질문 저장 완료\n")
            return inserted_count

        except Exception as e:
            print(f"❌ DB 저장 실패: {e}")
            traceback.print_exc()
            return 0

    def close(self):
        """리소스 정리"""
        if self.driver:
            self.driver.quit()
        if self.connection:
            self.connection.close()
        print("✅ 리소스 정리 완료")

    def run(self):
        """테스트 실행"""
        print("\n" + "="*60)
        print(f"🧪 면접 기출질문 스크래핑 테스트")
        print(f"   테스트 회사: {TEST_COMPANY}")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.login():
            return False

        if not self.connect_db():
            return False

        # 회사 검색
        company_url = self.search_company(TEST_COMPANY)
        if not company_url:
            print(f"❌ {TEST_COMPANY}를 찾을 수 없습니다.")
            self.close()
            return False

        # 기출질문 스크래핑
        questions = self.scrape_interview_questions(company_url)
        if not questions:
            print(f"⚠️ {TEST_COMPANY}의 기출질문이 없습니다.")
            self.close()
            return False

        # DB 저장
        saved_count = self.save_to_db(TEST_COMPANY, company_url, questions)
        print(f"✅ 최종 저장: {saved_count}개\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = TestScraper()
    scraper.run()
