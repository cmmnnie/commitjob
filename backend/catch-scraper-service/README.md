# Catch Scraper Service

Selenium 기반 www.catch.co.kr 스크래핑 서비스

## Railway 배포 방법

### 1. Railway 프로젝트 생성
1. [Railway](https://railway.app) 로그인
2. "New Project" → "Deploy from GitHub repo" 선택
3. `backend/catch-scraper-service` 디렉토리 선택

### 2. 환경 변수 설정
Railway 프로젝트 설정에서 다음 환경 변수 추가:

```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASS=your-db-password
DB_NAME=commitjob
CHROME_BIN=/usr/bin/chromium
```

### 3. 빌드 설정
Railway는 자동으로 `nixpacks.toml` 파일을 인식하여:
- Chromium 및 ChromeDriver 설치
- Python 의존성 설치
- 서비스 시작

### 4. 배포 확인
- Railway가 자동으로 URL 생성 (예: `https://your-service.up.railway.app`)
- Health check: `GET /api/health`
- Init endpoint: `POST /api/init`

## 로컬 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 서비스 시작
python -u catch_scraper.py
```

## API 엔드포인트

### `/api/init` - 스크래퍼 초기화
```bash
POST /api/init
```

### `/api/search-company-info` - 회사 정보 검색
```bash
POST /api/search-company-info
Content-Type: application/json

{
  "company_name": "카카오"
}
```

## 주의사항

- Selenium headless 모드 필수
- Railway 무료 플랜: 500시간/월 제한
- Chromium + ChromeDriver 필요 (nixpacks.toml에 설정됨)
