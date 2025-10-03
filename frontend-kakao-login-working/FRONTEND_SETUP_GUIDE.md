# 카카오 소셜 로그인 프론트엔드 설정 가이드

> **테스트 완료**: 2024-10-03, localhost:3001 환경에서 정상 작동 확인

---

##  포함된 파일

```
frontend/src/
├── App.js                 # 라우터 설정
├── index.js              # React 18 진입점
├── LoginPage.jsx         # 카카오 로그인 페이지
├── RedirectLogin.jsx     # 콜백 처리 페이지
└── HomePage.jsx          # 로그인 후 메인 페이지
```

---

##  빠른 시작

### 1. 프로젝트 생성 (새 프로젝트인 경우)

```bash
npx create-react-app my-app
cd my-app
```

### 2. 필요한 패키지 설치

```bash
npm install react-router-dom axios
```

### 3. 파일 복사

압축 해제 후 `frontend/src/` 폴더의 5개 파일을 프로젝트의 `src/` 폴더로 복사:
- `App.js` (기존 파일 덮어쓰기)
- `index.js` (기존 파일 덮어쓰기)
- `LoginPage.jsx` (새 파일)
- `RedirectLogin.jsx` (새 파일)
- `HomePage.jsx` (새 파일)

### 4. 실행

```bash
npm start
```

브라우저가 자동으로 `http://localhost:3000`에서 열립니다.

---

##  환경 설정

### 백엔드 URL 변경

각 컴포넌트에서 백엔드 URL을 환경에 맞게 수정하세요:

**LoginPage.jsx (Line 7):**
```javascript
const BACKEND_URL = 'http://localhost:4001';  // 백엔드 서버 주소
```

**RedirectLogin.jsx (Line 24):**
```javascript
const response = await fetch('http://localhost:4001/api/me', {
```

**HomePage.jsx (Line 18):**
```javascript
const response = await fetch('http://localhost:4001/api/me', {
```

**또는 환경 변수 사용 (권장):**

`.env` 파일 생성:
```bash
REACT_APP_BACKEND_URL=http://localhost:4001
```

코드에서 사용:
```javascript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4001';
```

---

##  주요 기능

### 1. 로그인 페이지 (`/login`)
- 카카오 로그인 버튼
- 백엔드에서 카카오 인증 URL 받아서 리디렉션

### 2. 콜백 처리 (`/auth/callback`)
- 카카오 인증 완료 후 자동 호출
- JWT 쿠키 확인
- 사용자 정보 조회
- 메인 페이지로 자동 이동

### 3. 메인 페이지 (`/`)
- 로그인 필수 (Protected Route)
- 사용자 프로필 표시
- 로그아웃 기능

---

##  인증 흐름

```
1. 사용자가 "Kakao로 로그인" 클릭
   ↓
2. 백엔드 /auth/kakao/login-url 호출
   ↓
3. 카카오 인증 페이지로 리디렉션
   ↓
4. 사용자가 카카오 로그인 완료
   ↓
5. 백엔드 /auth/kakao/callback 처리
   ↓
6. JWT 쿠키 생성 (app_session)
   ↓
7. 프론트 /auth/callback?ok=1 리디렉션
   ↓
8. /api/me로 사용자 정보 조회
   ↓
9. 메인 페이지 (/) 이동
```

---

##  중요 사항

### 1. CORS 설정

모든 API 요청에 **반드시** `credentials: 'include'` 포함:

```javascript
fetch('http://localhost:4001/api/me', {
  credentials: 'include',  //  필수!
});
```

이렇게 해야 JWT 쿠키가 전송됩니다.

### 2. React 버전

**React 18 이상**에서 작동하도록 작성되었습니다:

```javascript
// index.js
import ReactDOM from 'react-dom/client';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

React 17 이하를 사용 중이라면:
```javascript
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));
```

### 3. 백엔드 CORS 설정 필요

백엔드에서 프론트엔드 origin을 허용해야 합니다:

```javascript
// backend server.js
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  // 프론트엔드 URL 추가
];
```

---

##  테스트 체크리스트

- [ ] `npm start` 실행 후 브라우저 자동 오픈
- [ ] `/login` 페이지 정상 표시
- [ ] "Kakao로 로그인" 버튼 클릭 시 카카오 페이지 이동
- [ ] 카카오 로그인 후 `/auth/callback` 페이지 거침
- [ ] 메인 페이지 `/`로 자동 이동
- [ ] 프로필 사진, 이름, 이메일 표시
- [ ] "로그아웃" 버튼 클릭 시 로그인 페이지 이동
- [ ] 로그아웃 후 메인 페이지 접근 시 로그인 페이지로 리디렉션

---

##  트러블슈팅

### 문제: 브라우저 콘솔에서 CORS 에러

**해결**: `credentials: 'include'`를 모든 fetch 요청에 추가

### 문제: 로그인 후 사용자 정보가 안 나옴

**해결**:
1. 브라우저 개발자 도구 → Application → Cookies 확인
2. `app_session` 쿠키가 있는지 확인
3. 없으면 백엔드 로그 확인

### 문제: "ReactDOM.render is not a function" 에러

**해결**: `index.js` 파일을 제공된 버전으로 교체 (React 18 호환)

### 문제: 카카오 로그인 후 "앱 관리자 설정 오류 (KOE006)"

**해결**: 백엔드 `.env` 파일의 `KAKAO_REDIRECT_URI` 확인
- 로컬: `http://localhost:4001/auth/kakao/callback`
- 카카오 개발자 콘솔에도 동일한 URI 등록 필요

---

##  백엔드 API 엔드포인트

### 카카오 로그인
```
GET /auth/kakao/login-url?origin={프론트엔드URL}
→ 카카오 인증 URL 반환
```

### 사용자 정보 조회
```
GET /api/me
Cookie: app_session={JWT}
→ 현재 로그인 사용자 정보
```

### 로그아웃
```
POST /api/logout
Cookie: app_session={JWT}
→ 쿠키 삭제
```

---

##  추가 문서

- **API 전체 문서**: `API_Endpoint_Documentation.md`
- **백엔드 소셜 로그인 가이드**: `social-login-package/docs/SOCIAL_LOGIN_GUIDE.md`

---

##  테스트 환경

- **프론트엔드**: React 18, localhost:3001
- **백엔드**: Node.js, localhost:4001
- **데이터베이스**: MySQL (User ID 81로 테스트 완료)
- **테스트 사용자**: 카카오 계정 (민희)
- **테스트 일자**: 2024-10-03

---

##  성공 사례

```
[KAKAO-CALLBACK] Kakao user data: { id: 4476649013, nickname: '민희', has_email: false }
[KAKAO-CALLBACK] User ID: 81
[KAKAO-CALLBACK] Success! Redirecting to: http://localhost:3001/auth/callback?ok=1
```

**프론트엔드 콘솔**:
```
[CALLBACK] Login successful!
[CALLBACK] User data: {id: 81, name: '민희', email: 'kakao_4476649013@no-email.kakao'}
[HOME] User data: {...}
```

**결과**: 메인 페이지에 프로필 정보 정상 표시

---

