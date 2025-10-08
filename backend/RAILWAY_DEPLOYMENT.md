# Catch Scraper Railway 배포 가이드

## 현재 상태
- ✅ Railway Catch Scraper 서비스 배포 완료
- ❌ Chromium 설치 실패 - nixpacks.toml의 apt 패키지 설치 미작동
- ✅ Dockerfile 추가 - 확실한 Chromium 설치 보장
- ✅ Backend 서버에 CATCH_SCRAPER_URL 환경 변수 설정 완료

## 배포 방법

### 1. Railway 프로젝트 설정

**중요: Dockerfile을 사용하도록 설정**

1. [Railway 대시보드](https://railway.app/dashboard) 접속
2. 기존 Catch Scraper 서비스 선택 또는 새 프로젝트 생성
3. **Settings → Build 섹션:**
   - Builder: **Docker** 선택 (Nixpacks 대신)
   - Root Directory: `backend`로 설정
4. Dockerfile이 자동으로 감지됩니다

### 2. 환경 변수 설정

Railway 프로젝트 **Variables** 탭에서 다음 환경 변수 추가:

```env
DB_HOST=database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASS=Woolim114!
DB_NAME=appdb
CHROME_BIN=/usr/bin/chromium
PORT=3000
```

### 3. 배포 파일 확인

다음 파일들이 `backend/` 디렉토리에 있어야 합니다:

- ✅ `Dockerfile` - Docker 이미지 빌드 설정 (Chromium 포함)
- ✅ `catch_scraper.py` - 메인 스크래퍼 코드
- ✅ `requirements.txt` - Python 의존성
- ⚠️ `nixpacks.toml` - 사용 안 함 (Docker 사용)
- ⚠️ `Procfile` - 사용 안 함 (Dockerfile의 CMD 사용)

### 4. 배포 및 확인

1. Railway가 자동으로 빌드 시작
2. 빌드 로그에서 다음 확인:
   - ✅ Chromium 설치 성공
   - ✅ Python 의존성 설치 성공
   - ✅ 서비스 시작 성공
3. Railway가 자동으로 도메인 생성 (예: `https://xxx.up.railway.app`)
4. 생성된 URL을 Backend 서비스의 `CATCH_SCRAPER_URL` 환경 변수에 설정

### 5. 테스트

배포 완료 후 다음 명령어로 테스트:

```bash
# 초기화 테스트
curl -X POST https://your-service.up.railway.app/api/init \
  -H "Content-Type: application/json" \
  -d "{}"

# 회사 검색 테스트
curl -X POST https://your-service.up.railway.app/api/search-company-info \
  -H "Content-Type: application/json" \
  -d '{"company_name":"카카오"}'
```

성공 시 200 응답과 JSON 데이터 반환됩니다.

## 문제 해결

### 404 "Application not found" 에러
- Railway 프로젝트가 생성되지 않았거나 배포 실패
- Root Directory가 `backend`로 설정되었는지 확인
- 빌드 로그에서 에러 확인

### Chromium 드라이버 에러
- `CHROME_BIN=/usr/bin/chromium` 환경 변수 확인
- `nixpacks.toml`에 chromium, chromium-driver 설정 확인

### 데이터베이스 연결 에러
- DB 환경 변수 (DB_HOST, DB_USER, DB_PASS, DB_NAME) 확인
- AWS RDS 보안 그룹에서 Railway IP 허용 확인

## 다음 단계

1. ✅ Railway에서 새 프로젝트 생성 (Root Directory: `backend`)
2. ✅ 환경 변수 설정
3. ✅ 배포 확인 및 URL 확보
4. ✅ Backend 서비스의 `CATCH_SCRAPER_URL` 환경 변수 업데이트
5. ✅ Backend 서비스 재배포
6. ✅ AI 면접 기능 테스트
