# Catch 스크래핑 서비스 통합 완료 보고서

##  개요
Catch 웹사이트에서 실시간 채용공고를 수집하여 GPT 기반 맞춤 추천을 제공하는 시스템 통합 완료

##  완료된 작업

### 1. Catch 스크래핑 서비스 (포트 3000)
- **위치**: `/Users/cmmnnie/Downloads/catch 3/`
- **파일**: `catch_scraper.py`
- **기능**:
  - Selenium 기반 Catch 웹사이트 크롤링
  - IT개발 10개 + 빅데이터/AI 10개 공고 수집
  - `/api/init`, `/api/login`, `/api/homepage-jobs` 엔드포인트 제공

### 2. 백엔드 API 서버 (포트 4001)
- **위치**: `/Users/cmmnnie/Dev/test/캡스톤/backend/`
- **파일**: `server.js`
- **주요 변경사항**:
  - Catch 서비스 연동 (init, login, homepage-jobs 호출)
  - 로그인 후 3초 대기 추가 (브라우저 안정화)
  - 타임아웃 60초로 증가
  - `/api/main-recommendations` 엔드포인트에서 Catch 데이터 수집

### 3. MCP GPT 추천 서비스 (포트 4002)
- **위치**: `/Users/cmmnnie/Dev/test/캡스톤/mcp-recs-service/`
- **파일**: `server.js`
- **기능**:
  - ChatGPT-4 기반 공고 추천
  - 사용자 프로필과 공고 매칭
  - 각 공고별 5가지 매칭 이유 + 상세 분석 생성

##  주요 수정 사항

### Catch 스크래퍼 (catch_scraper.py)
```python
# 1. Headless 모드 비활성화 (브라우저 렌더러 문제 해결)
# chrome_options.add_argument('--headless')  # 주석 처리

# 2. Page load strategy 개선
chrome_options.page_load_strategy = 'eager'

# 3. 랜덤 디버그 포트 사용 (포트 충돌 방지)
debug_port = random.randint(9223, 9999)
chrome_options.add_argument(f'--remote-debugging-port={debug_port}')

# 4. 채용공고 페이지로 먼저 이동
recruit_result = scraper.navigate_to_recruit_page()

# 5. 상세 디버그 로깅 추가
print(f"[DEBUG] IT 필터 결과: {it_filter_result}")
print(f"[ERROR] IT 필터 실패: {it_filter_result.get('message')}")
```

### 백엔드 서버 (server.js)
```javascript
// 1. 로그인 타임아웃 증가 및 대기 시간 추가
await axios.post('http://localhost:3000/api/login', {
  username: 'test0137',
  password: '#test0808'
}, { timeout: 60000 });
console.log('[MAIN-RECS] Catch 로그인 완료');
await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기

// 2. Catch 데이터 파싱
const itJobs = catchResponse.data.results.it_jobs || [];
const bigdataJobs = catchResponse.data.results.bigdata_ai_jobs || [];
```

##  API 흐름

```
사용자 요청
    ↓
백엔드 /api/main-recommendations
    ↓
Catch 서비스 (localhost:3000)
    ├─ POST /api/init (Chrome 드라이버 초기화)
    ├─ POST /api/login (Catch 로그인)
    └─ GET /api/homepage-jobs (20개 공고 수집)
    ↓
MCP 서비스 (localhost:4002)
    └─ POST /tools/rerank_jobs (GPT 추천)
    ↓
최종 응답 (5개 맞춤 추천)
```

##  API 응답 예시

```json
{
  "IT": [
    {
      "id": "catch_1759390861126_0.9308755799792061",
      "title": "IT 분야 (IT 개발, IT 운영, 정보보안) 직원 채용",
      "company": "김앤장법률사무소",
      "experience": "신입/경력",
      "skills": ["네트워크/서버/보안", "빅데이터/AI", "DBA/데이터베이스 외"],
      "salary": "회사내규에 따름",
      "match_reasons": [
        "기술매칭: Node.js/React/MySQL 관련 업무 가능",
        "경력매칭: 신입 지원 가능",
        "직무매칭: IT 직무에 직접 부합",
        "급여매칭: 로펌 계열로 경쟁적일 가능성",
        "지역매칭: 서울 본사로 지역 선호와 부합"
      ],
      "detailed_analysis": "김앤장법률사무소의 IT 공고는 사용자의 기술스택이 실제로 적용될 수 있는 개발/운영 포지션을 포함합니다...",
      "powered_by": "GPT-5-mini + Catch Data"
    }
  ]
}
```

##  실행 방법

### 1. Catch 스크래퍼 시작
```bash
cd "/Users/cmmnnie/Downloads/catch 3"
python catch_scraper.py
```

### 2. MCP 추천 서비스 시작
```bash
cd /Users/cmmnnie/Dev/test/캡스톤/mcp-recs-service
node server.js > /tmp/mcp.log 2>&1 &
```

### 3. 백엔드 서버 시작
```bash
cd /Users/cmmnnie/Dev/test/캡스톤/backend
node server.js > /tmp/backend.log 2>&1 &
```

### 4. API 테스트
```bash
curl "http://localhost:4001/api/main-recommendations?user_id=1&jobType=%EB%B9%85%EB%8D%B0%EC%9D%B4%ED%84%B0%2FAI"
```

##  주의사항

1. **Chrome 브라우저**: Catch 스크래퍼는 headless 모드가 비활성화되어 브라우저 창이 화면에 표시됩니다
2. **로그인 정보**: Catch 계정 (test0137 / #test0808) 필요
3. **타임아웃**: 첫 요청 시 3-4분 소요 (Catch 초기화 + 로그인 + 크롤링)
4. **포트 사용**: 3000 (Catch), 4001 (백엔드), 4002 (MCP)

##  성능

- **공고 수집**: IT 10개 + 빅데이터/AI 10개 = 총 20개
- **처리 시간**: 약 3분 (초기화 + 로그인 + 크롤링 + GPT 분석)
- **GPT 분석**: 각 공고별 5가지 매칭 이유 + 상세 분석

##  로그 확인

```bash
# 백엔드 로그
tail -f /tmp/backend.log

# MCP 로그
tail -f /tmp/mcp.log

# Catch 터미널에서 실시간 확인
```

##  향후 개선 사항

1. Catch 세션 재사용 (init/login을 매번 하지 않도록)
2. Headless 모드 재활성화 (프로덕션 환경)
3. 공고 캐싱 (동일 요청 시 재크롤링 방지)
4. 에러 핸들링 강화


