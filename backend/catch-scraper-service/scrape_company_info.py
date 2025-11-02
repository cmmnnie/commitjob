"""
Jobs 테이블의 모든 회사에 대해 Catch.co.kr에서 기업정보 스크래핑
-> catch_companies 테이블에 저장
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

CATCH_LOGIN = {
    'id': 'test0137',
    'password': '#test0808'
}

class CompanyInfoScraper:
    def __init__(self):
        self.driver = None
        self.connection = None
        self.is_logged_in = False
        self.stats = {
            'total_companies': 0,
            'processed': 0,
            'inserted': 0,
            'updated': 0,
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

    def connect_db(self):
        """DB 연결"""
        try:
            self.connection = pymysql.connect(**DB_CONFIG)
            print("✅ AWS RDS MySQL 연결 성공\n")
            return True
        except Exception as e:
            print(f"❌ DB 연결 실패: {e}")
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

    def close(self):
        """리소스 정리"""
        if self.driver:
            self.driver.quit()
        if self.connection:
            self.connection.close()
        print("\n✅ 리소스 정리 완료")

    def get_companies_from_jobs(self):
        """jobs 테이블에서 회사 목록 가져오기 (최신 채용공고 순)
        1. catch_companies에 없는 회사
        2. catch_companies에 있지만 특정 컬럼이 비어있는 회사
        """
        cursor = self.connection.cursor()

        # 1. catch_companies에 없는 회사들 (우선순위 높음)
        cursor.execute("""
            SELECT j2.company, 'new' as status FROM (
                SELECT j1.company, MAX(j1.scraped_at) AS scraped_at
                FROM jobs j1
                WHERE NOT EXISTS (
                    SELECT 1 FROM catch_companies cc WHERE TRIM(cc.company) = TRIM(j1.company)
                )
                GROUP BY j1.company
            ) j2
            ORDER BY j2.scraped_at DESC
        """)
        new_companies = [(row[0], row[1]) for row in cursor.fetchall()]

        # 2. catch_companies에 있지만 주요 컬럼이 비어있는 회사들
        cursor.execute("""
            SELECT DISTINCT j.company, 'update' as status
            FROM jobs j
            INNER JOIN catch_companies cc ON TRIM(cc.company) = TRIM(j.company)
            WHERE
                cc.industry IS NULL OR cc.industry = '' OR
                cc.company_type IS NULL OR cc.company_type = '' OR
                cc.location IS NULL OR cc.location = '' OR
                cc.employee_count IS NULL OR cc.employee_count = '' OR
                cc.ceo IS NULL OR cc.ceo = '' OR
                cc.establishment_date IS NULL OR cc.establishment_date = '' OR
                cc.company_logo_url IS NULL OR cc.company_logo_url = ''
            ORDER BY j.scraped_at DESC
        """)
        update_companies = [(row[0], row[1]) for row in cursor.fetchall()]

        cursor.close()

        # 신규 회사를 먼저, 업데이트 회사를 나중에
        companies = new_companies + update_companies

        self.stats['total_companies'] = len(companies)
        print(f"📊 처리 대상 회사: 총 {len(companies)}개")
        print(f"   - 신규 등록: {len(new_companies)}개")
        print(f"   - 정보 보완: {len(update_companies)}개\n")
        return companies

    def generate_search_terms(self, company_name):
        """단계적 검색어 생성 (예: '우아한형제들 코리아' → ['우아한형제들 코리아', '우아한형제들'])"""
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

    def search_company_with_term(self, search_term):
        """단일 검색어로 회사 검색 시도"""
        try:
            search_url = "https://www.catch.co.kr/Comp/CompMajor/SearchPage"

            self.driver.get(search_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)

            print(f"  🔍 검색어: '{search_term}'")

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
            try:
                company_links = wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='list_corp_round']//li//p[@class='name']//a"))
                )
            except:
                print(f"  📋 검색 결과 0개")
                return None

            print(f"  📋 검색 결과 {len(company_links)}개")

            # 정규화 함수: 띄어쓰기 제거, 소문자 변환, 특수문자 제거
            def normalize_name(name):
                normalized = name.replace('\u00A0', '').replace(' ', '').lower()
                normalized = normalized.replace('(주)', '').replace('주식회사', '')
                normalized = normalized.replace('㈜', '').replace('()', '')
                # 추가 특수문자 제거
                import re
                normalized = re.sub(r'[.,\-_/\[\]()]', '', normalized)
                return normalized

            normalized_input = normalize_name(search_term)
            target_company_url = None

            # 1차 시도: 정규화된 이름으로 정확 매칭
            for link in company_links:
                company_text = link.text.strip()
                normalized_result = normalize_name(company_text)

                if normalized_result == normalized_input:
                    target_company_url = link.get_attribute('href')
                    print(f"  ✅ 정확한 기업명 매칭: '{search_term}' → '{company_text}'")
                    break

            # 2차 시도: 정규화된 이름으로 부분 매칭 (정확한 매칭 실패 시)
            if not target_company_url:
                for link in company_links:
                    company_text = link.text.strip()
                    normalized_result = normalize_name(company_text)
                    if normalized_input in normalized_result or normalized_result in normalized_input:
                        target_company_url = link.get_attribute('href')
                        print(f"  ✅ 부분 매칭으로 기업 발견: '{search_term}' → '{company_text}'")
                        break

            # 3차 시도: 검색 결과가 1개뿐이면 자동 선택
            if not target_company_url and len(company_links) == 1:
                target_company_url = company_links[0].get_attribute('href')
                company_text = company_links[0].text.strip()
                print(f"  ⚠️  검색 결과가 1개뿐이므로 자동 선택: '{search_term}' → '{company_text}'")

            return target_company_url

        except Exception as e:
            print(f"  ⚠️ 검색 실패: {e}")
            return None

    def search_company_on_catch(self, company_name):
        """Catch.co.kr에서 회사 검색 (단계적 재시도 포함)"""
        try:
            # 단계적 검색어 생성
            search_terms = self.generate_search_terms(company_name)

            # 각 검색어로 순차 시도
            for i, search_term in enumerate(search_terms):
                if i > 0:
                    print(f"  🔄 재시도 ({i}/{len(search_terms) - 1})")

                target_url = self.search_company_with_term(search_term)

                if target_url:
                    return target_url

            # 모든 검색어로 실패
            print(f"  ❌ 회사를 찾을 수 없음 (시도한 검색어: {', '.join(search_terms)})")
            return None

        except Exception as e:
            print(f"  ⚠️ 검색 실패: {e}")
            return None

    def scrape_company_info(self, company_url):
        """회사 상세 정보 스크래핑"""
        try:
            self.driver.get(company_url)
            time.sleep(3)

            wait = WebDriverWait(self.driver, 10)
            company_info = {}

            # 기본 정보 추출 - 실패해도 빈 값으로 계속 진행
            try:
                # 업종 추출 - 여러 방법 시도
                industry = ''

                # 시도 1: JavaScript로 페이지에서 직접 추출
                try:
                    industry = self.driver.execute_script("""
                        // 방법 1: name div 안의 span
                        let spans = document.querySelectorAll('div.name span');
                        for (let span of spans) {
                            let text = span.textContent.trim();
                            if (text && !text.includes('주식회사') && text.length > 2) {
                                return text;
                            }
                        }

                        // 방법 2: corp_info_base 안의 span
                        spans = document.querySelectorAll('div.corp_info_base span');
                        for (let span of spans) {
                            let text = span.textContent.trim();
                            if (text && !text.includes('주식회사') && text.length > 2) {
                                return text;
                            }
                        }

                        // 방법 3: 모든 span에서 업종 키워드 찾기
                        const keywords = ['포털', '플랫폼', '은행', '금융', '게임', '전기', '전자',
                                        'IT', '제조', '유통', '서비스', '건설', '의료', '교육',
                                        '미디어', '통신', '소프트웨어', '하드웨어', '반도체',
                                        '자동차', '화학', '식품', '의약', '바이오', '에너지',
                                        '부동산', '유통', '물류', '광고', '마케팅', '컨설팅'];

                        spans = document.querySelectorAll('span');
                        for (let span of spans) {
                            let text = span.textContent.trim();
                            for (let keyword of keywords) {
                                if (text.includes(keyword)) {
                                    return text;
                                }
                            }
                        }

                        return '';
                    """)

                    if industry and industry.strip():
                        industry = industry.strip()
                except Exception as js_error:
                    pass

                # 시도 2: XPath로 다양한 패턴 시도
                if not industry:
                    try:
                        # 업종 관련 키워드가 포함된 span 찾기
                        industry_xpath = """//span[
                            contains(text(), '포털') or contains(text(), '플랫폼') or
                            contains(text(), '은행') or contains(text(), '금융') or
                            contains(text(), '게임') or contains(text(), '전기') or
                            contains(text(), '전자') or contains(text(), 'IT') or
                            contains(text(), '제조') or contains(text(), '유통') or
                            contains(text(), '서비스') or contains(text(), '건설') or
                            contains(text(), '의료') or contains(text(), '교육') or
                            contains(text(), '미디어') or contains(text(), '통신') or
                            contains(text(), '소프트웨어') or contains(text(), '하드웨어') or
                            contains(text(), '반도체') or contains(text(), '자동차') or
                            contains(text(), '화학') or contains(text(), '식품') or
                            contains(text(), '의약') or contains(text(), '바이오') or
                            contains(text(), '에너지') or contains(text(), '부동산') or
                            contains(text(), '물류') or contains(text(), '광고') or
                            contains(text(), '마케팅') or contains(text(), '컨설팅')
                        ]"""

                        industry_elements = self.driver.find_elements(By.XPATH, industry_xpath)
                        if industry_elements:
                            industry = industry_elements[0].text.strip()
                    except:
                        pass

                company_info['industry'] = industry if industry else ''
            except Exception as e:
                company_info['industry'] = ''

            try:
                # 기업 규모 추출
                company_type_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='item type1']//p[@class='t1']"))
                )
                company_info['company_type'] = company_type_element.text.strip()
            except:
                company_info['company_type'] = ''

            try:
                # 사원수 추출
                employee_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='item type2']//p[@class='t1']"))
                )
                company_info['employee_count'] = employee_element.text.strip()
            except:
                company_info['employee_count'] = ''

            try:
                # 매출액 추출
                revenue_elements = self.driver.find_elements(By.XPATH, "//div[@class='item type3']//p[@class='t1']")
                if revenue_elements:
                    company_info['revenue'] = revenue_elements[0].text.strip()
                else:
                    company_info['revenue'] = ''
            except:
                company_info['revenue'] = ''

            try:
                # 주소 추출
                location_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td"))
                )
                location_text = location_element.text.strip()
                company_info['location'] = location_text.replace("지도", "").strip()
            except:
                company_info['location'] = ''

            try:
                # 대표자 추출
                ceo_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td"))
                )
                company_info['ceo'] = ceo_element.text.strip()
            except:
                company_info['ceo'] = ''

            try:
                # 개업일 추출
                establishment_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td"))
                )
                company_info['establishment_date'] = establishment_element.text.strip()
            except:
                company_info['establishment_date'] = ''

            try:
                # 기업형태 추출
                company_form_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='기업형태']/following-sibling::td"))
                )
                company_info['company_form'] = company_form_element.text.strip()
            except:
                company_info['company_form'] = ''

            try:
                # 신용등급 추출
                credit_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='신용등급']/following-sibling::td"))
                )
                company_info['credit_rating'] = credit_element.text.strip()
            except:
                company_info['credit_rating'] = ''

            try:
                # 태그 추출
                tag_elements = self.driver.find_elements(By.XPATH, "//div[@class='corp_info_base2']//p[@class='tag']//span")
                if tag_elements:
                    tags = [tag.text.strip() for tag in tag_elements if tag.text.strip()]
                    company_info['tags'] = ','.join(tags) if tags else ''
                else:
                    company_info['tags'] = ''
            except:
                company_info['tags'] = ''

            try:
                # 기업 추천 키워드 추출 (다중 폴백)
                keyword_xpaths = [
                    "//div[@class='corp_info_recom']//a[@class='bt']",
                    "//section[contains(@class,'recom') or contains(@class,'corp_info_recom')]//a",
                    "//div[contains(@class,'recom')]//a"
                ]
                keyword_elements = []
                for xp in keyword_xpaths:
                    try:
                        keyword_elements = self.driver.find_elements(By.XPATH, xp)
                        if keyword_elements:
                            break
                    except:
                        continue

                if keyword_elements:
                    keywords = [e.text.strip() for e in keyword_elements if e.text.strip()]
                    company_info['recommendation_keywords'] = ','.join(keywords) if keywords else ''
                else:
                    company_info['recommendation_keywords'] = ''
            except:
                company_info['recommendation_keywords'] = ''

            try:
                # 초봉 정보 추출
                starting_salary_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][1]//span[@class='pay']"))
                )
                company_info['starting_salary'] = starting_salary_element.text.strip()
            except:
                company_info['starting_salary'] = ''

            try:
                # 평균 연봉 정보 추출
                avg_salary_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][2]//span[@class='pay']"))
                )
                company_info['average_salary'] = avg_salary_element.text.strip()
            except:
                company_info['average_salary'] = ''

            try:
                # 동종 업종 평균 연봉 추출
                industry_avg_salary_element = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][2]//p[@class='list'][2]//span[@class='pay']"))
                )
                company_info['industry_average_salary'] = industry_avg_salary_element.text.strip()
            except:
                company_info['industry_average_salary'] = ''

            try:
                # 회사 로고 이미지 URL 추출
                logo_url = self.driver.execute_script("""
                    // 회사 로고를 찾기 위한 다양한 선택자 시도
                    const selectors = [
                        'div.logo_corp img',
                        'div.comp_logo img',
                        'div.company-logo img',
                        'img.corp_logo',
                        'img.company_logo',
                        'div.info_corp img',
                        'div.comp_info img[alt*="로고"]',
                        'div.comp_info img[src*="logo"]',
                        'img[alt*="로고"]',
                        'img[src*="logo"]',
                        'div.info_top img',
                        'div.logo img',
                        'div.comp_head img',
                        'div.company_info img',
                        '.logo-img img',
                        '.company-img img'
                    ];

                    for (let selector of selectors) {
                        const img = document.querySelector(selector);
                        if (img && img.src && !img.src.includes('data:image')) {
                            return img.src;
                        }
                    }
                    return '';
                """)
                company_info['company_logo_url'] = logo_url if logo_url else ''
            except:
                company_info['company_logo_url'] = ''

            return company_info

        except Exception as e:
            print(f"  ⚠️ 정보 추출 실패: {e}")
            return None

    def save_company_info(self, company_name, company_url, company_info):
        """회사 정보를 DB에 저장 또는 업데이트 (빈 컬럼만 업데이트)"""
        try:
            cursor = self.connection.cursor()

            # 회사명 앞뒤 공백 제거
            company_name = company_name.strip()

            # 모든 컬럼값 앞뒤 공백 제거 및 None을 빈 문자열로 변환
            for key in company_info:
                if company_info[key] is None:
                    company_info[key] = ''
                elif isinstance(company_info[key], str):
                    company_info[key] = company_info[key].strip()

            # 기존 데이터 확인 (모든 컬럼 조회)
            cursor.execute("""
                SELECT id, industry, company_type, location, employee_count, revenue,
                       ceo, establishment_date, company_form, credit_rating, tags,
                       recommendation_keywords, starting_salary, average_salary,
                       industry_average_salary, company_url, company_logo_url
                FROM catch_companies WHERE TRIM(company) = %s
            """, (company_name,))
            existing = cursor.fetchone()

            if existing:
                # 기존 데이터가 있는 경우 - 빈 컬럼만 업데이트
                existing_data = {
                    'industry': existing[1],
                    'company_type': existing[2],
                    'location': existing[3],
                    'employee_count': existing[4],
                    'revenue': existing[5],
                    'ceo': existing[6],
                    'establishment_date': existing[7],
                    'company_form': existing[8],
                    'credit_rating': existing[9],
                    'tags': existing[10],
                    'recommendation_keywords': existing[11],
                    'starting_salary': existing[12],
                    'average_salary': existing[13],
                    'industry_average_salary': existing[14],
                    'company_url': existing[15],
                    'company_logo_url': existing[16]
                }

                # 업데이트할 컬럼과 값을 동적으로 구성
                update_fields = []
                update_values = []
                updated_columns = []

                # 각 컬럼별로 기존 값이 비어있거나 NULL인 경우에만 업데이트
                for column, new_value in company_info.items():
                    existing_value = existing_data.get(column)

                    # 기존 값이 비어있거나 NULL이고, 새로운 값이 있는 경우에만 업데이트
                    if (not existing_value or existing_value == '' or existing_value is None) and new_value and new_value != '':
                        update_fields.append(f"{column} = %s")
                        update_values.append(new_value)
                        updated_columns.append(column)

                # company_url은 항상 업데이트 (최신 URL 유지)
                if company_url and company_url != existing_data.get('company_url'):
                    if 'company_url' not in updated_columns:
                        update_fields.append("company_url = %s")
                        update_values.append(company_url)
                        updated_columns.append('company_url')

                # updated_at은 항상 업데이트
                update_fields.append("updated_at = %s")
                update_values.append(datetime.now())

                if len(update_fields) > 1:  # updated_at 외에 업데이트할 컬럼이 있는 경우
                    update_values.append(company_name)
                    update_sql = f"""
                        UPDATE catch_companies
                        SET {', '.join(update_fields)}
                        WHERE TRIM(company) = %s
                    """
                    cursor.execute(update_sql, tuple(update_values))
                    self.connection.commit()
                    self.stats['updated'] += 1
                    print(f"  ✅ 회사 정보 업데이트 (갱신된 컬럼: {', '.join(updated_columns)})")
                else:
                    print(f"  ℹ️  모든 컬럼이 이미 채워져 있어 업데이트 생략")

            else:
                # 신규 삽입
                insert_sql = """
                    INSERT INTO catch_companies
                    (company, industry, company_type, location, employee_count, revenue,
                     ceo, establishment_date, company_form, credit_rating, tags,
                     recommendation_keywords, starting_salary, average_salary,
                     industry_average_salary, company_url, company_logo_url, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                now = datetime.now()
                insert_values = (
                    company_name,
                    company_info.get('industry', ''),
                    company_info.get('company_type', ''),
                    company_info.get('location', ''),
                    company_info.get('employee_count', ''),
                    company_info.get('revenue', ''),
                    company_info.get('ceo', ''),
                    company_info.get('establishment_date', ''),
                    company_info.get('company_form', ''),
                    company_info.get('credit_rating', ''),
                    company_info.get('tags', ''),
                    company_info.get('recommendation_keywords', ''),
                    company_info.get('starting_salary', ''),
                    company_info.get('average_salary', ''),
                    company_info.get('industry_average_salary', ''),
                    company_url if company_url else '',
                    company_info.get('company_logo_url', ''),
                    now, now
                )

                print(f"  🔍 INSERT 시도: company='{company_name}', url='{company_url}'")
                cursor.execute(insert_sql, insert_values)
                self.connection.commit()
                self.stats['inserted'] += 1
                print(f"  ✅ 회사 정보 신규 저장 완료 (ID: {cursor.lastrowid})")

            cursor.close()
            return True

        except Exception as e:
            print(f"  ⚠️ DB 저장 실패: {e}")
            traceback.print_exc()
            self.connection.rollback()
            return False

    def process_company(self, company_data, index, total):
        """개별 회사 처리"""
        # company_data는 (company_name, status) 튜플 또는 단순 문자열
        if isinstance(company_data, tuple):
            company_name = company_data[0]
            status = company_data[1]
        else:
            company_name = company_data
            status = 'unknown'

        status_label = '🆕 신규' if status == 'new' else '🔄 업데이트' if status == 'update' else ''
        print(f"\n[{index}/{total}] 🏢 {company_name} {status_label}")
        print("-" * 60)

        try:
            # 회사 검색
            company_url = self.search_company_on_catch(company_name)

            if not company_url:
                print(f"  ⚠️ Catch.co.kr에서 찾을 수 없음")
                self.stats['not_found'] += 1
                self.stats['processed'] += 1
                return

            # 회사 정보 스크래핑
            company_info = self.scrape_company_info(company_url)

            if not company_info:
                print(f"  ⚠️ 정보 추출 실패")
                self.stats['errors'] += 1
                self.stats['processed'] += 1
                return

            # 스크래핑된 정보 요약 출력
            filled_fields = [k for k, v in company_info.items() if v and v != '']
            print(f"  📋 스크래핑된 필드: {len(filled_fields)}개 - {', '.join(filled_fields[:5])}{'...' if len(filled_fields) > 5 else ''}")

            # DB에 저장
            if self.save_company_info(company_name, company_url, company_info):
                self.stats['processed'] += 1
            else:
                self.stats['errors'] += 1

        except Exception as e:
            print(f"  ❌ 처리 실패: {e}")
            traceback.print_exc()
            self.stats['errors'] += 1
            self.stats['processed'] += 1

    def run_single_company(self, company_name):
        """단일 회사 스크래핑"""
        print("\n" + "="*60)
        print(f"🚀 단일 회사 정보 스크래핑 시작: {company_name}")
        print("="*60 + "\n")

        if not self.init_driver():
            return False

        if not self.login():
            self.close()
            return False

        if not self.connect_db():
            self.close()
            return False

        # 단일 회사 처리 - 튜플이 아닌 문자열로 전달
        self.process_company(company_name, 1, 1)

        # 최종 통계
        print(f"\n{'='*60}")
        print("📊 스크래핑 완료")
        print(f"{'='*60}")
        print(f"회사: {company_name}")
        print(f"처리 완료: {self.stats['processed']}개")
        print(f"신규 저장: {self.stats['inserted']}개")
        print(f"업데이트: {self.stats['updated']}개")
        print(f"찾을 수 없음: {self.stats['not_found']}개")
        print(f"오류: {self.stats['errors']}개")
        print(f"{'='*60}\n")

        self.close()
        return True

    def run(self):
        """메인 실행"""
        print("\n" + "="*60)
        print("🚀 회사 정보 스크래핑 시작")
        print("   대상: Jobs 테이블의 회사")
        print("   - 신규: catch_companies에 없는 회사")
        print("   - 업데이트: 기업정보 컬럼이 비어있는 회사")
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
                print(f"신규 저장: {self.stats['inserted']}개")
                print(f"업데이트: {self.stats['updated']}개")
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
        print(f"신규 저장: {self.stats['inserted']}개")
        print(f"업데이트: {self.stats['updated']}개")
        print(f"찾을 수 없음: {self.stats['not_found']}개")
        print(f"오류: {self.stats['errors']}개")
        print(f"{'='*60}\n")

        self.close()
        return True


if __name__ == "__main__":
    scraper = CompanyInfoScraper()

    # Command line argument로 특정 회사명이 전달된 경우 단일 회사만 스크래핑
    if len(sys.argv) > 1:
        company_name = ' '.join(sys.argv[1:])  # 회사명에 공백이 포함될 수 있으므로 join
        scraper.run_single_company(company_name)
    else:
        scraper.run()
