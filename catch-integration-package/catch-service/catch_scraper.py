from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_URL = 'https://www.catch.co.kr/'

SELECTORS = {
    'login_button': [
        ('XPATH', "//a[contains(text(), '로그인')]")
    ],
    'recruit_menu': [
        ('XPATH', "//a[@href='/NCS/RecruitSearch']")
    ],
    'job_category': [
        ('XPATH', "//button[contains(@class, 'bt') and contains(text(), '직무')]")
    ],
    'it_development': [
        ('XPATH', "//button[contains(@class, 'bt')]//span[contains(text(), 'IT개발')]/..")
    ],
    'bigdata_ai': [
        ('XPATH', "//button[contains(@class, 'bt')]//span[contains(text(), '빅데이터·AI')]/..")
    ],
    'job_list': [
        ('XPATH', "//tbody//tr")
    ],
    'pagination': [
        ('XPATH', "//p[contains(@class, 'page3')]//a")
    ],
    'next_page': [
        ('XPATH', "//p[contains(@class, 'page3')]//a[contains(@class, 'ico next')]")
    ],
    'page_number': [
        ('XPATH', "//p[contains(@class, 'page3')]//a[not(contains(@class, 'ico')) and not(contains(@class, 'selected'))]")
    ]
}

app = Flask(__name__)
CORS(app)

class CatchScraper:
    def __init__(self):
        self.driver = None
        self.is_logged_in = False
        
    def init_driver(self):
        """Chrome 드라이버 초기화"""
        try:
            chrome_options = Options()
            # headless 모드 제거 - 브라우저를 화면에 표시
            # chrome_options.add_argument('--headless')
            chrome_options.page_load_strategy = 'eager'  # DOM 준비되면 바로 반환
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--disable-features=VizDisplayCompositor')
            # 포트 충돌 방지를 위해 랜덤 포트 사용
            import random
            debug_port = random.randint(9223, 9999)
            chrome_options.add_argument(f'--remote-debugging-port={debug_port}')
            chrome_options.add_argument('--disable-background-timer-throttling')
            chrome_options.add_argument('--disable-renderer-backgrounding')
            chrome_options.add_argument('--disable-backgrounding-occluded-windows')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            prefs = {
                'profile.default_content_setting_values': {
                    'notifications': 2,
                    'media_stream': 2,
                    'geolocation': 2,
                    'plugins': 2,
                    'images': 2,
                    'popups': 2
                }
            }
            chrome_options.add_experimental_option('prefs', prefs)
            
            self.driver = webdriver.Chrome(options=chrome_options)

            self.driver.set_page_load_timeout(60)
            self.driver.implicitly_wait(15)

            print("[DEBUG] Chrome 드라이버 초기화 성공")
            return True
        except Exception as e:
            print(f"[ERROR] Chrome 드라이버 초기화 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _find_element_with_fallbacks(self, wait, selectors):
        """여러 선택자를 시도해서 요소 찾기"""
        for selector_value in [s[1] for s in selectors]:
            try:
                return wait.until(EC.element_to_be_clickable((By.XPATH, selector_value)))
            except Exception:
                continue
        return None
    
    def _is_page_changed(self, driver, previous_first_job_title):
        """페이지가 실제로 변경되었는지 확인"""
        try:
            # 현재 첫 번째 공고 제목 가져오기
            current_first_job = driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
            current_first_job_title = current_first_job.text.strip()
            
            # 이전 제목과 다르면 페이지가 변경된 것
            if current_first_job_title != previous_first_job_title and current_first_job_title != "":
                print(f"페이지 변경 확인: '{previous_first_job_title}' -> '{current_first_job_title}'")
                return True
            
            # 공고 목록이 로드되었는지도 확인
            job_rows = driver.find_elements(By.XPATH, "//tbody//tr")
            if len(job_rows) > 0:
                # 첫 번째 공고의 회사명도 확인
                try:
                    first_company = driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'name2')]")
                    if first_company.text.strip() != "":
                        return True
                except Exception:
                    pass
            
            return False
            
        except Exception:
            return False
    
    def login(self, username='test0137', password='#test0808'):
        """CATCH 사이트 로그인"""
        try:
            self.driver.get(BASE_URL)
            
            wait = WebDriverWait(self.driver, 15)
            login_button = self._find_element_with_fallbacks(wait, SELECTORS['login_button'])
            if not login_button:
                return {"success": False, "message": "로그인 버튼을 찾을 수 없습니다."}
            
            self.driver.execute_script("arguments[0].click();", login_button)
            
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "id_login"))
            )
            
            id_input = self.driver.find_element(By.ID, "id_login")
            password_input = self.driver.find_element(By.ID, "pw_login")
            
            id_input.clear()
            id_input.send_keys(username)
            password_input.clear()
            password_input.send_keys(password)
            password_input.send_keys(Keys.RETURN)
            
            try:
                WebDriverWait(self.driver, 15).until(
                    lambda driver: "Login" not in driver.current_url or 
                    len(driver.find_elements(By.ID, "id_login")) == 0
                )
                self.is_logged_in = True
                return {"success": True, "message": "로그인 성공"}
            except Exception:
                try:
                    return {"success": False, "message": self.driver.find_element(By.CLASS_NAME, 'error-message').text}
                except Exception:
                    return {"success": False, "message": "로그인 실패 - 로그인 페이지에 머물러 있음" if 'login' in self.driver.current_url else "로그인 상태 확인 실패"}
                    
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def get_current_status(self):
        """현재 상태 확인"""
        if not self.driver:
            return {"error": "드라이버가 초기화되지 않았습니다."}
        
        try:
            return {
                "is_logged_in": self.is_logged_in,
                "current_url": self.driver.current_url,
                "page_title": self.driver.title
            }
        except Exception as e:
            return {"error": str(e)}
    
    def navigate_to_recruit_page(self):
        """채용공고 페이지로 이동"""
        try:
            wait = WebDriverWait(self.driver, 10)
            
            recruit_menu = self._find_element_with_fallbacks(wait, SELECTORS['recruit_menu'])
            if recruit_menu:
                self.driver.execute_script("arguments[0].click();", recruit_menu)
                wait.until(EC.url_contains("RecruitSearch"))
            else:
                self.driver.get(f"{BASE_URL}NCS/RecruitSearch")
                wait.until(EC.url_contains("RecruitSearch"))
            
            return {"success": True, "message": "채용공고 페이지로 이동 완료"}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def filter_it_jobs(self):
        """IT개발 공고 필터링"""
        try:
            wait = WebDriverWait(self.driver, 10)
            
            job_category = self._find_element_with_fallbacks(wait, SELECTORS['job_category'])
            if not job_category:
                return {"success": False, "message": "직무 카테고리 버튼을 찾을 수 없습니다."}
            
            self.driver.execute_script("arguments[0].click();", job_category)
            
            WebDriverWait(self.driver, 2).until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'cate2')]")))
            
            it_development = self._find_element_with_fallbacks(wait, SELECTORS['it_development'])
            if not it_development:
                return {"success": False, "message": "IT개발 버튼을 찾을 수 없습니다."}
            
            self.driver.execute_script("arguments[0].click();", it_development)
            
            # 필터링 후 페이지 로딩 대기 시간 증가
            import time
            time.sleep(3)
            
            return {"success": True, "message": "IT개발 공고 필터링 완료"}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def filter_bigdata_ai(self):
        """빅데이터·AI 공고 필터링"""
        try:
            wait = WebDriverWait(self.driver, 10)
            
            job_category = self._find_element_with_fallbacks(wait, SELECTORS['job_category'])
            if not job_category:
                return {"success": False, "message": "직무 카테고리 버튼을 찾을 수 없습니다."}
            
            self.driver.execute_script("arguments[0].click();", job_category)
            
            WebDriverWait(self.driver, 2).until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'cate2')]")))
            
            bigdata_ai = self._find_element_with_fallbacks(wait, SELECTORS['bigdata_ai'])
            if not bigdata_ai:
                return {"success": False, "message": "빅데이터·AI 버튼을 찾을 수 없습니다."}
            
            self.driver.execute_script("arguments[0].click();", bigdata_ai)
            
            # 필터링 후 페이지 로딩 대기 시간 증가
            import time
            time.sleep(3)
            
            return {"success": True, "message": "빅데이터·AI 공고 필터링 완료"}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_job_list(self, max_pages=None):
        """IT개발 공고 목록 추출 (모든 페이지)"""
        # 기존 코드 그대로 유지
        try:
            wait = WebDriverWait(self.driver, 10)
            all_jobs = []
            current_page = 1
            
            while True:
                print(f"페이지 {current_page} 추출 중...")
                
                # 현재 페이지의 공고 추출
                job_rows = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr")))
                
                page_jobs = []
                for row in job_rows:
                    try:
                        company_element = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]")
                        company = company_element.text.strip()
                        
                        title_element = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]")
                        title = title_element.text.strip()
                        
                        link_element = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                        job_url = link_element.get_attribute('href')
                        
                        job_info_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'job')]//span")
                        job_info = [info.text.strip() for info in job_info_elements]
                        
                        # 경력, 학력, 등록일 등 추가 정보 추출
                        conditions = []
                        try:
                            condition_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'cond')]")
                            for cond in condition_elements:
                                conditions.append(cond.text.strip())
                        except Exception:
                            pass
                        
                        # 등록일 정보 추출
                        registration_info = []
                        try:
                            date_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'date2') or contains(@class, 'num_dday')]")
                            for date in date_elements:
                                registration_info.append(date.text.strip())
                        except Exception:
                            pass
                        
                        page_jobs.append({
                            "title": title,
                            "company": company,
                            "job_info": job_info,
                            "conditions": conditions,  # 경력, 학력, 고용형태 등
                            "registration_info": registration_info,  # 등록일, 마감일 등
                            "url": job_url,
                            "page": current_page
                        })
                        
                    except Exception:
                        continue
                
                all_jobs.extend(page_jobs)
                print(f"페이지 {current_page}: {len(page_jobs)}개 공고 추출")
                
                # 최대 페이지 수 제한 확인
                if max_pages and current_page >= max_pages:
                    break
                
                # 다음 페이지로 이동
                try:
                    # 현재 페이지의 첫 번째 공고 제목 저장 (페이지 변경 확인용)
                    first_job_title = ""
                    try:
                        first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                        first_job_title = first_job.text.strip()
                    except Exception:
                        pass
                    
                    # 먼저 "다음" 버튼을 찾아보고, 없으면 숫자 버튼을 찾음
                    next_page_btn = self._find_element_with_fallbacks(wait, SELECTORS['next_page'])
                    
                    if next_page_btn and next_page_btn.is_enabled():
                        # "다음" 버튼이 있는 경우 - 안전한 클릭 방식 사용
                        print(f"다음 버튼으로 페이지 {current_page + 1} 이동 시도...")
                        
                        # 빈 공간 클릭으로 포커스 해제
                        self.driver.execute_script("document.body.click();")
                        
                        # 충분한 지연 시간 (SPA 로딩 대기)
                        import time
                        time.sleep(2.0)
                        
                        # "다음" 버튼 클릭
                        self.driver.execute_script("arguments[0].click();", next_page_btn)
                        
                        # 공고 목록이 바뀔 때까지 대기 (첫 번째 공고 제목이 변경되거나 로딩 완료)
                        WebDriverWait(self.driver, 15).until(
                            lambda driver: self._is_page_changed(driver, first_job_title)
                        )
                        
                        # 추가 안전 대기
                        import time
                        time.sleep(1.0)
                        
                        # 페이지가 실제로 변경되었는지 확인
                        new_first_job_title = ""
                        try:
                            new_first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                            new_first_job_title = new_first_job.text.strip()
                        except Exception:
                            pass
                        
                        # 페이지가 변경되지 않았다면 마지막 페이지
                        if new_first_job_title == first_job_title:
                            print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                            break
                        
                        current_page += 1
                        print(f"다음 버튼으로 페이지 {current_page} 이동 완료")
                    else:
                        # "다음" 버튼이 없으면 다음 페이지 숫자 버튼을 찾음
                        next_page_number = current_page + 1
                        try:
                            page_btn = self.driver.find_element(By.XPATH, f"//p[contains(@class, 'page3')]//a[text()='{next_page_number}']")
                            
                            if page_btn and page_btn.is_enabled():
                                print(f"숫자 버튼으로 페이지 {next_page_number} 이동 시도...")
                                
                                # 빈 공간 클릭으로 포커스 해제
                                self.driver.execute_script("document.body.click();")
                                
                                # 충분한 지연 시간 (SPA 로딩 대기)
                                import time
                                time.sleep(1.5)
                                
                                self.driver.execute_script("arguments[0].click();", page_btn)
                                
                                # 공고 목록이 바뀔 때까지 대기
                                WebDriverWait(self.driver, 15).until(
                                    lambda driver: self._is_page_changed(driver, first_job_title)
                                )
                                
                                # 추가 안전 대기
                                import time
                                time.sleep(1.0)
                                
                                # 페이지가 실제로 변경되었는지 확인
                                new_first_job_title = ""
                                try:
                                    new_first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                                    new_first_job_title = new_first_job.text.strip()
                                except Exception:
                                    pass
                                
                                # 페이지가 변경되지 않았다면 마지막 페이지
                                if new_first_job_title == first_job_title:
                                    print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                                    break
                                
                                current_page += 1
                                print(f"숫자 버튼으로 페이지 {current_page} 이동 완료")
                            else:
                                # 다음 페이지 버튼이 없는 경우
                                print(f"페이지 {next_page_number} 버튼을 찾을 수 없습니다. 마지막 페이지에 도달했습니다.")
                                break
                        except Exception:
                            # 다음 페이지 버튼이 없는 경우
                            print(f"페이지 {next_page_number} 버튼을 찾을 수 없습니다. 마지막 페이지에 도달했습니다.")
                            break
                    
                except Exception as e:
                    # 다음 페이지로 이동할 수 없는 경우
                    print(f"페이지 이동 실패: {str(e)}")
                    break
            
            return {"success": True, "message": f"총 {len(all_jobs)}개의 IT개발 공고를 {current_page}페이지에서 찾았습니다.", "jobs": all_jobs, "total_pages": current_page}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_first_page_jobs(self, max_jobs=10):
        """첫 페이지에서 최대 10개 공고만 추출"""
        try:
            wait = WebDriverWait(self.driver, 10)
            all_jobs = []
            
            print("첫 페이지에서 공고 추출 중...")
            
            # 페이지 로딩 대기
            import time
            time.sleep(2)
            
            # 현재 페이지의 공고 추출
            job_rows = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr")))
            
            print(f"페이지에서 총 {len(job_rows)}개의 공고 행을 발견했습니다.")
            
            # 최대 10개까지만 추출
            for i, row in enumerate(job_rows[:max_jobs]):
                try:
                    company_element = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]")
                    company = company_element.text.strip()
                    
                    title_element = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]")
                    title = title_element.text.strip()
                    
                    link_element = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                    job_url = link_element.get_attribute('href')
                    
                    job_info_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'job')]//span")
                    job_info = [info.text.strip() for info in job_info_elements]
                    
                    # 경력, 학력, 등록일 등 추가 정보 추출
                    conditions = []
                    try:
                        condition_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'cond')]")
                        for cond in condition_elements:
                            conditions.append(cond.text.strip())
                    except Exception:
                        pass
                    
                    # 등록일 정보 추출
                    registration_info = []
                    try:
                        date_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'date2') or contains(@class, 'num_dday')]")
                        for date in date_elements:
                            registration_info.append(date.text.strip())
                    except Exception:
                        pass
                    
                    all_jobs.append({
                        "title": title,
                        "company": company,
                        "job_info": job_info,
                        "conditions": conditions,  # 경력, 학력, 고용형태 등
                        "registration_info": registration_info,  # 등록일, 마감일 등
                        "url": job_url,
                        "page": 1
                    })
                    
                    print(f"공고 {len(all_jobs)} 추출 성공: {company} - {title}")
                    
                except Exception as e:
                    print(f"행 {i+1} 추출 실패: {str(e)}")
                    continue
            
            print(f"첫 페이지에서 {len(all_jobs)}개 공고 추출 완료")
            
            return {"success": True, "message": f"총 {len(all_jobs)}개의 공고를 첫 페이지에서 찾았습니다.", "jobs": all_jobs, "total_pages": 1}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_company_jobs(self, company_name, max_pages=None):
        """특정 기업의 공고만 추출 (모든 페이지)"""
        try:
            wait = WebDriverWait(self.driver, 10)
            all_jobs = []
            current_page = 1
            
            print(f"'{company_name}' 기업 공고 검색 중...")
            
            while True:
                print(f"페이지 {current_page}에서 '{company_name}' 기업 공고 검색 중...")
                
                # 현재 페이지의 공고 추출
                job_rows = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//tbody//tr")))
                
                page_jobs = []
                for row in job_rows:
                    try:
                        company_element = row.find_element(By.XPATH, ".//p[contains(@class, 'name2')]")
                        company = company_element.text.strip()
                        
                        # 기업명이 일치하는지 확인 (부분 일치)
                        if company_name.lower() not in company.lower():
                            continue
                        
                        title_element = row.find_element(By.XPATH, ".//p[contains(@class, 'subj2')]")
                        title = title_element.text.strip()
                        
                        link_element = row.find_element(By.XPATH, ".//a[contains(@href, 'RecruitInfoDetails')]")
                        job_url = link_element.get_attribute('href')
                        
                        job_info_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'job')]//span")
                        job_info = [info.text.strip() for info in job_info_elements]
                        
                        # 경력, 학력, 등록일 등 추가 정보 추출
                        conditions = []
                        try:
                            condition_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'cond')]")
                            for cond in condition_elements:
                                conditions.append(cond.text.strip())
                        except Exception:
                            pass
                        
                        # 등록일 정보 추출
                        registration_info = []
                        try:
                            date_elements = row.find_elements(By.XPATH, ".//p[contains(@class, 'date2') or contains(@class, 'num_dday')]")
                            for date in date_elements:
                                registration_info.append(date.text.strip())
                        except Exception:
                            pass
                        
                        page_jobs.append({
                            "title": title,
                            "company": company,
                            "job_info": job_info,
                            "conditions": conditions,  # 경력, 학력, 고용형태 등
                            "registration_info": registration_info,  # 등록일, 마감일 등
                            "url": job_url,
                            "page": current_page
                        })
                        
                    except Exception:
                        continue
                
                all_jobs.extend(page_jobs)
                print(f"페이지 {current_page}: '{company_name}' 기업 공고 {len(page_jobs)}개 발견")
                
                # 최대 페이지 수 제한 확인
                if max_pages and current_page >= max_pages:
                    break
                
                # 다음 페이지로 이동
                try:
                    # 현재 페이지의 첫 번째 공고 제목 저장 (페이지 변경 확인용)
                    first_job_title = ""
                    try:
                        first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                        first_job_title = first_job.text.strip()
                    except Exception:
                        pass
                    
                    # 먼저 "다음" 버튼을 찾아보고, 없으면 숫자 버튼을 찾음
                    next_page_btn = self._find_element_with_fallbacks(wait, SELECTORS['next_page'])
                    
                    if next_page_btn and next_page_btn.is_enabled():
                        # "다음" 버튼이 있는 경우 - 안전한 클릭 방식 사용
                        print(f"다음 버튼으로 페이지 {current_page + 1} 이동 시도...")
                        
                        # 빈 공간 클릭으로 포커스 해제
                        self.driver.execute_script("document.body.click();")
                        
                        # 충분한 지연 시간 (SPA 로딩 대기)
                        import time
                        time.sleep(2.0)
                        
                        # "다음" 버튼 클릭
                        self.driver.execute_script("arguments[0].click();", next_page_btn)
                        
                        # 공고 목록이 바뀔 때까지 대기 (첫 번째 공고 제목이 변경되거나 로딩 완료)
                        WebDriverWait(self.driver, 15).until(
                            lambda driver: self._is_page_changed(driver, first_job_title)
                        )
                        
                        # 추가 안전 대기
                        import time
                        time.sleep(1.0)
                        
                        # 페이지가 실제로 변경되었는지 확인
                        new_first_job_title = ""
                        try:
                            new_first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                            new_first_job_title = new_first_job.text.strip()
                        except Exception:
                            pass
                        
                        # 페이지가 변경되지 않았다면 마지막 페이지
                        if new_first_job_title == first_job_title:
                            print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                            break
                        
                        current_page += 1
                        print(f"다음 버튼으로 페이지 {current_page} 이동 완료")
                    else:
                        # "다음" 버튼이 없으면 다음 페이지 숫자 버튼을 찾음
                        next_page_number = current_page + 1
                        try:
                            page_btn = self.driver.find_element(By.XPATH, f"//p[contains(@class, 'page3')]//a[text()='{next_page_number}']")
                            
                            if page_btn and page_btn.is_enabled():
                                print(f"숫자 버튼으로 페이지 {next_page_number} 이동 시도...")
                                
                                # 빈 공간 클릭으로 포커스 해제
                                self.driver.execute_script("document.body.click();")
                                
                                # 충분한 지연 시간 (SPA 로딩 대기)
                                import time
                                time.sleep(1.5)
                                
                                self.driver.execute_script("arguments[0].click();", page_btn)
                                
                                # 공고 목록이 바뀔 때까지 대기
                                WebDriverWait(self.driver, 15).until(
                                    lambda driver: self._is_page_changed(driver, first_job_title)
                                )
                                
                                # 추가 안전 대기
                                import time
                                time.sleep(1.0)
                                
                                # 페이지가 실제로 변경되었는지 확인
                                new_first_job_title = ""
                                try:
                                    new_first_job = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]")
                                    new_first_job_title = new_first_job.text.strip()
                                except Exception:
                                    pass
                                
                                # 페이지가 변경되지 않았다면 마지막 페이지
                                if new_first_job_title == first_job_title:
                                    print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                                    break
                                
                                current_page += 1
                                print(f"숫자 버튼으로 페이지 {current_page} 이동 완료")
                            else:
                                # 다음 페이지 버튼이 없는 경우
                                print(f"페이지 {next_page_number} 버튼을 찾을 수 없습니다. 마지막 페이지에 도달했습니다.")
                                break
                        except Exception:
                            # 다음 페이지 버튼이 없는 경우
                            print(f"페이지 {next_page_number} 버튼을 찾을 수 없습니다. 마지막 페이지에 도달했습니다.")
                            break
                    
                except Exception as e:
                    # 다음 페이지로 이동할 수 없는 경우
                    print(f"페이지 이동 실패: {str(e)}")
                    break
            
            return {"success": True, "message": f"'{company_name}' 기업의 총 {len(all_jobs)}개 공고를 {current_page}페이지에서 찾았습니다.", "jobs": all_jobs, "total_pages": current_page, "company": company_name}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_job_detail(self, job_url):
        """특정 공고의 상세 내용 추출"""
        try:
            print(f"공고 상세 페이지로 이동: {job_url}")
            self.driver.get(job_url)
            
            wait = WebDriverWait(self.driver, 10)
            
            # 페이지 로딩 대기
            import time
            time.sleep(3)
            
            job_detail = {
                "company_name": "",
                "job_title": "",
                "job_type": "",
                "location": "",
                "career_level": "",
                "education": "",
                "job_description": "",
                "requirements": "",
                "preferred_qualifications": "",
                "apply_url": "",
                "deadline": "",
                "salary": "",
                "benefits": "",
                "full_content": ""  # 전체 상세 내용 추가
            }
            
            try:
                # 회사명 추출
                company_element = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'name') and contains(@class, 'gtm-recruitDetail-compInfo-click')]")))
                job_detail["company_name"] = company_element.text.strip()
            except:
                print("회사명 추출 실패")
            
            try:
                # 공고 제목 추출
                title_element = wait.until(EC.presence_of_element_located((By.XPATH, "//h2[@class='subj']")))
                job_detail["job_title"] = title_element.text.strip()
            except:
                print("공고 제목 추출 실패")
            
            try:
                # 기본 정보 추출 (경력, 고용형태, 학력, 지역)
                basic_info = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='group bg1']//p[@class='txt']")))
                basic_text = basic_info.text.strip()
                
                # 경력 정보 추출
                if "경력" in basic_text:
                    job_detail["career_level"] = basic_text.split("|")[0].strip()
                
                # 고용형태 추출
                if "정규직" in basic_text or "계약직" in basic_text:
                    job_detail["job_type"] = basic_text.split("|")[1].strip() if "|" in basic_text else basic_text
                
                # 학력 추출
                if "학력" in basic_text:
                    parts = basic_text.split("|")
                    for part in parts:
                        if "학력" in part:
                            job_detail["education"] = part.strip()
                            break
                
                # 지역 추출
                if "구" in basic_text or "시" in basic_text:
                    parts = basic_text.split("|")
                    for part in parts:
                        if "구" in part or "시" in part:
                            job_detail["location"] = part.strip()
                            break
                            
            except:
                print("기본 정보 추출 실패")
            
            try:
                # 직무 정보 추출
                job_info = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='group bg2']//p[@class='txt']")))
                job_detail["job_description"] = job_info.text.strip()
            except:
                print("직무 정보 추출 실패")
            
            # 지원 URL 추출 (홈페이지 지원 버튼 클릭)
            try:
                apply_element = wait.until(EC.presence_of_element_located((By.XPATH, "//a[contains(@class, 'gtm-recruitDetail-apply-homepage')]")))
                
                # 버튼 클릭 전 현재 URL 저장
                current_url = self.driver.current_url
                print(f"클릭 전 URL: {current_url}")
                
                # 새 탭에서 열기 위해 JavaScript 실행
                self.driver.execute_script("arguments[0].click();", apply_element)
                time.sleep(3)
                
                # 새 탭으로 전환
                if len(self.driver.window_handles) > 1:
                    self.driver.switch_to.window(self.driver.window_handles[-1])
                    new_url = self.driver.current_url
                    print(f"지원 페이지 URL: {new_url}")
                    
                    if new_url != current_url and "catch.co.kr" not in new_url:
                        job_detail["apply_url"] = new_url
                    else:
                        job_detail["apply_url"] = "지원 URL 없음"
                    
                    # 원래 탭으로 돌아가기
                    self.driver.close()
                    self.driver.switch_to.window(self.driver.window_handles[0])
                else:
                    job_detail["apply_url"] = "지원 URL 없음"
                    
            except Exception as e:
                print(f"지원 URL 추출 실패: {e}")
                job_detail["apply_url"] = "지원 URL 없음"
            
            try:
                # 마감일 추출
                deadline_element = wait.until(EC.presence_of_element_located((By.XPATH, "//span[@class='num_dday']//span")))
                job_detail["deadline"] = deadline_element.text.strip()
            except:
                print("마감일 추출 실패")
            
            # 전체 상세 내용 추출 (iframe 내부)
            try:
                iframe = wait.until(EC.presence_of_element_located((By.XPATH, "//iframe[@title='채용상세']")))
                iframe_src = iframe.get_attribute("src")
                
                if iframe_src:
                    print(f"상세 내용 iframe으로 이동: {iframe_src}")
                    self.driver.get(iframe_src)
                    time.sleep(2)
                    
                    # 상세 내용 추출 (HTML 전체)
                    detail_content = self.driver.find_element(By.TAG_NAME, "body").get_attribute('innerHTML')
                    job_detail["full_content"] = detail_content
                    print("상세 내용 추출 성공")
                    
            except Exception as e:
                print(f"상세 내용 추출 실패: {e}")
                job_detail["full_content"] = "상세 내용 추출 실패"
            
            print(f"공고 상세 정보 추출 완료: {job_detail['job_title']}")
            return {
                "success": True,
                "job_detail": job_detail,
                "message": "공고 상세 정보 추출 완료"
            }
            
        except Exception as e:
            print(f"공고 상세 정보 추출 중 오류 발생: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "공고 상세 정보 추출 실패"
            }
    
    def close_driver(self):
        """드라이버 종료"""
        if self.driver:
            self.driver.quit()
    
    def search_company(self, company_name):
        """기업 검색"""
        try:
            print(f"기업 검색 페이지로 이동: {company_name}")
            self.driver.get("https://www.catch.co.kr/Comp/CompMajor/SearchPage")
            
            wait = WebDriverWait(self.driver, 10)
            
            # 페이지 로딩 대기
            import time
            time.sleep(3)
            
            # 검색창 찾기
            search_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='궁금한 기업을 검색해 보세요.']")))
            search_input.clear()
            search_input.send_keys(company_name)
            
            # 검색 버튼 클릭
            search_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@class='bt_sch']")))
            search_button.click()
            
            # 검색 결과 로딩 대기
            time.sleep(3)
            
            # 검색 결과에서 정확한 기업명 찾기
            company_links = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='list_corp_round']//li//p[@class='name']//a")))
            
            target_company_url = None
            for link in company_links:
                company_text = link.text.strip()
                if company_text == company_name:
                    target_company_url = link.get_attribute('href')
                    print(f"정확한 기업명 발견: {company_text}")
                    break
            
            if not target_company_url:
                return {"success": False, "message": f"'{company_name}' 기업을 찾을 수 없습니다."}
            
            return {"success": True, "company_url": target_company_url, "message": f"'{company_name}' 기업을 찾았습니다."}
            
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_company_detail(self, company_url):
        """기업 상세 정보 추출"""
        try:
            print(f"기업 상세 페이지로 이동: {company_url}")
            self.driver.get(company_url)
            
            wait = WebDriverWait(self.driver, 10)
            
            # 페이지 로딩 대기
            import time
            time.sleep(3)
            
            company_detail = {
                "company_name": "",
                "industry": "",
                "company_type": "",
                "location": "",
                "employee_count": "",
                "revenue": "",
                "ceo": "",
                "establishment_date": "",
                "company_form": "",
                "credit_rating": "",
                "tags": [],
                "recommendation_keywords": [],
                "starting_salary": "",
                "average_salary": "",
                "industry_average_salary": "",
                "reviews": []
            }
            
            try:
                # 기업명 추출 (수정된 XPath)
                company_name_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='name']//h2")))
                company_detail["company_name"] = company_name_element.text.strip()
            except:
                print("기업명 추출 실패")
            
            try:
                # 업종 추출 (수정된 XPath)
                industry_element = wait.until(EC.presence_of_element_located((By.XPATH, "//span[contains(text(), '포털·플랫폼') or contains(text(), '은행·금융') or contains(text(), '게임') or contains(text(), '전기·전자')]")))
                company_detail["industry"] = industry_element.text.strip()
            except:
                print("업종 추출 실패")
            
            try:
                # 기업 규모 추출 (수정된 XPath)
                company_type_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='item type1']//p[@class='t1']")))
                company_detail["company_type"] = company_type_element.text.strip()
            except:
                print("기업 규모 추출 실패")
            
            try:
                # 지역(주소) 추출 (수정된 XPath)
                location_element = wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='주소']/following-sibling::td")))
                location_text = location_element.text.strip()
                # "지도" 버튼 텍스트 제거
                location_text = location_text.replace("지도", "").strip()
                company_detail["location"] = location_text
            except:
                print("지역(주소) 추출 실패")
            
            try:
                # 사원수 추출
                employee_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='item type2']//p[@class='t1']")))
                company_detail["employee_count"] = employee_element.text.strip()
            except:
                print("사원수 추출 실패")
            
            try:
                # 매출액 추출
                revenue_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//div[@class='item type3']//p[@class='t1']")))
                if revenue_elements:
                    company_detail["revenue"] = revenue_elements[0].text.strip()
            except:
                print("매출액 추출 실패")
            
            try:
                # 대표자 추출
                ceo_element = wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='대표자']/following-sibling::td")))
                company_detail["ceo"] = ceo_element.text.strip()
            except:
                print("대표자 추출 실패")
            
            try:
                # 개업일 추출
                establishment_element = wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='개업일']/following-sibling::td")))
                company_detail["establishment_date"] = establishment_element.text.strip()
            except:
                print("개업일 추출 실패")
            
            try:
                # 기업형태 추출
                company_form_element = wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='기업형태']/following-sibling::td")))
                company_detail["company_form"] = company_form_element.text.strip()
            except:
                print("기업형태 추출 실패")
            
            try:
                # 신용등급 추출
                credit_element = wait.until(EC.presence_of_element_located((By.XPATH, "//table//tr//th[text()='신용등급']/following-sibling::td")))
                company_detail["credit_rating"] = credit_element.text.strip()
            except:
                print("신용등급 추출 실패")
            
            try:
                # 태그 추출
                tag_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//div[@class='corp_info_base2']//p[@class='tag']//span")))
                company_detail["tags"] = [tag.text.strip() for tag in tag_elements]
            except:
                print("태그 추출 실패")
                company_detail["tags"] = []
            
            try:
                # 기업 추천 키워드 추출
                keyword_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//div[@class='corp_info_recom']//a[@class='bt']")))
                company_detail["recommendation_keywords"] = [keyword.text.strip() for keyword in keyword_elements]
            except:
                print("기업 추천 키워드 추출 실패")
                company_detail["recommendation_keywords"] = []
            
            try:
                # 초봉 정보 추출
                starting_salary_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][1]//span[@class='pay']")))
                company_detail["starting_salary"] = starting_salary_element.text.strip()
            except:
                print("초봉 정보 추출 실패")
                company_detail["starting_salary"] = ""
            
            try:
                # 평균 연봉 정보 추출
                avg_salary_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][2]//span[@class='pay']")))
                company_detail["average_salary"] = avg_salary_element.text.strip()
            except:
                print("평균 연봉 정보 추출 실패")
                company_detail["average_salary"] = ""
            
            try:
                # 동종 업종 평균 연봉 추출
                industry_avg_salary_element = wait.until(EC.presence_of_element_located((By.XPATH, "//div[@class='corp_info_payinfo']//div[@class='box'][2]//p[@class='list'][2]//span[@class='pay']")))
                company_detail["industry_average_salary"] = industry_avg_salary_element.text.strip()
            except:
                print("동종 업종 평균 연봉 추출 실패")
                company_detail["industry_average_salary"] = ""
            
            # 현직자 리뷰 추출
            try:
                print("현직자 리뷰 탭으로 이동...")
                # 현직자리뷰 탭 클릭 (더 구체적인 XPath 사용)
                review_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@class='bot']//ul[@class='menu']//li//a[contains(text(), '현직자리뷰')]")))
                review_tab.click()
                time.sleep(5)  # 페이지 로딩 시간 증가
                
                # 리뷰 목록 추출 (더 안전한 대기)
                try:
                    review_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='corp_review_list']//li")))
                except:
                    # 대안 XPath 시도
                    review_elements = self.driver.find_elements(By.XPATH, "//div[@class='corp_info_box']//ul//li")
                
                reviews = []
                print(f"리뷰 요소 {len(review_elements)}개 발견")
                
                for i, review_element in enumerate(review_elements):
                    try:
                        review_data = {}
                        
                        # 직원 상태 (현직/퇴사)
                        try:
                            state_element = review_element.find_element(By.XPATH, ".//p[@class='state']")
                            review_data["employee_status"] = state_element.text.strip()
                        except:
                            review_data["employee_status"] = ""
                        
                        # 직원 정보 (현직원, 정규직, 경력입사 등)
                        try:
                            info_elements = review_element.find_elements(By.XPATH, ".//div[@class='info']//p//span")
                            review_data["employee_info"] = [info.text.strip() for info in info_elements]
                        except:
                            review_data["employee_info"] = []
                        
                        # 평점
                        try:
                            rating_element = review_element.find_element(By.XPATH, ".//div[@class='rating_star2']//span[@class='fill']")
                            review_data["rating"] = rating_element.text.strip()
                        except:
                            review_data["rating"] = ""
                        
                        # 좋은점
                        try:
                            good_element = review_element.find_element(By.XPATH, ".//p[@class='review good']//span[@class='t']")
                            review_data["good_points"] = good_element.text.strip()
                        except:
                            review_data["good_points"] = ""
                        
                        # 아쉬운점
                        try:
                            bad_element = review_element.find_element(By.XPATH, ".//p[@class='review bad']//span[@class='t']")
                            review_data["bad_points"] = bad_element.text.strip()
                        except:
                            review_data["bad_points"] = ""
                        
                        # 작성일
                        try:
                            date_element = review_element.find_element(By.XPATH, ".//p[@class='bot']//span[@class='date']")
                            review_data["review_date"] = date_element.text.strip()
                        except:
                            review_data["review_date"] = ""
                        
                        # 좋아요 수
                        try:
                            like_element = review_element.find_element(By.XPATH, ".//span[@class='like']//label")
                            review_data["likes"] = like_element.text.strip()
                        except:
                            review_data["likes"] = ""
                        
                        reviews.append(review_data)
                        print(f"리뷰 {i+1} 추출 완료")
                        
                    except Exception as e:
                        print(f"개별 리뷰 {i+1} 추출 실패: {e}")
                        continue
                
                company_detail["reviews"] = reviews
                print(f"현직자 리뷰 {len(reviews)}개 추출 완료")
                
            except Exception as e:
                print(f"현직자 리뷰 추출 실패: {e}")
                # 디버깅을 위해 현재 페이지 URL과 제목 확인
                print(f"현재 페이지 URL: {self.driver.current_url}")
                print(f"현재 페이지 제목: {self.driver.title}")
                company_detail["reviews"] = []
            
            print(f"기업 상세 정보 추출 완료: {company_detail['company_name']}")
            return {
                "success": True,
                "company_detail": company_detail,
                "message": "기업 상세 정보 추출 완료"
            }
            
        except Exception as e:
            print(f"기업 상세 정보 추출 중 오류 발생: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "기업 상세 정보 추출 실패"
            }

scraper = CatchScraper()

def _handle_api_error(e):
    """API 에러 처리 헬퍼 함수"""
    return jsonify({"success": False, "message": str(e)})

@app.route('/api/init', methods=['POST'])
def init_scraper():
    """스크래퍼 초기화"""
    try:
        success = scraper.init_driver()
        return jsonify({"success": success, "message": "스크래퍼가 초기화되었습니다." if success else "스크래퍼 초기화에 실패했습니다."})
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/login', methods=['POST'])
def login():
    """로그인"""
    try:
        data = request.get_json()
        username = data.get('username', 'test0137')
        password = data.get('password', '#test0808')
        
        return jsonify(scraper.login(username, password))
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/status', methods=['GET'])
def get_status():
    """현재 상태 확인"""
    try:
        return jsonify(scraper.get_current_status())
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/recruit', methods=['POST'])
def navigate_to_recruit():
    """채용공고 페이지로 이동"""
    try:
        result = scraper.navigate_to_recruit_page()
        return jsonify(result)
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/filter-it', methods=['POST'])
def filter_it_jobs():
    """IT개발 공고 필터링"""
    try:
        result = scraper.filter_it_jobs()
        return jsonify(result)
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/filter-bigdata-ai', methods=['POST'])
def filter_bigdata_ai():
    """빅데이터·AI 공고 필터링"""
    try:
        result = scraper.filter_bigdata_ai()
        return jsonify(result)
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/extract-jobs', methods=['GET'])
def extract_jobs():
    """IT개발 공고 목록 추출"""
    try:
        max_pages = request.args.get('max_pages', type=int)
        result = scraper.extract_job_list(max_pages=max_pages)
        return jsonify(result)
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/extract-first-page-jobs', methods=['GET'])
def extract_first_page_jobs():
    """첫 페이지에서 최대 10개 공고만 추출"""
    try:
        max_jobs = request.args.get('max_jobs', 10, type=int)
        result = scraper.extract_first_page_jobs(max_jobs=max_jobs)
        return jsonify(result)
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/homepage-jobs', methods=['GET'])
def get_homepage_jobs():
    """홈페이지용 공고 (IT개발 10개 + 빅데이터·AI 10개)"""
    try:
        results = {
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0
        }

        # 먼저 채용공고 페이지로 이동
        recruit_result = scraper.navigate_to_recruit_page()
        print(f"[DEBUG] 초기 채용공고 페이지 이동 결과: {recruit_result}")
        if not recruit_result.get('success'):
            print(f"[ERROR] 채용공고 페이지 이동 실패: {recruit_result.get('message')}")
            return jsonify({
                "success": False,
                "message": "채용공고 페이지로 이동할 수 없습니다.",
                "results": results
            })

        # 1. IT개발 공고 10개
        print("=== 홈페이지용 IT개발 공고 추출 ===")
        it_filter_result = scraper.filter_it_jobs()
        print(f"[DEBUG] IT 필터 결과: {it_filter_result}")
        if it_filter_result.get('success'):
            it_jobs_result = scraper.extract_first_page_jobs(max_jobs=10)
            print(f"[DEBUG] IT 공고 추출 결과: success={it_jobs_result.get('success')}, jobs={len(it_jobs_result.get('jobs', []))}")
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                print(f"IT개발: {results['total_it_jobs']}개 공고 추출")
        else:
            print(f"[ERROR] IT 필터 실패: {it_filter_result.get('message')}")
        
        # 2. 빅데이터·AI 공고 10개 (새로운 세션으로)
        print("=== 홈페이지용 빅데이터·AI 공고 추출 ===")
        # 채용공고 페이지로 다시 이동하여 필터 초기화
        recruit_result = scraper.navigate_to_recruit_page()
        print(f"[DEBUG] 채용공고 페이지 이동 결과: {recruit_result}")
        if recruit_result.get('success'):
            bigdata_filter_result = scraper.filter_bigdata_ai()
            print(f"[DEBUG] 빅데이터 필터 결과: {bigdata_filter_result}")
            if bigdata_filter_result.get('success'):
                bigdata_jobs_result = scraper.extract_first_page_jobs(max_jobs=10)
                print(f"[DEBUG] 빅데이터 공고 추출 결과: success={bigdata_jobs_result.get('success')}, jobs={len(bigdata_jobs_result.get('jobs', []))}")
                if bigdata_jobs_result.get('success'):
                    results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
                    results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
                    print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고 추출")
            else:
                print(f"[ERROR] 빅데이터 필터 실패: {bigdata_filter_result.get('message')}")
        else:
            print(f"[ERROR] 채용공고 페이지 이동 실패: {recruit_result.get('message')}")
        
        total_jobs = results["total_it_jobs"] + results["total_bigdata_ai_jobs"]
        
        return jsonify({
            "success": True,
            "message": f"홈페이지용 총 {total_jobs}개 공고를 추출했습니다. (IT개발: {results['total_it_jobs']}개, 빅데이터·AI: {results['total_bigdata_ai_jobs']}개)",
            "results": results
        })
        
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/search-company', methods=['POST'])
def search_company():
    """특정 기업의 공고 검색 (IT개발 + 빅데이터·AI)"""
    try:
        data = request.get_json()
        company_name = data.get('company_name', '')
        
        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})
        
        results = {
            "company_name": company_name,
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0
        }
        
        # 1. IT개발 공고 검색
        print(f"\n=== {company_name} 기업 IT개발 공고 검색 시작 ===")
        it_filter_result = scraper.filter_it_jobs()
        if it_filter_result.get('success'):
            it_jobs_result = scraper.extract_company_jobs(company_name)
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                print(f"IT개발: {results['total_it_jobs']}개 공고 발견")
        
        # 2. 빅데이터·AI 공고 검색
        print(f"\n=== {company_name} 기업 빅데이터·AI 공고 검색 시작 ===")
        bigdata_filter_result = scraper.filter_bigdata_ai()
        if bigdata_filter_result.get('success'):
            bigdata_jobs_result = scraper.extract_company_jobs(company_name)
            if bigdata_jobs_result.get('success'):
                results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
                results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
                print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고 발견")
        
        total_jobs = results["total_it_jobs"] + results["total_bigdata_ai_jobs"]
        
        return jsonify({
            "success": True, 
            "message": f"'{company_name}' 기업의 총 {total_jobs}개 공고를 찾았습니다. (IT개발: {results['total_it_jobs']}개, 빅데이터·AI: {results['total_bigdata_ai_jobs']}개)",
            "results": results
        })
        
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/job-detail', methods=['POST'])
def get_job_detail():
    """특정 공고의 상세 내용 추출"""
    try:
        data = request.get_json()
        job_url = data.get('job_url')
        
        if not job_url:
            return jsonify({
                "success": False,
                "error": "job_url이 필요합니다",
                "message": "공고 URL을 제공해주세요"
            })
        
        print(f"공고 상세 정보 추출 요청: {job_url}")
        
        # 공고 상세 정보 추출
        result = scraper.extract_job_detail(job_url)
        
        if result.get('success'):
            return jsonify({
                "success": True,
                "job_detail": result.get('job_detail'),
                "message": "공고 상세 정보 추출 완료"
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get('error'),
                "message": "공고 상세 정보 추출 실패"
            })
            
    except Exception as e:
        print(f"공고 상세 정보 추출 API 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "서버 오류가 발생했습니다"
        })

@app.route('/api/extract-all-jobs', methods=['GET'])
def extract_all_jobs():
    """IT개발 전체 + 빅데이터·AI 전체 공고 순차 수집"""
    try:
        results = {
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0,
            "total_pages_it": 0,
            "total_pages_bigdata_ai": 0
        }
        
        # 1. IT개발 전체 공고 수집
        print("=== IT개발 전체 공고 수집 시작 ===")
        it_filter_result = scraper.filter_it_jobs()
        if it_filter_result.get('success'):
            it_jobs_result = scraper.extract_job_list()
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                results["total_pages_it"] = it_jobs_result.get('total_pages', 0)
                print(f"IT개발: {results['total_it_jobs']}개 공고, {results['total_pages_it']}페이지 수집 완료")
        
        # 2. 빅데이터·AI 전체 공고 수집 (채용공고 페이지로 다시 이동)
        print("=== 빅데이터·AI 전체 공고 수집 시작 ===")
        recruit_result = scraper.navigate_to_recruit_page()
        if recruit_result.get('success'):
            bigdata_filter_result = scraper.filter_bigdata_ai()
            if bigdata_filter_result.get('success'):
                bigdata_jobs_result = scraper.extract_job_list()
                if bigdata_jobs_result.get('success'):
                    results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
                    results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
                    results["total_pages_bigdata_ai"] = bigdata_jobs_result.get('total_pages', 0)
                    print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고, {results['total_pages_bigdata_ai']}페이지 수집 완료")
        
        total_jobs = results["total_it_jobs"] + results["total_bigdata_ai_jobs"]
        total_pages = results["total_pages_it"] + results["total_pages_bigdata_ai"]
        
        return jsonify({
            "success": True,
            "message": f"전체 공고 수집 완료! 총 {total_jobs}개 공고, {total_pages}페이지 (IT개발: {results['total_it_jobs']}개, 빅데이터·AI: {results['total_bigdata_ai_jobs']}개)",
            "results": results
        })
        
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/search-company-info', methods=['POST'])
def search_company_info():
    """기업 검색 및 상세 정보 추출"""
    try:
        data = request.get_json()
        company_name = data.get('company_name', '')
        
        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})
        
        print(f"기업 정보 검색 요청: {company_name}")
        
        # 1. 기업 검색
        search_result = scraper.search_company(company_name)
        if not search_result.get('success'):
            return jsonify({
                "success": False,
                "message": search_result.get('message')
            })
        
        # 2. 기업 상세 정보 추출
        detail_result = scraper.extract_company_detail(search_result.get('company_url'))
        
        if detail_result.get('success'):
            return jsonify({
                "success": True,
                "company_detail": detail_result.get('company_detail'),
                "message": f"'{company_name}' 기업 정보 추출 완료"
            })
        else:
            return jsonify({
                "success": False,
                "error": detail_result.get('error'),
                "message": "기업 상세 정보 추출 실패"
            })
            
    except Exception as e:
        print(f"기업 정보 검색 API 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "서버 오류가 발생했습니다"
        })

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=3000, debug=True)
    except KeyboardInterrupt:
        scraper.close_driver()
