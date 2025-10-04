# 카카오 로그인 앱 - 배포 가이드

## 📦 배포 준비

### 1. 프로덕션 설정 변경

#### `config.js` 수정:
```javascript
const CONFIG = {
    // 프로덕션 백엔드 URL (배포 후 실제 도메인으로 변경)
    BACKEND_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:4001'
        : 'https://api.commitjob.site',  // 또는 실제 백엔드 도메인

    KAKAO_JS_KEY: 'e25fbc640864f7b5a58315285f7e464d',
    APP_ORIGIN: window.location.origin,

    // 로그인 성공/실패 후 리다이렉트 경로
    LOGIN_SUCCESS_REDIRECT: '/index.html',
    LOGIN_FAIL_REDIRECT: '/index.html?error=login_failed',

    API: {
        KAKAO_LOGIN_URL: '/auth/kakao/login-url',
        USER_INFO: '/api/me',
        LOGOUT: '/api/logout'
    }
};
```

---

## 🌐 배포 방법

### 방법 1: GitHub Pages (정적 호스팅)

**주의:** GitHub Pages는 정적 파일만 호스팅합니다. 백엔드는 별도로 배포해야 합니다.

#### 1-1. GitHub 리포지토리 생성
```bash
cd kakao-login-app
git init
git add .
git commit -m "Initial commit: Kakao login app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kakao-login-app.git
git push -u origin main
```

#### 1-2. GitHub Pages 설정
1. GitHub 리포지토리 → Settings → Pages
2. Source: `main` branch → `/ (root)` 선택
3. Save

#### 1-3. 접속
```
https://YOUR_USERNAME.github.io/kakao-login-app/index.html
```

---

### 방법 2: Vercel (권장)

#### 2-1. Vercel 설치 및 배포
```bash
cd kakao-login-app
npm install -g vercel

# 로그인
vercel login

# 배포
vercel
```

#### 2-2. 환경 변수 설정
Vercel Dashboard → Settings → Environment Variables:
```
BACKEND_URL=https://api.commitjob.site
```

#### 2-3. 재배포
```bash
vercel --prod
```

---

### 방법 3: Netlify

#### 3-1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

#### 3-2. 배포
```bash
cd kakao-login-app
netlify deploy

# 프로덕션 배포
netlify deploy --prod
```

---

### 방법 4: AWS S3 + CloudFront

#### 4-1. S3 버킷 생성
```bash
aws s3 mb s3://kakao-login-app
```

#### 4-2. 파일 업로드
```bash
cd kakao-login-app
aws s3 sync . s3://kakao-login-app --acl public-read
```

#### 4-3. S3 정적 웹사이트 호스팅 활성화
```bash
aws s3 website s3://kakao-login-app --index-document index.html
```

---

## 🔧 백엔드 설정 (중요!)

### 1. 백엔드 환경 변수 업데이트

#### `.env` 파일:
```bash
# 프로덕션 환경
NODE_ENV=production

# 프론트엔드 도메인 추가
FRONTEND_ORIGIN=https://commitjob.site,https://www.commitjob.site,https://YOUR_DOMAIN.com,http://localhost:5500

# 카카오 리다이렉트 URI (프로덕션)
KAKAO_REDIRECT_URI=https://api.commitjob.site/auth/kakao/callback

# JWT Secret (강력한 비밀키로 변경!)
JWT_SECRET=your-strong-secret-key-here

# 데이터베이스 (프로덕션)
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=appuser
DB_PASS=your-password
DB_NAME=appdb
```

### 2. 백엔드 CORS 설정 확인

`backend/server.js`에서 프론트엔드 도메인이 허용되어 있는지 확인:
```javascript
const allowedOrigins = [
    'https://commitjob.site',
    'https://www.commitjob.site',
    'https://YOUR_DOMAIN.com',  // 프론트엔드 도메인 추가
    // ...
];
```

---

## 🔐 카카오 개발자 콘솔 설정

### 1. Redirect URI 추가

카카오 개발자 콘솔 → 내 애플리케이션 → 앱 설정 → 카카오 로그인:

```
https://api.commitjob.site/auth/kakao/callback
https://YOUR_BACKEND_DOMAIN/auth/kakao/callback
```

### 2. 웹 사이트 도메인 추가

플랫폼 → Web → 사이트 도메인:
```
https://commitjob.site
https://YOUR_FRONTEND_DOMAIN
```

### 3. 활성화 설정 상태 변경

카카오 로그인 → 활성화 설정 → ON

---

## 📝 배포 체크리스트

배포 전 확인:

- [ ] `config.js`에서 `BACKEND_URL`을 프로덕션 URL로 변경
- [ ] 백엔드 `.env`에 프론트엔드 도메인 추가
- [ ] 백엔드 `.env`에서 `NODE_ENV=production` 설정
- [ ] 카카오 개발자 콘솔에 Redirect URI 등록
- [ ] 카카오 개발자 콘솔에 웹 사이트 도메인 등록
- [ ] HTTPS 사용 (프로덕션 필수!)
- [ ] JWT_SECRET을 강력한 키로 변경
- [ ] 데이터베이스 연결 정보 확인

배포 후 테스트:

- [ ] 프론트엔드 페이지 로드 확인
- [ ] 백엔드 API 연결 확인 (`/health` 엔드포인트)
- [ ] 카카오 로그인 버튼 클릭
- [ ] 카카오 로그인 완료 후 콜백 처리
- [ ] 사용자 정보 표시 확인
- [ ] 로그아웃 확인

---

## 🚨 프로덕션 환경 주의사항

### 1. HTTPS 필수
프로덕션 환경에서는 반드시 HTTPS를 사용해야 합니다.
- 카카오 OAuth는 HTTPS 필수
- 쿠키 `secure: true` 설정 필요

### 2. 쿠키 설정
백엔드에서 쿠키 설정 시:
```javascript
res.cookie("app_session", appJwt, {
  httpOnly: true,
  secure: true,        // HTTPS에서만 전송
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
  domain: ".commitjob.site"  // 서브도메인 간 쿠키 공유
});
```

### 3. CORS 설정
프로덕션 환경에서는 와일드카드(`*`) 제거:
```javascript
const allowedOrigins = [
    'https://commitjob.site',
    'https://www.commitjob.site',
    // '*' 제거!
];
```

---

## 🔍 배포 후 문제 해결

### 문제 1: 로그인 후 401 Unauthorized
**원인:** 쿠키가 전송되지 않음

**해결:**
1. 백엔드 쿠키 설정에서 `domain` 확인
2. HTTPS 사용 확인 (`secure: true`)
3. CORS `credentials: true` 설정 확인

### 문제 2: CORS 오류
**원인:** 프론트엔드 도메인이 백엔드 허용 목록에 없음

**해결:**
1. 백엔드 `.env`에 `FRONTEND_ORIGIN` 추가
2. 백엔드 재시작

### 문제 3: 카카오 로그인 실패
**원인:** Redirect URI 미등록

**해결:**
1. 카카오 개발자 콘솔에서 Redirect URI 확인
2. 백엔드 URL과 정확히 일치하는지 확인

---

## 📊 배포 환경별 설정

### 로컬 개발:
- 프론트엔드: `http://localhost:5500`
- 백엔드: `http://localhost:4001`
- 카카오 Redirect: `http://localhost:4001/auth/kakao/callback`

### 스테이징:
- 프론트엔드: `https://staging.commitjob.site`
- 백엔드: `https://staging-api.commitjob.site`
- 카카오 Redirect: `https://staging-api.commitjob.site/auth/kakao/callback`

### 프로덕션:
- 프론트엔드: `https://commitjob.site`
- 백엔드: `https://api.commitjob.site`
- 카카오 Redirect: `https://api.commitjob.site/auth/kakao/callback`

---

## 📞 지원

배포 중 문제가 발생하면:
1. `TROUBLESHOOTING.md` 확인
2. 브라우저 개발자 도구 콘솔 확인
3. 백엔드 로그 확인
4. 카카오 개발자 콘솔 설정 확인
