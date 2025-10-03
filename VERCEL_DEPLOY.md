# Vercel 배포 가이드 (프론트엔드)

## 🎯 프론트엔드 배포 단계

Railway로 백엔드 배포가 완료된 후 진행하세요.

---

## 📋 준비사항

### 1. Railway 백엔드 도메인 확인

Railway Dashboard에서 백엔드 도메인 복사:
```
https://YOUR_PROJECT_NAME.up.railway.app
```

### 2. config.js 업데이트

`kakao-login-app/config.js` 파일 수정:

```javascript
const CONFIG = {
    // 백엔드 API URL (환경별 자동 감지)
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://YOUR_PROJECT_NAME.up.railway.app',  // ← Railway 도메인으로 변경

    KAKAO_JS_KEY: 'e25fbc640864f7b5a58315285f7e464d',
    APP_ORIGIN: window.location.origin,

    LOGIN_SUCCESS_REDIRECT: '/index.html',
    LOGIN_FAIL_REDIRECT: '/index.html?error=login_failed',

    API: {
        KAKAO_LOGIN_URL: '/auth/kakao/login-url',
        USER_INFO: '/api/me',
        LOGOUT: '/api/logout'
    }
};

// 환경별 설정 (필요시 수정)
if (CONFIG.APP_ORIGIN.includes('localhost')) {
    console.log('[CONFIG] 로컬 개발 환경 설정');
} else {
    console.log('[CONFIG] 프로덕션 환경 설정');
}
```

### 3. 변경사항 커밋

```bash
cd kakao-login-app
git add config.js
git commit -m "Update backend URL for production"
git push
```

---

## 🚀 Vercel 배포

### 방법 1: Vercel Dashboard (권장)

#### 1-1. Vercel 회원가입

1. **Vercel 사이트 접속:**
   ```
   https://vercel.com
   ```

2. **"Sign Up" 클릭**

3. **"Continue with GitHub" 선택**

4. **GitHub 연동 허용**

#### 1-2. 새 프로젝트 생성

1. **"Add New..." → Project 클릭**

2. **"Import Git Repository" 선택**

3. **GitHub 리포지토리 선택:**
   - `commitjob-backend` (또는 생성한 리포지토리명)
   - Import 클릭

#### 1-3. 프로젝트 설정

**Configure Project 화면에서:**

1. **Project Name:**
   ```
   kakao-login-app
   ```
   (또는 원하는 이름)

2. **Framework Preset:**
   ```
   Other
   ```

3. **Root Directory:**
   ```
   kakao-login-app
   ```
   (Override 체크 후 입력)

4. **Build Command:**
   비워두기 (정적 파일이므로 빌드 불필요)

5. **Output Directory:**
   ```
   .
   ```

6. **Install Command:**
   비워두기

#### 1-4. 환경 변수 설정 (선택사항)

Environment Variables (필요시):
```
NEXT_PUBLIC_BACKEND_URL=https://YOUR_RAILWAY_DOMAIN.up.railway.app
```

#### 1-5. 배포

**"Deploy" 버튼 클릭**

배포 진행 중... (1-2분 소요)

#### 1-6. 배포 완료

배포 완료 후 도메인 받기:
```
https://YOUR_PROJECT_NAME.vercel.app
```

**"Visit" 버튼 클릭하여 확인**

---

### 방법 2: Vercel CLI

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프론트엔드 디렉토리로 이동
cd C:\AI\mini\project\kakao-login-app

# 배포 (테스트)
vercel

# 프로덕션 배포
vercel --prod
```

---

## 🔧 배포 후 설정

### 1. Vercel 도메인 확인

Vercel Dashboard → Project → Domains:
```
https://YOUR_PROJECT_NAME.vercel.app
```

### 2. Railway 환경 변수 업데이트

Railway Dashboard → Variables → Raw Editor:

**기존:**
```bash
FRONTEND_ORIGIN=http://localhost:5500,https://commitjob.site
```

**업데이트:**
```bash
FRONTEND_ORIGIN=http://localhost:5500,https://commitjob.site,https://YOUR_PROJECT_NAME.vercel.app
```

**Update Variables 클릭**

### 3. 카카오 개발자 콘솔 업데이트

#### 3-1. 웹 사이트 도메인 추가

1. **카카오 개발자 콘솔 → 플랫폼 → Web**

2. **사이트 도메인 추가:**
   ```
   https://YOUR_PROJECT_NAME.vercel.app
   ```

3. **저장**

---

## ✅ 배포 테스트

### 1. 프론트엔드 접속

브라우저에서:
```
https://YOUR_PROJECT_NAME.vercel.app/index.html
```

### 2. 개발자 도구 확인

F12 → Console:
```
[CONFIG] 프로덕션 환경 설정
```

### 3. 카카오 로그인 테스트

1. **"카카오로 로그인" 버튼 클릭**
2. **카카오 계정으로 로그인**
3. **자동으로 돌아와서 사용자 정보 확인**

---

## 🌐 커스텀 도메인 설정 (선택사항)

### Vercel에 커스텀 도메인 연결

#### 1. Vercel Dashboard → Settings → Domains

#### 2. Add Domain:
```
commitjob.site
www.commitjob.site
```

#### 3. DNS 레코드 추가

**도메인 등록 업체 (가비아, 호스팅KR 등):**

**A 레코드:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME 레코드:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 4. SSL 인증서 자동 발급

Vercel이 자동으로 Let's Encrypt SSL 발급 (수분 소요)

#### 5. 최종 업데이트

Railway Variables의 `FRONTEND_ORIGIN`에 커스텀 도메인 추가:
```bash
FRONTEND_ORIGIN=https://commitjob.site,https://www.commitjob.site,https://YOUR_PROJECT_NAME.vercel.app
```

카카오 개발자 콘솔에 커스텀 도메인 추가:
```
https://commitjob.site
https://www.commitjob.site
```

---

## 🔍 배포 확인 체크리스트

### 프론트엔드:
- [ ] Vercel 배포 완료
- [ ] `config.js`에 백엔드 URL 업데이트
- [ ] 프론트엔드 페이지 로드 확인
- [ ] 브라우저 콘솔에 오류 없음

### 백엔드 연동:
- [ ] Railway `FRONTEND_ORIGIN`에 Vercel 도메인 추가
- [ ] Railway 재배포 완료

### 카카오 설정:
- [ ] 카카오 웹 도메인에 Vercel 도메인 추가

### 전체 테스트:
- [ ] 페이지 로드
- [ ] 카카오 로그인 버튼 클릭
- [ ] 카카오 로그인 완료
- [ ] 콜백 처리 성공
- [ ] 사용자 정보 표시
- [ ] 로그아웃 테스트

---

## 🐛 문제 해결

### 문제 1: 404 Not Found

**원인:** Root Directory 미설정

**해결:**
1. Vercel Dashboard → Settings → General
2. Root Directory: `kakao-login-app`
3. Save → Redeploy

### 문제 2: CORS 오류

**원인:** Railway `FRONTEND_ORIGIN`에 Vercel 도메인 없음

**해결:**
1. Railway Dashboard → Variables
2. `FRONTEND_ORIGIN`에 Vercel 도메인 추가
3. Railway 재배포

### 문제 3: 백엔드 연결 실패

**원인:** `config.js`의 `BACKEND_URL` 미업데이트

**해결:**
1. `config.js` 수정
2. Git 커밋 및 푸시
3. Vercel 자동 재배포 확인

### 문제 4: 카카오 로그인 실패

**원인:** 카카오 웹 도메인 미등록

**해결:**
카카오 개발자 콘솔 → 플랫폼 → Web → 사이트 도메인 추가

---

## 📊 최종 아키텍처

```
사용자
  ↓ HTTPS
Vercel (프론트엔드)
https://YOUR_PROJECT_NAME.vercel.app
  ↓ API (HTTPS)
Railway (백엔드)
https://YOUR_RAILWAY_DOMAIN.up.railway.app
  ↓ SQL
AWS RDS (데이터베이스)
database-1.xxx.rds.amazonaws.com
```

---

## 🎉 배포 완료!

축하합니다! 전체 시스템 배포가 완료되었습니다.

**프론트엔드:** `https://YOUR_PROJECT_NAME.vercel.app/index.html`
**백엔드:** `https://YOUR_RAILWAY_DOMAIN.up.railway.app`

실제 사용자들이 카카오 로그인을 사용할 수 있습니다! 🎊

---

## 📞 지원

문제 발생 시:
1. Vercel Dashboard → Deployments → Logs 확인
2. Railway Dashboard → Deployments → Logs 확인
3. 브라우저 개발자 도구 → Console/Network 확인
4. 카카오 개발자 콘솔 설정 재확인
