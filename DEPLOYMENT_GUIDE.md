# CommitJob 배포 가이드

## 🎯 배포 개요

- **백엔드:** Railway.app (Node.js Express 서버)
- **프론트엔드:** Vercel 또는 Netlify (정적 파일 호스팅)
- **데이터베이스:** AWS RDS (MySQL) - 이미 설정됨

---

## 📦 백엔드 배포 (Railway)

### Railway 선택 이유:
- ✅ 무료 플랜 제공
- ✅ 자동 HTTPS 지원
- ✅ 환경 변수 관리 쉬움
- ✅ GitHub 연동 자동 배포
- ✅ 데이터베이스 연결 간편

### 1단계: Railway 회원가입 및 프로젝트 생성

1. **Railway 사이트 접속:**
   ```
   https://railway.app
   ```

2. **GitHub으로 로그인**

3. **New Project 클릭**

4. **Deploy from GitHub repo 선택**
   - 백엔드 코드가 있는 리포지토리 선택
   - 또는 로컬에서 배포 가능

### 2단계: 백엔드 설정 파일 추가

프로젝트 루트에 `railway.json` 파일이 이미 있습니다:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3단계: 환경 변수 설정

Railway Dashboard → Variables 탭에서 다음 환경 변수 설정:

```bash
# 기본 설정
NODE_ENV=production
PORT=4001

# 프론트엔드 Origin (배포 후 실제 도메인으로 변경)
FRONTEND_ORIGIN=https://commitjob.site,https://www.commitjob.site,https://YOUR_VERCEL_DOMAIN.vercel.app

# Google OAuth (카카오 개발자 콘솔에서 발급)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/google/callback

# Kakao OAuth (카카오 개발자 콘솔에서 발급)
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
KAKAO_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/kakao/callback

# JWT Secret (강력한 비밀키로 변경!)
JWT_SECRET=your-super-strong-secret-key-here-change-this

# AWS RDS 데이터베이스 (이미 설정됨)
DB_HOST=database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASS=Woolim114!
DB_NAME=appdb

# MCP 서비스 (필요시)
MCP_INGEST_BASE=https://YOUR_RAILWAY_DOMAIN.railway.app
MCP_RECS_BASE=https://YOUR_RAILWAY_DOMAIN.railway.app
```

### 4단계: 배포

```bash
# Railway CLI 설치 (선택사항)
npm install -g @railway/cli

# 로그인
railway login

# 백엔드 디렉토리로 이동
cd backend

# 배포
railway up
```

또는 GitHub에 푸시하면 자동 배포:
```bash
git add .
git commit -m "Deploy backend to Railway"
git push origin main
```

### 5단계: 배포 확인

Railway가 제공하는 도메인으로 접속:
```
https://YOUR_PROJECT_NAME.railway.app/health
```

응답:
```json
{
  "status": "ok",
  "message": "Backend is healthy!"
}
```

### 6단계: 커스텀 도메인 설정 (선택사항)

Railway Dashboard → Settings → Domains:
1. **Add Custom Domain** 클릭
2. `api.commitjob.site` 입력
3. DNS 레코드 설정:
   ```
   Type: CNAME
   Name: api
   Value: YOUR_PROJECT_NAME.railway.app
   ```

---

## 🌐 프론트엔드 배포 (Vercel)

### Vercel 선택 이유:
- ✅ 무료 HTTPS
- ✅ 자동 배포
- ✅ CDN 제공
- ✅ 빠른 속도

### 1단계: Vercel 준비

1. **Vercel 사이트 접속:**
   ```
   https://vercel.com
   ```

2. **GitHub으로 로그인**

### 2단계: 프론트엔드 설정 파일 확인

`kakao-login-app/vercel.json` 생성:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 3단계: config.js 수정

Railway에서 받은 백엔드 도메인으로 수정:

```javascript
const CONFIG = {
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://YOUR_RAILWAY_DOMAIN.railway.app',  // Railway 도메인으로 변경

    // ... 나머지 설정
};
```

### 4단계: 배포

**방법 1: Vercel CLI 사용**
```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프론트엔드 디렉토리로 이동
cd kakao-login-app

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

**방법 2: Vercel Dashboard 사용**
1. Vercel Dashboard → **New Project**
2. **Import Git Repository** 선택
3. 리포지토리 선택
4. **Root Directory:** `kakao-login-app` 설정
5. **Deploy** 클릭

### 5단계: 배포 확인

Vercel이 제공하는 도메인으로 접속:
```
https://YOUR_PROJECT_NAME.vercel.app/index.html
```

### 6단계: 커스텀 도메인 설정 (선택사항)

Vercel Dashboard → Settings → Domains:
1. **Add Domain** 클릭
2. `commitjob.site` 또는 `www.commitjob.site` 입력
3. DNS 레코드 설정:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

---

## 🔐 카카오 개발자 콘솔 업데이트

### 1. Redirect URI 업데이트

카카오 개발자 콘솔 → 내 애플리케이션 → 카카오 로그인 → Redirect URI:

**기존 (로컬):**
```
http://localhost:4001/auth/kakao/callback
```

**추가 (프로덕션):**
```
https://YOUR_RAILWAY_DOMAIN.railway.app/auth/kakao/callback
https://api.commitjob.site/auth/kakao/callback
```

### 2. 웹 사이트 도메인 업데이트

플랫폼 → Web → 사이트 도메인:

**추가:**
```
https://YOUR_VERCEL_DOMAIN.vercel.app
https://commitjob.site
https://www.commitjob.site
```

### 3. 설정 저장 및 활성화

카카오 로그인 → 활성화 설정 → **ON**

---

## ✅ 배포 완료 체크리스트

### 백엔드 (Railway):
- [ ] Railway 프로젝트 생성 완료
- [ ] 환경 변수 모두 설정
- [ ] `JWT_SECRET` 강력한 키로 변경
- [ ] 배포 성공 (녹색 체크)
- [ ] `/health` 엔드포인트 응답 확인
- [ ] 데이터베이스 연결 확인
- [ ] 카스텀 도메인 설정 (선택사항)

### 프론트엔드 (Vercel):
- [ ] `config.js`에 백엔드 URL 업데이트
- [ ] Vercel 배포 완료
- [ ] 페이지 로드 확인
- [ ] 카스텀 도메인 설정 (선택사항)

### 카카오 개발자 콘솔:
- [ ] Redirect URI 프로덕션 URL 추가
- [ ] 웹 사이트 도메인 프로덕션 URL 추가
- [ ] 카카오 로그인 활성화

### 테스트:
- [ ] 프론트엔드 페이지 로드
- [ ] "카카오로 로그인" 버튼 클릭
- [ ] 카카오 로그인 완료
- [ ] 콜백 처리 성공
- [ ] 사용자 정보 표시
- [ ] 로그아웃 테스트

---

## 🔧 배포 후 설정 업데이트

### 백엔드 환경 변수 최종 업데이트

Railway Dashboard → Variables:

```bash
# 프론트엔드 Origin (Vercel 도메인 추가)
FRONTEND_ORIGIN=https://commitjob.site,https://www.commitjob.site,https://YOUR_VERCEL_DOMAIN.vercel.app

# Kakao Redirect URI (Railway 도메인)
KAKAO_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/kakao/callback

# Google Redirect URI (Railway 도메인)
GOOGLE_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/google/callback
```

### 프론트엔드 config.js 최종 업데이트

`kakao-login-app/config.js`:

```javascript
const CONFIG = {
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://YOUR_RAILWAY_DOMAIN.railway.app',  // 실제 Railway 도메인

    // ... 나머지 설정
};
```

---

## 🚨 중요 보안 사항

### 1. JWT Secret 변경
`.env`의 `JWT_SECRET`을 강력한 키로 변경:
```bash
# 랜덤 키 생성 (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. 환경 변수 절대 커밋 금지
`.gitignore`에 `.env` 포함 확인:
```
.env
.env.local
.env.production
```

### 3. HTTPS 필수
프로덕션에서는 반드시 HTTPS 사용 (Railway, Vercel 자동 제공)

### 4. CORS 설정 확인
프로덕션에서 와일드카드(`*`) 제거, 실제 도메인만 허용

---

## 📊 배포 아키텍처

```
┌─────────────────┐
│   사용자         │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Vercel        │
│ (프론트엔드)     │  ← https://commitjob.site
│ HTML/JS/CSS     │
└────────┬────────┘
         │ API 요청
         │ HTTPS
         ▼
┌─────────────────┐
│   Railway       │
│ (백엔드)         │  ← https://YOUR_PROJECT.railway.app
│ Node.js/Express │
└────────┬────────┘
         │ SQL
         │ TCP
         ▼
┌─────────────────┐
│   AWS RDS       │
│ (데이터베이스)   │  ← database-1.xxx.rds.amazonaws.com
│ MySQL           │
└─────────────────┘
```

---

## 🐛 배포 후 문제 해결

### 문제 1: 백엔드 500 에러
**확인:**
- Railway 로그 확인
- 환경 변수 설정 확인
- 데이터베이스 연결 확인

**해결:**
```bash
# Railway CLI로 로그 확인
railway logs
```

### 문제 2: CORS 오류
**확인:**
- 백엔드 `FRONTEND_ORIGIN`에 프론트엔드 도메인 포함 확인
- 브라우저 콘솔에서 정확한 오류 확인

**해결:**
Railway Variables에서 `FRONTEND_ORIGIN` 업데이트 후 재배포

### 문제 3: 카카오 로그인 실패
**확인:**
- 카카오 개발자 콘솔 Redirect URI 확인
- 백엔드 `KAKAO_REDIRECT_URI` 확인

**해결:**
Redirect URI가 정확히 일치하는지 확인 (끝에 `/` 없어야 함)

### 문제 4: 쿠키가 전송되지 않음
**확인:**
- HTTPS 사용 확인
- `sameSite: "lax"` 설정 확인
- `credentials: "include"` 설정 확인

**해결:**
백엔드 `server.js`에서 쿠키 설정 확인:
```javascript
res.cookie("app_session", token, {
  httpOnly: true,
  secure: true,  // HTTPS에서만
  sameSite: "lax",
  // ...
});
```

---

## 📞 추가 지원

배포 중 문제 발생 시:
1. Railway 로그 확인: `railway logs`
2. Vercel 로그 확인: Vercel Dashboard → Deployments → Logs
3. 브라우저 개발자 도구 콘솔 확인
4. 백엔드 API 직접 테스트: `curl https://YOUR_RAILWAY_DOMAIN.railway.app/health`

---

## 🎉 배포 완료!

축하합니다! 배포가 완료되면:

**프론트엔드:** `https://commitjob.site` 또는 `https://YOUR_VERCEL_DOMAIN.vercel.app`
**백엔드:** `https://YOUR_RAILWAY_DOMAIN.railway.app`

카카오 로그인을 테스트하고 모든 기능이 정상 작동하는지 확인하세요!
