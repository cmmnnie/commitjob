# 채용공고 삽입 프로그램

## 📋 목표
특정 채용공고 URL을 입력받아 스크래핑하고 jobs 테이블에 저장

## 🚀 실행 방법

### 1. Python 직접 실행
```bash
cd C:\AI\mini\project\backend\catch-scraper-service
python insert_job.py <채용공고_URL>
```

### 2. 배치 파일 실행 (권장)
```bash
C:\AI\mini\project\backend\catch-scraper-service\insert_job.bat <채용공고_URL>
```

## 💡 사용 예시

### Catch.co.kr 채용공고
```bash
python insert_job.py https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567
```

### 배치 파일 사용
```bash
insert_job.bat https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567
```

## 📊 추출되는 정보

프로그램은 다음 정보를 자동으로 추출합니다:

1. **회사명** (company) - 필수
2. **채용공고 제목** (title) - 필수
3. **URL** (url) - 입력값
4. **카테고리** (category) - 자동 감지 (backend, frontend, fullstack, etc)
5. **직무 정보** (job_info) - 업무 내용, 자격 요건 등
6. **지원 조건** (conditions) - 필수/우대 조건
7. **등록 정보** (registration_info) - 마감일, 등록일 등
8. **스크래핑 시간** (scraped_at) - 자동 생성
9. **회사 검색 키** (company_search_key) - 자동 생성

## ✅ 실행 예시 출력

```
============================================================
📌 특정 채용공고 삽입 프로그램
============================================================

✅ Chrome 드라이버 초기화 성공

✅ AWS RDS MySQL 연결 성공

🔍 중복 체크 중...

📋 채용공고 페이지 로딩 중...
   URL: https://www.catch.co.kr/NCS/RecruitInfoDetail/100001234567

✅ 회사명: 카카오
✅ 제목: 백엔드 개발자 (Python/Django)
✅ 카테고리: backend
✅ 직무 정보: 1234자
✅ 지원 조건: 567자
✅ 등록 정보: 89자

============================================================
💾 DB 저장 중...
============================================================

✅ jobs 테이블에 저장 완료 (ID: 1151)

============================================================
✅ 완료!
   Job ID: 1151
   회사: 카카오
   제목: 백엔드 개발자 (Python/Django)
============================================================

✅ 리소스 정리 완료
```

## 🔧 주요 기능

### 1. 중복 방지
- URL 기준으로 중복 체크
- 이미 존재하는 공고는 자동으로 건너뜀

### 2. 자동 카테고리 감지
- URL 또는 제목에서 키워드 추출
- backend, frontend, fullstack 자동 분류
- 분류 불가능한 경우 'etc'로 저장

### 3. 다중 셀렉터 지원
- 여러 웹사이트 구조 대응
- 정보 추출 실패 시 빈 값으로 저장 (프로그램 계속 실행)

### 4. 회사 검색 키 자동 생성
- 띄어쓰기, 특수문자 제거
- 소문자 변환
- 회사 검색 최적화

## ⚠️ 주의사항

1. **URL 형식**: http:// 또는 https://로 시작해야 함
2. **Chrome 필요**: 최신 버전의 Chrome 브라우저 필수
3. **네트워크**: 안정적인 인터넷 연결 필요
4. **중복 저장**: 같은 URL은 한 번만 저장 가능

## 🔍 데이터 검증

삽입된 데이터 확인:

```bash
cd C:\AI\mini\project\backend\scripts
node query-by-column.js jobs company 카카오
```

특정 ID 확인:

```bash
node query-by-column.js jobs id 1151
```

## 💾 데이터베이스 구조

```sql
jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company VARCHAR(255) NOT NULL,           -- 회사명
  title VARCHAR(512) NOT NULL,             -- 채용공고 제목
  url VARCHAR(1024) NOT NULL,              -- 채용공고 URL
  category VARCHAR(50) NOT NULL,           -- 카테고리
  page INT DEFAULT 1,                      -- 페이지 번호
  job_info TEXT,                           -- 직무 정보
  conditions TEXT,                         -- 지원 조건
  registration_info TEXT,                  -- 등록 정보
  scraped_at DATETIME NOT NULL,            -- 스크래핑 시간
  company_search_key VARCHAR(255),         -- 회사 검색 키

  INDEX idx_company (company),
  INDEX idx_url (url(255)),
  INDEX idx_category (category),
  INDEX idx_scraped_at (scraped_at),
  INDEX idx_company_search_key (company_search_key)
)
```

## 📈 예상 소요 시간

- **단일 채용공고**: 약 10~15초
  - Chrome 초기화: 3~5초
  - 페이지 로딩: 3~5초
  - 데이터 추출 및 저장: 2~3초

## 🎯 실행 전 체크리스트

- [ ] Chrome 브라우저 최신 버전 설치
- [ ] Python 환경 설정 완료
- [ ] 필요한 라이브러리 설치 (`pip install selenium pymysql webdriver-manager`)
- [ ] AWS RDS MySQL 접속 가능 확인
- [ ] 안정적인 네트워크 환경
- [ ] 올바른 채용공고 URL 준비

## 🔄 실패 시 대처

### Chrome 드라이버 오류
- Chrome 브라우저 최신 버전으로 업데이트
- 관리자 권한으로 실행

### 스크래핑 실패
- URL이 올바른지 확인
- 해당 채용공고가 아직 유효한지 확인
- 수동으로 웹사이트 접속 테스트

### DB 연결 실패
- AWS RDS 접속 정보 확인
- 네트워크 연결 상태 확인

### 중복 오류
- 다른 URL 사용
- 또는 기존 데이터 삭제 후 재시도

## 📞 문제 해결

프로그램 실행 중 오류 발생 시:
1. 에러 메시지 확인
2. Chrome 브라우저 및 드라이버 버전 확인
3. 데이터베이스 연결 상태 확인
4. URL 형식 및 유효성 확인

---

**작성일**: 2025-10-14
**버전**: 1.0
**대상**: Catch.co.kr 및 기타 채용 사이트
