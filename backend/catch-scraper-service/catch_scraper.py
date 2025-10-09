from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, select, text, UniqueConstraint, func
from sqlalchemy.orm import sessionmaker, declarative_base

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
app.config['JSON_AS_ASCII'] = False
CORS(app)

# Simple in-memory cache (TTL-based)
CACHE_TTL_SECONDS = 300  # 5 minutes
CACHE = {}

def _get_cache(key):
    entry = CACHE.get(key)
    if entry and (time.time() - entry["ts"] < CACHE_TTL_SECONDS):
        return entry["data"]
    return None

def _set_cache(key, data):
    CACHE[key] = {"ts": time.time(), "data": data}

# =============================
# Database (MySQL/SQLite fallback)
# =============================

DB_URL = os.getenv("MYSQL_URL") or os.getenv("DATABASE_URL") or "sqlite:///catch.db"
engine = create_engine(DB_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)
Base = declarative_base()

CATEGORY_IT = "IT"
CATEGORY_BIGDATA_AI = "BIGDATA_AI"

class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint('url', 'category', name='uq_jobs_url_category'),)
    id = Column(Integer, primary_key=True)
    company = Column(String(255), index=True, nullable=False)
    title = Column(String(512), nullable=False)
    url = Column(String(1024), index=True, nullable=False)
    category = Column(String(50), index=True, nullable=False)
    page = Column(Integer, default=1)
    job_info = Column(Text)  # JSON string
    conditions = Column(Text)  # JSON string
    registration_info = Column(Text)  # JSON string
    scraped_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    company_search_key = Column(String(255), index=True)  # normalized key for company queries

def init_db():
    try:
        Base.metadata.create_all(engine)
        ensure_db_constraints()
        return True
    except Exception:
        return False

def ensure_db_constraints():
    try:
        with engine.begin() as conn:
            if engine.dialect.name == 'mysql':
                # 1) Add composite unique (ignore if exists)
                try:
                    conn.execute(text("ALTER TABLE jobs ADD UNIQUE KEY uq_jobs_url_category (url, category)"))
                except Exception:
                    pass
                # 2) Drop any unique index that enforces uniqueness only on url
                try:
                    idx_rows = conn.execute(text("SHOW INDEX FROM jobs WHERE Non_unique=0 AND Column_name='url'"))
                    for row in idx_rows:
                        key_name = row[2]  # Key_name
                        if key_name and key_name != 'uq_jobs_url_category':
                            try:
                                conn.execute(text(f"ALTER TABLE jobs DROP INDEX `{key_name}`"))
                            except Exception:
                                pass
                except Exception:
                    pass
            elif engine.dialect.name == 'sqlite':
                # Create composite unique index if not exists
                try:
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_url_category ON jobs (url, category)"))
                except Exception:
                    pass
    except Exception:
        pass

def get_db_session():
    return SessionLocal()

def _normalize_company_key(name: str) -> str:
    normalized = (name or "").strip().lower()
    # 공백/비분리 공백 제거로 '네이버클라우드' == '네이버 클라우드'
    try:
        normalized = normalized.replace("\u00A0", "").replace(" ", "")
    except Exception:
        pass
    return normalized

def _job_dict_to_model(job: dict, category: str, company_key: str = None) -> Job:
    return Job(
        company=job.get("company", ""),
        title=job.get("title", ""),
        url=job.get("url", ""),
        category=category,
        page=job.get("page", 1),
        job_info=json.dumps(job.get("job_info", []), ensure_ascii=False),
        conditions=json.dumps(job.get("conditions", []), ensure_ascii=False),
        registration_info=json.dumps(job.get("registration_info", []), ensure_ascii=False),
        scraped_at=datetime.utcnow(),
        company_search_key=company_key or _normalize_company_key(job.get("company", ""))
    )

def _model_to_job_dict(m: Job) -> dict:
    return {
        "title": m.title,
        "company": m.company,
        "job_info": json.loads(m.job_info) if m.job_info else [],
        "conditions": json.loads(m.conditions) if m.conditions else [],
        "registration_info": json.loads(m.registration_info) if m.registration_info else [],
        "url": m.url,
        "page": m.page
    }

def upsert_jobs(job_list: list, category: str, company_key: str = None) -> int:
    if not job_list:
        return 0
    saved = 0
    with get_db_session() as db:
        for job in job_list:
            url = job.get("url")
            if not url:
                continue
            existing = db.execute(select(Job).where(Job.url == url, Job.category == category)).scalar_one_or_none()
            if existing:
                existing.company = job.get("company", existing.company)
                existing.title = job.get("title", existing.title)
                # 기존 레코드의 카테고리는 유지하여 다른 카테고리 저장 시 덮어쓰지 않음
                existing.page = job.get("page", existing.page)
                existing.job_info = json.dumps(job.get("job_info", []), ensure_ascii=False)
                existing.conditions = json.dumps(job.get("conditions", []), ensure_ascii=False)
                existing.registration_info = json.dumps(job.get("registration_info", []), ensure_ascii=False)
                existing.scraped_at = datetime.utcnow()
                normalized_key = company_key or _normalize_company_key(job.get("company", ""))
                existing.company_search_key = normalized_key
            else:
                db.add(_job_dict_to_model(job, category, company_key))
            saved += 1
        db.commit()
    return saved

def fetch_latest_jobs_by_category(category: str, limit: int = 10) -> list:
    with get_db_session() as db:
        rows = db.execute(
            select(Job).where(Job.category == category).order_by(Job.scraped_at.desc()).limit(limit * 3)
        ).scalars().all()
        # 중복(URL) 제거 후 상위 limit만 반환
        seen = set()
        deduped = []
        for r in rows:
            if r.url in seen:
                continue
            seen.add(r.url)
            deduped.append(_model_to_job_dict(r))
            if len(deduped) == limit:
                break
        return deduped

def fetch_company_jobs(company_name: str, category: str, limit: int = 200) -> list:
    key = _normalize_company_key(company_name)
    with get_db_session() as db:
        rows = db.execute(
            select(Job).where(Job.category == category, Job.company_search_key == key).order_by(Job.scraped_at.desc()).limit(limit * 3)
        ).scalars().all()
        seen = set()
        deduped = []
        for r in rows:
            if r.url in seen:
                continue
            seen.add(r.url)
            deduped.append(_model_to_job_dict(r))
            if len(deduped) == limit:
                break
        return deduped

def fetch_company_jobs_like(company_query: str, category: str, limit: int = 200) -> list:
    query_text = (company_query or '').strip()
    if not query_text:
        return []
    # 공백/노브레이크 스페이스 제거 버전 동시 매칭
    compact_query = _normalize_company_key(query_text)
    pattern = f"%{query_text}%"
    compact_pattern = f"%{compact_query}%"
    with get_db_session() as db:
        rows = db.execute(
            select(Job)
            .where(
                Job.category == category,
                (
                    Job.company.like(pattern) |
                    Job.company.like(compact_pattern) |
                    (Job.company_search_key == compact_query)
                )
            )
            .order_by(Job.scraped_at.desc())
            .limit(limit * 4)
        ).scalars().all()
        seen = set()
        deduped = []
        for r in rows:
            if r.url in seen:
                continue
            seen.add(r.url)
            deduped.append(_model_to_job_dict(r))
            if len(deduped) == limit:
                break
        return deduped

def fetch_all_by_category(category: str, limit: int = None) -> list:
    with get_db_session() as db:
        query = select(Job).where(Job.category == category).order_by(Job.scraped_at.desc())
        if limit:
            query = query.limit(limit * 3)
        rows = db.execute(query).scalars().all()
        seen = set()
        deduped = []
        for r in rows:
            if r.url in seen:
                continue
            seen.add(r.url)
            deduped.append(_model_to_job_dict(r))
            if limit and len(deduped) == limit:
                break
        return deduped

class CatchScraper:
    def __init__(self):
        self.driver = None
        self.is_logged_in = False
        
    def _wait_for_stable_elements(self, by, selector, timeout_seconds=5.0, settle_seconds=0.6):
        """요소 개수가 안정화될 때까지 짧게 폴링하여 최종 리스트를 반환"""
        import time
        start = time.time()
        last_count = -1
        stable_since = time.time()
        elements = []
        while time.time() - start < timeout_seconds:
            try:
                elements = self.driver.find_elements(by, selector)
            except Exception:
                elements = []
            count = len(elements)
            if count == 0:
                time.sleep(0.2)
                continue
            if count == last_count:
                if time.time() - stable_since >= settle_seconds:
                    return elements
            else:
                last_count = count
                stable_since = time.time()
            time.sleep(0.2)
        return elements

    def init_driver(self):
        """Chrome 드라이버 초기화"""
        try:
            import os
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--disable-features=VizDisplayCompositor')
            chrome_options.add_argument('--remote-debugging-port=9222')
            chrome_options.add_argument('--disable-background-timer-throttling')
            chrome_options.add_argument('--disable-renderer-backgrounding')
            chrome_options.add_argument('--disable-backgrounding-occluded-windows')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

            # Railway 환경에서 Chromium 바이너리 경로 설정
            # 여러 가능한 경로 시도
            possible_paths = [
                os.environ.get('CHROME_BIN'),
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable'
            ]

            chromium_path = None
            for path in possible_paths:
                if path and os.path.exists(path):
                    chromium_path = path
                    chrome_options.binary_location = chromium_path
                    print(f"[DRIVER] Using Chromium at: {chromium_path}")
                    break

            if not chromium_path:
                print(f"[DRIVER] Warning: No Chromium binary found. Tried: {possible_paths}")

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

            self.driver.set_page_load_timeout(30)
            self.driver.implicitly_wait(10)

            print("[DRIVER] Chrome 드라이버 초기화 성공")
            return True
        except Exception as e:
            print(f"[DRIVER] Chrome 드라이버 초기화 실패: {str(e)}")
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
    
    def _is_page_changed(self, driver, previous_first_job_key):
        """페이지가 실제로 변경되었는지 확인
        previous_first_job_key: 이전 첫 공고의 식별 키 (title|url)
        """
        try:
            # 현재 첫 번째 공고의 제목과 URL을 키로 구성
            current_title = ""
            try:
                current_title = driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]").text.strip()
            except Exception:
                pass
            current_url = ""
            try:
                link_el = driver.find_element(By.XPATH, "//tbody//tr[1]//a[contains(@href, 'RecruitInfoDetails')]")
                current_url = link_el.get_attribute('href') or ""
            except Exception:
                pass
            current_key = f"{current_title}|{current_url}"
            
            # 이전 키와 다르면 페이지가 변경된 것
            if current_key != previous_first_job_key and current_title != "":
                print(f"페이지 변경 확인: '{previous_first_job_key}' -> '{current_key}'")
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

    def _wait_for_job_rows(self, min_count=10, timeout=10):
        """Wait until at least min_count job rows are present."""
        try:
            WebDriverWait(self.driver, timeout, poll_frequency=0.2).until(
                lambda d: len(d.find_elements(By.XPATH, "//tbody//tr")) >= min_count
            )
            return True
        except Exception:
            return False
    
    def login(self, username='test0137', password='#test0808'):
        """CATCH 사이트 로그인"""
        try:
            print(f"🔐 Catch.co.kr 로그인 시도 시작 (사용자: {username})")
            self.driver.get(BASE_URL)

            wait = WebDriverWait(self.driver, 15)
            login_button = self._find_element_with_fallbacks(wait, SELECTORS['login_button'])
            if not login_button:
                print("❌ 로그인 버튼을 찾을 수 없습니다")
                return {"success": False, "message": "로그인 버튼을 찾을 수 없습니다."}

            self.driver.execute_script("arguments[0].click();", login_button)
            print("로그인 버튼 클릭 완료")

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
            print("로그인 정보 입력 및 제출 완료")

            try:
                WebDriverWait(self.driver, 15).until(
                    lambda driver: "Login" not in driver.current_url or
                    len(driver.find_elements(By.ID, "id_login")) == 0
                )
                self.is_logged_in = True
                print(f"✅ Catch.co.kr 로그인 성공 (사용자: {username})")
                return {"success": True, "message": "로그인 성공"}
            except Exception as login_wait_error:
                print(f"❌ 로그인 대기 중 오류: {str(login_wait_error)}")
                try:
                    error_msg = self.driver.find_element(By.CLASS_NAME, 'error-message').text
                    print(f"❌ 로그인 실패 (서버 에러 메시지): {error_msg}")
                    return {"success": False, "message": error_msg}
                except Exception:
                    current_url = self.driver.current_url
                    msg = "로그인 실패 - 로그인 페이지에 머물러 있음" if 'login' in current_url else "로그인 상태 확인 실패"
                    print(f"❌ {msg} (현재 URL: {current_url})")
                    return {"success": False, "message": msg}

        except Exception as e:
            print(f"❌ 로그인 예외 발생: {str(e)}")
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

    def apply_company_search_on_recruit(self, company_name: str):
        """채용공고 페이지 상단 검색창으로 기업명 검색 적용"""
        try:
            wait = WebDriverWait(self.driver, 10)

            # 검색 입력창 후보들 시도 (명시적 id='search' 우선)
            input_candidates = [
                (By.ID, "search"),
                (By.XPATH, "//input[@id='search']"),
                (By.XPATH, "//input[contains(@placeholder,'기업명') or contains(@placeholder,'키워드') or contains(@placeholder,'검색')]"),
                (By.XPATH, "//div[contains(@class,'search')]//input[@type='text']"),
                (By.XPATH, "//input[@type='search']"),
            ]

            search_input = None
            for by, sel in input_candidates:
                try:
                    search_input = wait.until(EC.presence_of_element_located((by, sel)))
                    if search_input:
                        break
                except Exception:
                    continue

            if not search_input:
                return {"success": False, "message": "채용공고 페이지 검색 입력창을 찾을 수 없습니다."}

            # 입력 및 제출: 엔터 1회로 검색 트리거
            try:
                self.driver.execute_script("arguments[0].focus();", search_input)
                search_input.click()
                # 값 초기화와 input 이벤트 발생 (Nuxt/Vue 반응성 보장)
                self.driver.execute_script("arguments[0].value=''; arguments[0].dispatchEvent(new Event('input', {bubbles:true}));", search_input)
                search_input.send_keys(company_name)
                self.driver.execute_script("arguments[0].dispatchEvent(new Event('input', {bubbles:true}));", search_input)
                # 최소 지연 제거
                search_input.send_keys(Keys.ENTER)
                # 폴백 최소 지연 제거
                # 폴백: 검색 버튼이 있으면 클릭
                try:
                    search_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class,'search_text_wrap')]//button[contains(@class,'btn') or @type='button']")))
                    self.driver.execute_script("arguments[0].click();", search_btn)
                except Exception:
                    pass
            except Exception:
                search_input.send_keys(Keys.RETURN)

            # 결과 로딩 대기 (최소 일부 행 등장)
            loaded = self._wait_for_job_rows(min_count=1, timeout=6)
            # 폴백 지연 제거

            return {"success": True, "message": f"'{company_name}' 기업 검색 적용 완료"}

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
                    # 현재 페이지의 첫 번째 공고 키(제목|URL) 저장
                    first_title = ""
                    first_url = ""
                    try:
                        first_title = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]").text.strip()
                    except Exception:
                        pass
                    try:
                        first_url = self.driver.find_element(By.XPATH, "//tbody//tr[1]//a[contains(@href, 'RecruitInfoDetails')]").get_attribute('href') or ""
                    except Exception:
                        pass
                    first_job_key = f"{first_title}|{first_url}"

                    # 숫자 페이지 버튼 우선
                    next_page_number = current_page + 1
                    page_btn = None
                    try:
                        page_btn = self.driver.find_element(By.XPATH, f"//p[contains(@class, 'page3')]//a[normalize-space(text())='{next_page_number}']")
                    except Exception:
                        page_btn = None

                    if page_btn and page_btn.is_enabled():
                        print(f"숫자 버튼으로 페이지 {next_page_number} 이동 시도...")
                        self.driver.execute_script("document.body.click();")
                        import time
                        time.sleep(1.0)
                        self.driver.execute_script("arguments[0].click();", page_btn)
                        WebDriverWait(self.driver, 15).until(
                            lambda driver: self._is_page_changed(driver, first_job_key)
                        )
                        import time
                        time.sleep(0.5)

                        # 페이지가 실제로 변경되었는지 확인
                        new_title = ""
                        new_url = ""
                        try:
                            new_title = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]").text.strip()
                        except Exception:
                            pass
                        try:
                            new_url = self.driver.find_element(By.XPATH, "//tbody//tr[1]//a[contains(@href, 'RecruitInfoDetails')]").get_attribute('href') or ""
                        except Exception:
                            pass
                        new_key = f"{new_title}|{new_url}"

                        if new_key == first_job_key:
                            print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                            break

                        current_page += 1
                        print(f"숫자 버튼으로 페이지 {current_page} 이동 완료")
                    else:
                        # 숫자 버튼이 없으면 '다음' 버튼 시도
                        next_page_btn = self._find_element_with_fallbacks(wait, SELECTORS['next_page'])
                        if next_page_btn and next_page_btn.is_enabled():
                            print(f"다음 버튼으로 페이지 {next_page_number} 이동 시도...")
                            self.driver.execute_script("document.body.click();")
                            import time
                            time.sleep(1.0)
                            self.driver.execute_script("arguments[0].click();", next_page_btn)
                            WebDriverWait(self.driver, 15).until(
                                lambda driver: self._is_page_changed(driver, first_job_key)
                            )
                            import time
                            time.sleep(0.5)
                            new_title = ""
                            new_url = ""
                            try:
                                new_title = self.driver.find_element(By.XPATH, "//tbody//tr[1]//p[contains(@class, 'subj2')]").text.strip()
                            except Exception:
                                pass
                            try:
                                new_url = self.driver.find_element(By.XPATH, "//tbody//tr[1]//a[contains(@href, 'RecruitInfoDetails')]").get_attribute('href') or ""
                            except Exception:
                                pass
                            new_key = f"{new_title}|{new_url}"
                            if new_key == first_job_key:
                                print(f"페이지가 변경되지 않음. 마지막 페이지({current_page})에 도달했습니다.")
                                break
                            current_page += 1
                            print(f"다음 버튼으로 페이지 {current_page} 이동 완료")
                        else:
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
            
            # 고정 대기 제거
            
            job_detail = {
                "company_name": "",
                "job_title": "",
                "job_type": "",
                "location": "",
                "career_level": "",
                "education": "",
                "job_description": "",
                "apply_url": "",
                "deadline": "",
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
                apply_element = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(@class, 'gtm-recruitDetail-apply-homepage')]")))
                
                # 버튼 클릭 전 현재 URL 저장
                current_url = self.driver.current_url
                print(f"클릭 전 URL: {current_url}")
                
                # 새 탭에서 열기 위해 JavaScript 실행
                self.driver.execute_script("arguments[0].click();", apply_element)
                # 고정 대기 제거, 아래 탭 전환/URL 변화로 확인
                
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

            # 정규화 함수: 띄어쓰기 제거, 소문자 변환
            def normalize_name(name):
                return name.replace('\u00A0', '').replace(' ', '').lower()

            normalized_input = normalize_name(company_name)
            target_company_url = None
            matched_name = None

            # 1차 시도: 정규화된 이름으로 정확 매칭
            for link in company_links:
                company_text = link.text.strip()
                if normalize_name(company_text) == normalized_input:
                    target_company_url = link.get_attribute('href')
                    matched_name = company_text
                    print(f"정확한 기업명 매칭 성공: '{company_name}' → '{company_text}'")
                    break

            # 2차 시도: 정규화된 이름으로 부분 매칭 (정확한 매칭 실패 시)
            if not target_company_url:
                for link in company_links:
                    company_text = link.text.strip()
                    if normalized_input in normalize_name(company_text) or normalize_name(company_text) in normalized_input:
                        target_company_url = link.get_attribute('href')
                        matched_name = company_text
                        print(f"부분 매칭으로 기업 발견: '{company_name}' → '{company_text}'")
                        break

            if not target_company_url:
                available_companies = [link.text.strip() for link in company_links[:5]]
                return {
                    "success": False,
                    "message": f"'{company_name}' 기업을 찾을 수 없습니다. 검색 결과: {', '.join(available_companies)}"
                }

            print(f"✅ 기업 정보 페이지 URL: {target_company_url}")

            return {
                "success": True,
                "company_url": target_company_url,
                "matched_name": matched_name,
                "message": f"'{company_name}' 기업을 찾았습니다. (실제 매칭: '{matched_name}')"
            }
            
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
                # 기업 추천 키워드 추출 (다중 폴백)
                keyword_xpaths = [
                    "//div[@class='corp_info_recom']//a[@class='bt']",
                    "//section[contains(@class,'recom') or contains(@class,'corp_info_recom')]//a",
                    "//div[contains(@class,'recom')]//a"
                ]
                keyword_elements = []
                for xp in keyword_xpaths:
                    try:
                        keyword_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, xp)))
                        if keyword_elements:
                            break
                    except Exception:
                        continue
                company_detail["recommendation_keywords"] = [e.text.strip() for e in keyword_elements] if keyword_elements else []
            except Exception:
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
            
            # 현직자 리뷰 수집 비활성화 (회사 정보만 수집)
            print("현직자 리뷰 수집 생략 - 회사 정보만 수집합니다.")
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

    def extract_interview_questions(self, company_url, max_questions=10):
        """기업 면접 질문 추출 (최대 10개) - 면접후기 탭 사용"""
        try:
            # URL을 InterviewReview 경로로 변환 (CompSummary → InterviewReview)
            interview_review_url = company_url.replace('/CompSummary/', '/InterviewReview/')

            print(f"📋 기업 정보 페이지: {company_url}")
            print(f"📋 면접후기 페이지로 변환: {interview_review_url}")

            self.driver.get(interview_review_url)
            print(f"✅ 면접후기 페이지 이동 완료")

            wait = WebDriverWait(self.driver, 10)

            # 페이지 로딩 대기
            import time
            time.sleep(3)

            print("면접후기 페이지 로딩 완료")
            time.sleep(2)  # 콘텐츠 로딩 대기

            # 면접 질문 수집
            interview_questions = []

            try:
                # JavaScript로 면접 질문 추출
                questions = self.driver.execute_script(
                    """
                    const questions = [];
                    const questionElements = document.querySelectorAll('.corp_interview_list li');

                    questionElements.forEach((li) => {
                        const questionText = li.querySelector('.question');
                        const answerText = li.querySelector('.answer');
                        const dateText = li.querySelector('.date');
                        const positionText = li.querySelector('.position, .info');

                        if (questionText) {
                            questions.push({
                                question: questionText.textContent.trim().replace('Q.', '').trim(),
                                answer: answerText ? answerText.textContent.trim().replace('A.', '').trim() : '',
                                date: dateText ? dateText.textContent.trim() : '',
                                position: positionText ? positionText.textContent.trim() : ''
                            });
                        }
                    });

                    return questions;
                    """
                ) or []

                # 최대 10개로 제한
                interview_questions = questions[:max_questions]
                print(f"면접 질문 {len(interview_questions)}개 추출 완료 (최대 {max_questions}개)")

            except Exception as e:
                print(f"면접 질문 추출 실패: {e}")
                # 대체 XPath로 시도
                try:
                    question_elements = wait.until(EC.presence_of_all_elements_located((By.XPATH, "//ul[@class='corp_interview_list']//li")))

                    for elem in question_elements[:max_questions]:
                        try:
                            question = elem.find_element(By.CLASS_NAME, "question").text.strip()
                            answer = ""
                            date = ""
                            position = ""

                            try:
                                answer = elem.find_element(By.CLASS_NAME, "answer").text.strip()
                            except:
                                pass

                            try:
                                date = elem.find_element(By.CLASS_NAME, "date").text.strip()
                            except:
                                pass

                            try:
                                position = elem.find_element(By.CLASS_NAME, "position").text.strip()
                            except:
                                try:
                                    position = elem.find_element(By.CLASS_NAME, "info").text.strip()
                                except:
                                    pass

                            interview_questions.append({
                                "question": question.replace('Q.', '').strip(),
                                "answer": answer.replace('A.', '').strip(),
                                "date": date,
                                "position": position
                            })

                        except Exception as elem_error:
                            print(f"개별 면접 질문 추출 실패: {elem_error}")
                            continue

                    print(f"대체 방법으로 면접 질문 {len(interview_questions)}개 추출")

                except Exception as fallback_error:
                    print(f"대체 방법도 실패: {fallback_error}")

            if len(interview_questions) == 0:
                return {
                    "success": False,
                    "message": "면접 질문을 찾을 수 없습니다. 해당 기업의 면접 후기가 없을 수 있습니다."
                }

            return {
                "success": True,
                "questions": interview_questions,
                "total_count": len(interview_questions),
                "message": f"{len(interview_questions)}개의 면접 질문 추출 완료"
            }

        except Exception as e:
            print(f"면접 질문 추출 중 오류 발생: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "면접 질문 추출 실패"
            }

scraper = CatchScraper()
init_db()

def _handle_api_error(e):
    """API 에러 처리 헬퍼 함수"""
    return jsonify({"success": False, "message": str(e)})

@app.route('/api/init', methods=['POST'])
def init_scraper():
    """스크래퍼 초기화"""
    try:
        print("[INIT] 🚀 Catch Scraper 초기화 요청 받음")
        driver_ok = scraper.init_driver()
        print(f"[INIT] Chromium Driver 초기화: {'✅ 성공' if driver_ok else '❌ 실패'}")
        db_ok = init_db()
        print(f"[INIT] Database 초기화: {'✅ 성공' if db_ok else '❌ 실패'}")

        if driver_ok and db_ok:
            print("[INIT] ✅ Catch Scraper 초기화 완료")
        else:
            print("[INIT] ⚠️ 일부 초기화 실패")

        return jsonify({
            "success": driver_ok and db_ok,
            "driver": driver_ok,
            "db": db_ok,
            "message": "스크래퍼/DB 초기화 완료" if (driver_ok and db_ok) else "일부 초기화 실패"
        })
    except Exception as e:
        print(f"[INIT] 초기화 예외 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return _handle_api_error(e)

@app.route('/api/login', methods=['POST'])
def login():
    """로그인"""
    try:
        data = request.get_json()
        username = data.get('username', 'test0137')
        password = data.get('password', '#test0808')

        print(f"[LOGIN] Catch.co.kr 로그인 시도: 사용자={username}")
        result = scraper.login(username, password)

        if result.get('success'):
            print(f"[LOGIN] ✅ Catch.co.kr 로그인 성공: {username}")
        else:
            print(f"[LOGIN] ❌ Catch.co.kr 로그인 실패: {result.get('message', '알 수 없는 오류')}")

        return jsonify(result)
    except Exception as e:
        print(f"[LOGIN] ❌ 로그인 예외 발생: {str(e)}")
        return _handle_api_error(e)

# ==================================
# DB 조회/관리 전용 엔드포인트
# ==================================

@app.route('/api/db/homepage', methods=['GET'])
def db_homepage_jobs():
    try:
        it_jobs = fetch_latest_jobs_by_category(CATEGORY_IT, limit=10)
        bd_jobs = fetch_latest_jobs_by_category(CATEGORY_BIGDATA_AI, limit=10)

        # 카테고리별로는 10/10 유지하되, 보여줄 때는 URL 기준 중복 제거하여 합쳐서 반환
        # 합친 리스트에서 중복 제거(교집합 제거)
        seen = set()
        merged = []
        for item in it_jobs + bd_jobs:
            if item["url"] in seen:
                continue
            seen.add(item["url"])
            merged.append(item)
        return jsonify({
            "success": True,
            "results": {
                "it_jobs": it_jobs,
                "bigdata_ai_jobs": bd_jobs,
                "total_it_jobs": len(it_jobs),
                "total_bigdata_ai_jobs": len(bd_jobs),
                "total_unique_jobs": len(merged),
                "unique_jobs": merged
            }
        })
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/db/company-jobs', methods=['POST'])
def db_company_jobs():
    try:
        data = request.get_json(silent=True) or {}
        company_name = data.get('company_name') or request.args.get('company_name') or request.form.get('company_name') or ''
        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})
        # 부분 일치 검색으로 전환 (전체 DB 적재 전제)
        it_jobs = fetch_company_jobs_like(company_name, CATEGORY_IT, limit=200)
        bd_jobs = fetch_company_jobs_like(company_name, CATEGORY_BIGDATA_AI, limit=200)
        # URL 기준 중복 제거된 합쳐진 목록
        seen = set()
        unique_jobs = []
        for item in it_jobs + bd_jobs:
            url = item.get("url")
            if url and url not in seen:
                seen.add(url)
                unique_jobs.append(item)
        return jsonify({
            "success": True,
            "results": {
                "company_name": company_name,
                "it_jobs": it_jobs,
                "bigdata_ai_jobs": bd_jobs,
                "total_it_jobs": len(it_jobs),
                "total_bigdata_ai_jobs": len(bd_jobs),
                "total_unique_jobs": len(unique_jobs),
                "unique_jobs": unique_jobs
            }
        })
    except Exception as e:
        return _handle_api_error(e)

# GET 쿼리 파라미터 버전 (인코딩 이슈 회피용)
@app.route('/api/db/company-jobs', methods=['GET'])
def db_company_jobs_get():
    try:
        company_name = request.args.get('company_name', '')
        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})
        it_jobs = fetch_company_jobs_like(company_name, CATEGORY_IT, limit=200)
        bd_jobs = fetch_company_jobs_like(company_name, CATEGORY_BIGDATA_AI, limit=200)
        seen = set()
        unique_jobs = []
        for item in it_jobs + bd_jobs:
            url = item.get("url")
            if url and url not in seen:
                seen.add(url)
                unique_jobs.append(item)
        return jsonify({
            "success": True,
            "results": {
                "company_name": company_name,
                "it_jobs": it_jobs,
                "bigdata_ai_jobs": bd_jobs,
                "total_it_jobs": len(it_jobs),
                "total_bigdata_ai_jobs": len(bd_jobs),
                "total_unique_jobs": len(unique_jobs),
                "unique_jobs": unique_jobs
            }
        })
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/db/refresh/homepage', methods=['POST'])
def db_refresh_homepage():
    """홈페이지 섹션(IT 10 + BIGDATA_AI 10) 최신화 강제 스크랩 후 저장"""
    try:
        # 스크랩 수행
        recruit_init_result = scraper.navigate_to_recruit_page()
        if not recruit_init_result.get('success'):
            return jsonify(recruit_init_result)

        # IT 10
        it_saved = 0
        if scraper.filter_it_jobs().get('success'):
            it_jobs = scraper.extract_first_page_jobs(max_jobs=10)
            if it_jobs.get('success'):
                try:
                    it_saved = upsert_jobs(it_jobs.get('jobs', []), CATEGORY_IT)
                except Exception:
                    it_saved = 0

        # BIGDATA_AI 10
        bd_saved = 0
        recruit_result = scraper.navigate_to_recruit_page()
        if recruit_result.get('success') and scraper.filter_bigdata_ai().get('success'):
            bd_jobs = scraper.extract_first_page_jobs(max_jobs=10)
            if bd_jobs.get('success'):
                try:
                    bd_saved = upsert_jobs(bd_jobs.get('jobs', []), CATEGORY_BIGDATA_AI)
                except Exception:
                    bd_saved = 0

        return jsonify({
            "success": True,
            "message": f"홈페이지 데이터 갱신 완료 (IT 저장 {it_saved}건, BIGDATA_AI 저장 {bd_saved}건)",
        })
    except Exception as e:
        return _handle_api_error(e)

@app.route('/api/db/refresh/all', methods=['POST'])
def db_refresh_all():
    """IT개발 전체 + 빅데이터·AI 전체 페이지를 스크랩하여 DB에 저장"""
    try:
        max_pages = request.args.get('max_pages', type=int)
        # 채용공고 페이지로 이동
        recruit_init_result = scraper.navigate_to_recruit_page()
        if not recruit_init_result.get('success'):
            return jsonify(recruit_init_result)

        it_saved = 0
        print("=== IT개발 전체 공고 수집/저장 ===")
        if scraper.filter_it_jobs().get('success'):
            it_jobs_result = scraper.extract_job_list(max_pages=max_pages)
            if it_jobs_result.get('success'):
                try:
                    it_saved = upsert_jobs(it_jobs_result.get('jobs', []), CATEGORY_IT)
                except Exception:
                    it_saved = 0

        bd_saved = 0
        print("=== 빅데이터·AI 전체 공고 수집/저장 ===")
        recruit_result = scraper.navigate_to_recruit_page()
        if recruit_result.get('success') and scraper.filter_bigdata_ai().get('success'):
            bd_jobs_result = scraper.extract_job_list(max_pages=max_pages)
            if bd_jobs_result.get('success'):
                try:
                    bd_saved = upsert_jobs(bd_jobs_result.get('jobs', []), CATEGORY_BIGDATA_AI)
                except Exception:
                    bd_saved = 0

        return jsonify({
            "success": True,
            "message": f"전체 데이터 갱신 완료 (IT 저장 {it_saved}건, BIGDATA_AI 저장 {bd_saved}건)",
        })
    except Exception as e:
        return _handle_api_error(e)

# (삭제됨) /api/db/refresh/company: 전체 DB 적재를 기본으로 하므로 별도 1페이지 저장은 제거

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
        # 1) DB 우선 조회 (빠른 응답)
        it_from_db = fetch_latest_jobs_by_category(CATEGORY_IT, limit=10)
        bd_from_db = fetch_latest_jobs_by_category(CATEGORY_BIGDATA_AI, limit=10)
        if len(it_from_db) == 10 and len(bd_from_db) == 10:
            total_jobs = len(it_from_db) + len(bd_from_db)
            response = {
                "success": True,
                "message": f"홈페이지용 공고를 DB에서 빠르게 반환했습니다. 총 {total_jobs}개 (IT개발: {len(it_from_db)}개, 빅데이터·AI: {len(bd_from_db)}개)",
                "results": {
                    "it_jobs": it_from_db,
                    "bigdata_ai_jobs": bd_from_db,
                    "total_it_jobs": len(it_from_db),
                    "total_bigdata_ai_jobs": len(bd_from_db)
                }
            }
            return jsonify(response)

        # 2) 캐시 확인 (드라이버 사용 이전)
        cache_key = "homepage_jobs_v1"
        cached = _get_cache(cache_key)
        if cached:
            return jsonify(cached)

        # 3) 스크랩으로 보완 (DB 데이터 부족 시)
        recruit_init_result = scraper.navigate_to_recruit_page()
        if not recruit_init_result.get('success'):
            return jsonify(recruit_init_result)

        results = {
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0
        }
        
        # 1. IT개발 공고 10개
        print("=== 홈페이지용 IT개발 공고 추출 ===")
        it_filter_result = scraper.filter_it_jobs()
        if it_filter_result.get('success'):
            it_jobs_result = scraper.extract_first_page_jobs(max_jobs=10)
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                print(f"IT개발: {results['total_it_jobs']}개 공고 추출")
                # DB 저장
                try:
                    upsert_jobs(results["it_jobs"], CATEGORY_IT)
                except Exception:
                    pass
        
        # 2. 빅데이터·AI 공고 10개 (새로운 세션으로)
        print("=== 홈페이지용 빅데이터·AI 공고 추출 ===")
        # 채용공고 페이지로 다시 이동하여 필터 초기화
        recruit_result = scraper.navigate_to_recruit_page()
        if recruit_result.get('success'):
            bigdata_filter_result = scraper.filter_bigdata_ai()
            if bigdata_filter_result.get('success'):
                bigdata_jobs_result = scraper.extract_first_page_jobs(max_jobs=10)
                if bigdata_jobs_result.get('success'):
                    results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
                    results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
                    print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고 추출")
                    # DB 저장
                    try:
                        upsert_jobs(results["bigdata_ai_jobs"], CATEGORY_BIGDATA_AI)
                    except Exception:
                        pass
        
        total_jobs = results["total_it_jobs"] + results["total_bigdata_ai_jobs"]
        
        response = {
            "success": True,
            "message": f"홈페이지용 총 {total_jobs}개 공고를 추출했습니다. (IT개발: {results['total_it_jobs']}개, 빅데이터·AI: {results['total_bigdata_ai_jobs']}개)",
            "results": results
        }

        _set_cache(cache_key, response)
        return jsonify(response)
        
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
        
        # 채용공고 페이지로 이동 보장
        recruit_init_result = scraper.navigate_to_recruit_page()
        if not recruit_init_result.get('success'):
            return jsonify(recruit_init_result)
        
        # 1) DB 우선 조회
        company_key = _normalize_company_key(company_name)
        it_from_db = fetch_company_jobs(company_name, CATEGORY_IT, limit=200)
        bd_from_db = fetch_company_jobs(company_name, CATEGORY_BIGDATA_AI, limit=200)
        if it_from_db or bd_from_db:
            return jsonify({
                "success": True,
                "message": f"DB에서 '{company_name}' 기업 공고를 빠르게 반환했습니다. (IT개발: {len(it_from_db)}개, 빅데이터·AI: {len(bd_from_db)}개)",
                "results": {
                    "company_name": company_name,
                    "it_jobs": it_from_db,
                    "bigdata_ai_jobs": bd_from_db,
                    "total_it_jobs": len(it_from_db),
                    "total_bigdata_ai_jobs": len(bd_from_db)
                }
            })

        results = {
            "company_name": company_name,
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0
        }
        
        # 1. IT개발 공고 검색 (직무 필터 → 상단 검색창 기업명 적용)
        print(f"\n=== {company_name} 기업 IT개발 공고 검색 시작 ===")
        it_filter_result = scraper.filter_it_jobs()
        if it_filter_result.get('success'):
            search_apply_result = scraper.apply_company_search_on_recruit(company_name)
            if not search_apply_result.get('success'):
                print(search_apply_result.get('message'))
            # 회사명 필터가 확실히 적용되도록 회사명 기반 추출(1페이지만)
            it_jobs_result = scraper.extract_company_jobs(company_name, max_pages=1)
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                print(f"IT개발: {results['total_it_jobs']}개 공고 발견")
                # DB 저장
                try:
                    upsert_jobs(results["it_jobs"], CATEGORY_IT, company_key)
                except Exception:
                    pass
        
        # 2. 빅데이터·AI 공고 검색 (검색 유지 → 직무 필터만 전환 → 1페이지만 수집)
        print(f"\n=== {company_name} 기업 빅데이터·AI 공고 검색 시작 ===")
        bigdata_filter_result = scraper.filter_bigdata_ai()
        if bigdata_filter_result.get('success'):
            # 카테고리 전환 시 검색어가 유지되지 않는 경우가 있어 항상 재적용
            search_apply_result2 = scraper.apply_company_search_on_recruit(company_name)
            if not search_apply_result2.get('success'):
                print(search_apply_result2.get('message'))
            bigdata_jobs_result = scraper.extract_company_jobs(company_name, max_pages=1)
        else:
            bigdata_jobs_result = {"success": False}

        if bigdata_jobs_result.get('success'):
            results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
            results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
            print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고 발견")
            # DB 저장
            try:
                upsert_jobs(results["bigdata_ai_jobs"], CATEGORY_BIGDATA_AI, company_key)
            except Exception:
                pass
        
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
        # Optional page limit to speed up heavy calls
        max_pages = request.args.get('max_pages', type=int)

        results = {
            "it_jobs": [],
            "bigdata_ai_jobs": [],
            "total_it_jobs": 0,
            "total_bigdata_ai_jobs": 0,
            "total_pages_it": 0,
            "total_pages_bigdata_ai": 0
        }
        
        # DB 우선: 이미 저장된 데이터가 있다면 즉시 반환
        it_from_db = fetch_all_by_category(CATEGORY_IT)
        bd_from_db = fetch_all_by_category(CATEGORY_BIGDATA_AI)
        if it_from_db or bd_from_db:
            results["it_jobs"] = it_from_db
            results["bigdata_ai_jobs"] = bd_from_db
            results["total_it_jobs"] = len(it_from_db)
            results["total_bigdata_ai_jobs"] = len(bd_from_db)
            # URL 기준 중복 제거 합본 추가
            seen = set()
            merged = []
            for item in it_from_db + bd_from_db:
                url = item.get("url")
                if url and url not in seen:
                    seen.add(url)
                    merged.append(item)
            results["unique_jobs"] = merged
            results["total_unique_jobs"] = len(merged)
            # total_pages_*는 의미가 모호해지므로 0으로 유지
            return jsonify({
                "success": True,
                "message": f"DB에서 전체 공고를 빠르게 반환했습니다. 총 {len(it_from_db) + len(bd_from_db)}개",
                "results": results
            })

        # 채용공고 페이지로 이동 보장 (DB에 없을 때만 스크랩)
        recruit_init_result = scraper.navigate_to_recruit_page()
        if not recruit_init_result.get('success'):
            return jsonify(recruit_init_result)

        # 1. IT개발 전체 공고 수집
        print("=== IT개발 전체 공고 수집 시작 ===")
        it_filter_result = scraper.filter_it_jobs()
        if it_filter_result.get('success'):
            it_jobs_result = scraper.extract_job_list(max_pages=max_pages)
            if it_jobs_result.get('success'):
                results["it_jobs"] = it_jobs_result.get('jobs', [])
                results["total_it_jobs"] = len(results["it_jobs"])
                results["total_pages_it"] = it_jobs_result.get('total_pages', 0)
                print(f"IT개발: {results['total_it_jobs']}개 공고, {results['total_pages_it']}페이지 수집 완료")
                try:
                    upsert_jobs(results["it_jobs"], CATEGORY_IT)
                except Exception:
                    pass
        
        # 2. 빅데이터·AI 전체 공고 수집 (채용공고 페이지로 다시 이동)
        print("=== 빅데이터·AI 전체 공고 수집 시작 ===")
        recruit_result = scraper.navigate_to_recruit_page()
        if recruit_result.get('success'):
            bigdata_filter_result = scraper.filter_bigdata_ai()
            if bigdata_filter_result.get('success'):
                bigdata_jobs_result = scraper.extract_job_list(max_pages=max_pages)
                if bigdata_jobs_result.get('success'):
                    results["bigdata_ai_jobs"] = bigdata_jobs_result.get('jobs', [])
                    results["total_bigdata_ai_jobs"] = len(results["bigdata_ai_jobs"])
                    results["total_pages_bigdata_ai"] = bigdata_jobs_result.get('total_pages', 0)
                    print(f"빅데이터·AI: {results['total_bigdata_ai_jobs']}개 공고, {results['total_pages_bigdata_ai']}페이지 수집 완료")
                    try:
                        upsert_jobs(results["bigdata_ai_jobs"], CATEGORY_BIGDATA_AI)
                    except Exception:
                        pass
        
        # URL 기준 중복 제거 합본 추가
        seen = set()
        merged = []
        for item in results["it_jobs"] + results["bigdata_ai_jobs"]:
            url = item.get("url")
            if url and url not in seen:
                seen.add(url)
                merged.append(item)
        results["unique_jobs"] = merged
        results["total_unique_jobs"] = len(merged)

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
        data = request.get_json(silent=True) or {}
        company_name = data.get('company_name', '')
        
        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})
        
        print(f"기업 정보 검색 요청: {company_name}")
        
        # 1. 기업 검색 (띄어쓰기 무시를 위해 원문+정규화 키 모두 시도)
        search_result = scraper.search_company(company_name)
        if not search_result.get('success'):
            normalized_name = company_name.replace('\u00A0','').replace(' ','')
            search_result = scraper.search_company(normalized_name)
        if not search_result.get('success'):
            return jsonify({
                "success": False,
                "message": search_result.get('message')
            })
        
        # 매칭된 실제 회사명 추출
        matched_name = search_result.get('matched_name', company_name)
        print(f"입력한 회사명: '{company_name}' → 매칭된 회사명: '{matched_name}'")

        # 2. 기업 상세 정보 추출
        detail_result = scraper.extract_company_detail(search_result.get('company_url'))

        if detail_result.get('success'):
            company_detail = detail_result.get('company_detail')

            # 리뷰 수집 비활성화 (빈 배열 유지)
            if company_detail and 'reviews' in company_detail:
                company_detail['reviews'] = []
                print(f"리뷰 수집 비활성화 - 회사 정보만 반환")

            return jsonify({
                "success": True,
                "company_info": {
                    "description": company_detail.get('company_name', ''),
                    "culture": f"업종: {company_detail.get('industry', '')} | 규모: {company_detail.get('company_type', '')} | 위치: {company_detail.get('location', '')}"
                },
                "reviews": company_detail.get('reviews', []),
                "company_detail": company_detail,
                "matched_name": matched_name,
                "input_name": company_name,
                "message": f"'{company_name}' 기업 정보 추출 완료 (실제 매칭: '{matched_name}')"
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

@app.route('/api/search-interview-questions', methods=['POST'])
def search_interview_questions():
    """기업 면접 질문 검색 및 추출 (최대 10개)"""
    try:
        data = request.get_json(silent=True) or {}
        company_name = data.get('company_name', '')
        max_questions = data.get('max_questions', 10)

        if not company_name:
            return jsonify({"success": False, "message": "기업명을 입력해주세요."})

        # 최대 질문 수 제한 (1~20 범위)
        if max_questions < 1 or max_questions > 20:
            max_questions = 10

        print(f"[INTERVIEW-Q] 📝 면접 질문 검색 요청: {company_name} (최대 {max_questions}개)")

        # 1. 기업 검색 (띄어쓰기 무시를 위해 원문+정규화 키 모두 시도)
        print(f"[INTERVIEW-Q] 🔍 기업 검색 중: {company_name}")
        search_result = scraper.search_company(company_name)
        if not search_result.get('success'):
            normalized_name = company_name.replace('\u00A0','').replace(' ','')
            print(f"[INTERVIEW-Q] 정규화된 이름으로 재시도: {normalized_name}")
            search_result = scraper.search_company(normalized_name)

        if not search_result.get('success'):
            print(f"[INTERVIEW-Q] ❌ 기업 검색 실패: {search_result.get('message')}")
            return jsonify({
                "success": False,
                "message": search_result.get('message')
            })

        # 매칭된 실제 회사명 추출
        matched_name = search_result.get('matched_name', company_name)
        print(f"[INTERVIEW-Q] ✅ 기업 검색 성공: '{company_name}' → '{matched_name}'")

        # 2. 면접 질문 추출
        print(f"[INTERVIEW-Q] 📋 면접 질문 추출 시작 (목표: {max_questions}개)")
        interview_result = scraper.extract_interview_questions(
            search_result.get('company_url'),
            max_questions=max_questions
        )

        if interview_result.get('success'):
            total_questions = interview_result.get('total_count', 0)
            print(f"[INTERVIEW-Q] ✅ 면접 질문 추출 성공: {total_questions}개 수집")
            return jsonify({
                "success": True,
                "questions": interview_result.get('questions', []),
                "total_count": total_questions,
                "matched_name": matched_name,
                "input_name": company_name,
                "message": interview_result.get('message')
            })
        else:
            print(f"[INTERVIEW-Q] ❌ 면접 질문 추출 실패: {interview_result.get('message')}")
            return jsonify({
                "success": False,
                "error": interview_result.get('error'),
                "message": interview_result.get('message')
            })

    except Exception as e:
        print(f"면접 질문 검색 API 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "서버 오류가 발생했습니다"
        })

@app.route('/api/debug', methods=['GET'])
def debug_environment():
    """환경 디버깅 엔드포인트"""
    import os
    import subprocess

    debug_info = {
        "chrome_bin_env": os.environ.get('CHROME_BIN', 'Not set'),
        "python_version": subprocess.getoutput('python --version'),
        "paths_checked": []
    }

    # 가능한 Chromium 경로들 확인
    possible_paths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ]

    for path in possible_paths:
        exists = os.path.exists(path)
        debug_info["paths_checked"].append({
            "path": path,
            "exists": exists
        })

    # which chromium 실행
    debug_info["which_chromium"] = subprocess.getoutput('which chromium')
    debug_info["which_chromium_browser"] = subprocess.getoutput('which chromium-browser')
    debug_info["chromium_version"] = subprocess.getoutput('chromium --version 2>&1')

    return jsonify(debug_info)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 3000))
    try:
        app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
    except KeyboardInterrupt:
        scraper.close_driver()
