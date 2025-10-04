# 백엔드 배포 가이드 (Railway)

## 현재 배포 상태
- **백엔드 URL**: https://commitjob-backend.up.railway.app
- **프론트엔드 URL**: https://commitjob-frontend.vercel.app

---

## Railway 환경변수 설정

Railway 대시보드에서 다음 환경변수를 설정해야 합니다:

### 1. Railway 대시보드 접속
https://railway.app 접속 → 프로젝트 선택 → **Variables** 탭 클릭

### 2. 필수 환경변수 설정

```bash
# 프론트엔드 CORS 설정 (✨ 가장 중요!)
FRONTEND_ORIGIN=https://commitjob-frontend.vercel.app,http://localhost:5173,http://localhost:3000

# 데이터베이스
DATABASE_URL=postgresql://username:password@host:port/database
# (Railway PostgreSQL 플러그인 사용 시 자동 설정됨)

# 카카오 OAuth
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# JWT 인증
JWT_SECRET=your-super-secret-jwt-key-here

# 서버 설정
PORT=4001
NODE_ENV=production
HOST=0.0.0.0
```

### 3. FRONTEND_ORIGIN 상세 설명

이 환경변수는 **쉼표로 구분**하여 여러 도메인을 허용합니다:

```
FRONTEND_ORIGIN=https://commitjob-frontend.vercel.app,http://localhost:5173,http://localhost:3000
```

**포함해야 할 도메인들:**
- ✅ `https://commitjob-frontend.vercel.app` (Vercel 프로덕션)
- ✅ `http://localhost:5173` (Vite 개발 서버)
- ✅ `http://localhost:3000` (기타 개발 서버)

---

## Railway 배포 방법

### 방법 1: GitHub 자동 배포 (권장)

1. **Railway 프로젝트에 GitHub 연동**
   - Railway 대시보드 → Settings → "Connect to GitHub"
   - `cmmnnie/commitjob` 저장소 선택
   - **Root Directory**: `backend` 설정

2. **자동 배포 활성화**
   - Settings → "Automatic Deployments" 활성화
   - Branch: `main` 선택

3. **배포 트리거**
   - `backend/` 폴더의 파일이 변경되면 자동 재배포

### 방법 2: Railway CLI 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
cd backend
railway link

# 배포
railway up
```

---

## 데이터베이스 설정

### Railway PostgreSQL 추가

1. Railway 대시보드에서 **"New" → "Database" → "PostgreSQL"**
2. 자동으로 `DATABASE_URL` 환경변수가 설정됨
3. 데이터베이스 마이그레이션 실행 필요:

```bash
# 로컬에서 Railway DB에 연결하여 마이그레이션
railway run node migrate-to-rds.js
```

또는 Railway 대시보드에서 직접 SQL 실행:
```sql
-- backend/database-setup.sql 파일 내용 복사하여 실행
```

---

## 배포 확인

### 1. Health Check
```bash
curl https://commitjob-backend.up.railway.app/health
```

응답 예시:
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

### 2. CORS 설정 확인
```bash
curl https://commitjob-backend.up.railway.app/debug/cors
```

응답에서 `allowedOrigins`에 Vercel 도메인이 포함되어 있는지 확인:
```json
{
  "allowedOrigins": [
    "https://commitjob-frontend.vercel.app",
    "http://localhost:5173"
  ]
}
```

### 3. 카카오 로그인 URL 테스트
```bash
curl "https://commitjob-backend.up.railway.app/auth/kakao/login-url?origin=https://commitjob-frontend.vercel.app"
```

---

## 트러블슈팅

### CORS 오류가 발생하는 경우

1. **Railway Variables 확인**
   - `FRONTEND_ORIGIN`이 올바르게 설정되었는지 확인
   - 쉼표 뒤에 공백이 없는지 확인

2. **재배포**
   - 환경변수 변경 후 Railway에서 자동으로 재배포됨
   - 또는 "Redeploy" 버튼 클릭

3. **로그 확인**
   - Railway 대시보드 → Deployments → 최신 배포 선택
   - Logs에서 `[CORS]` 로그 확인

### DATABASE_URL 오류

Railway PostgreSQL 플러그인이 자동으로 설정하지만, 수동 설정이 필요한 경우:
```
postgresql://username:password@host:port/database
```

---

## 다음 단계

백엔드 배포 완료 후:
1. ✅ Railway 환경변수 설정
2. ✅ 배포 확인 (health check)
3. 🔄 카카오 개발자 콘솔 설정 (다음 문서 참조)
