# 카카오 소셜 로그인 웹앱

순수 자바스크립트로 작성된 카카오 소셜 로그인 웹 애플리케이션입니다.

## 📁 프로젝트 구조

```
kakao-login-app/
├── index.html       # 메인 로그인 페이지
├── callback.html    # 카카오 OAuth 콜백 처리 페이지
├── app.js          # 메인 애플리케이션 로직
├── config.js       # 설정 파일 (백엔드 URL 등)
├── styles.css      # 스타일시트
└── README.md       # 이 파일
```

## 🚀 주요 기능

- ✅ 카카오 소셜 로그인
- ✅ 로그인 상태 확인
- ✅ 사용자 프로필 정보 표시
  - 프로필 사진
  - 이름
  - 이메일
  - 가입일
- ✅ 로그아웃
- ✅ JWT 토큰 기반 세션 관리 (HttpOnly Cookie)
- ✅ 반응형 디자인

## 🛠️ 기술 스택

- **프론트엔드**: 순수 JavaScript (프레임워크 없음)
- **스타일**: CSS3
- **API 통신**: Fetch API
- **인증**: JWT (HttpOnly Cookie)

## 📋 사전 요구사항

1. **백엔드 서버**: 카카오 OAuth를 처리하는 백엔드 서버가 실행 중이어야 합니다.
   - 기본 URL: `http://localhost:4001`
   - 필요한 API 엔드포인트:
     - `GET /auth/kakao/login-url` - 카카오 로그인 URL 요청
     - `GET /auth/kakao/callback` - 카카오 OAuth 콜백 처리
     - `GET /api/me` - 현재 로그인 사용자 정보
     - `POST /api/logout` - 로그아웃

2. **웹 서버**: 정적 파일을 제공할 웹 서버 (예: Live Server, http-server 등)

## 🔧 설정

### 1. 백엔드 URL 설정

`config.js` 파일에서 백엔드 URL을 수정할 수 있습니다:

```javascript
const CONFIG = {
    BACKEND_URL: 'http://localhost:4001',  // 백엔드 서버 URL
    // ... 기타 설정
};
```

### 2. 백엔드 서버 실행

프로젝트 루트에서 백엔드 서버를 실행합니다:

```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치 (최초 1회)
npm install

# 서버 실행
npm start
```

### 3. 프론트엔드 실행

#### 방법 1: Live Server (VS Code 확장)

1. VS Code에서 `index.html` 파일을 엽니다
2. 우클릭 → "Open with Live Server" 선택
3. 브라우저가 자동으로 열립니다

#### 방법 2: http-server (Node.js)

```bash
# kakao-login-app 디렉토리에서
npx http-server -p 3000

# 브라우저에서 접속
# http://localhost:3000
```

#### 방법 3: Python 내장 서버

```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

## 📖 사용 방법

### 1. 로그인

1. `index.html` 페이지를 엽니다
2. "카카오로 로그인" 버튼을 클릭합니다
3. 카카오 로그인 페이지에서 인증합니다
4. 인증이 완료되면 자동으로 메인 페이지로 돌아옵니다
5. 로그인된 사용자 정보가 표시됩니다

### 2. 로그인 상태 확인

- 페이지 로드 시 자동으로 로그인 상태를 확인합니다
- "로그인 상태 확인" 버튼으로 수동 확인 가능

### 3. 로그아웃

1. "로그아웃" 버튼을 클릭합니다
2. 확인 모달에서 "확인"을 클릭합니다
3. 로그아웃이 완료되고 로그인 페이지가 표시됩니다

## 🔐 보안 고려사항

1. **HttpOnly Cookie**: JWT 토큰은 HttpOnly 쿠키로 저장되어 XSS 공격으로부터 보호됩니다
2. **CORS**: 백엔드에서 허용된 origin만 API 요청 가능
3. **credentials: 'include'**: 모든 API 요청에 쿠키가 자동으로 포함됩니다
4. **HTTPS**: 프로덕션 환경에서는 반드시 HTTPS 사용

## 🌐 백엔드 API 명세

### 1. 카카오 로그인 URL 요청

```
GET /auth/kakao/login-url?origin={프론트엔드_URL}
```

**응답:**
```json
{
  "url": "https://kauth.kakao.com/oauth/authorize?..."
}
```

### 2. 사용자 정보 조회

```
GET /api/me
Cookie: jwt=...
```

**응답:**
```json
{
  "user": {
    "id": 1,
    "name": "홍길동",
    "email": "user@example.com",
    "picture": "https://...",
    "provider": "kakao",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### 3. 로그아웃

```
POST /api/logout
Cookie: jwt=...
```

**응답:**
```json
{
  "message": "로그아웃되었습니다"
}
```

## 🎨 UI/UX 특징

- **카카오 공식 디자인**: 카카오 브랜드 가이드라인에 맞는 버튼 색상 (#FEE500)
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모두 지원
- **부드러운 애니메이션**: 페이드인, 슬라이드, 스케일 효과
- **로딩 표시**: 스피너와 진행 단계 표시로 사용자 경험 향상
- **상태 메시지**: 성공/실패/경고 메시지를 색상으로 구분

## 🐛 트러블슈팅

### 1. 로그인 버튼을 클릭해도 반응이 없습니다

- 브라우저 콘솔에서 에러 메시지를 확인하세요
- 백엔드 서버가 실행 중인지 확인하세요 (`http://localhost:4001`)
- `config.js`의 `BACKEND_URL`이 올바른지 확인하세요

### 2. "CORS 에러" 발생

- 백엔드 서버의 CORS 설정에 프론트엔드 URL이 포함되어 있는지 확인하세요
- 백엔드 코드에서 `cors` 미들웨어 설정 확인

### 3. 로그인 후 사용자 정보가 표시되지 않습니다

- 브라우저 쿠키 설정을 확인하세요
- 개발자 도구 → Application → Cookies에서 JWT 쿠키가 있는지 확인
- `credentials: 'include'` 옵션이 모든 API 요청에 포함되어 있는지 확인

### 4. callback.html 페이지에서 멈춰 있습니다

- URL에 `?ok=1` 파라미터가 있는지 확인하세요
- 백엔드 콜백 처리가 제대로 되었는지 확인하세요
- 개발자 도구 콘솔에서 에러 메시지 확인

## 📝 개발 참고사항

### 파일별 역할

1. **index.html**: 메인 UI 구조
   - 로그인 전 화면 (loginSection)
   - 로그인 후 화면 (userSection)
   - 로딩 오버레이

2. **callback.html**: OAuth 콜백 처리
   - URL 파라미터 확인
   - 사용자 정보 조회
   - 메인 페이지로 리다이렉트

3. **app.js**: 메인 로직
   - 이벤트 핸들러
   - API 통신
   - UI 업데이트

4. **config.js**: 설정 관리
   - 백엔드 URL
   - API 엔드포인트
   - 환경별 설정

5. **styles.css**: 디자인
   - 카카오 브랜드 색상
   - 반응형 레이아웃
   - 애니메이션

## 🔄 업데이트 예정

- [ ] Google 로그인 추가
- [ ] 네이버 로그인 추가
- [ ] 프로필 편집 기능
- [ ] 다크 모드 지원
- [ ] 다국어 지원 (i18n)

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🤝 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

----------------------------------------------------------
앱 이름	CommitJob

웹 사이트 도메인
http://localhost:5173
http://localhost:5174
https://commitjob.site

앱키
네이티브 앱 키 8315936a7e64e765264f5bff36e252da

REST API 키 03bd5759c1e6f11d99bb13ff506af18c

JavaScript 키 e25fbc640864f7b5a58315285f7e464d

어드민 키  5eca0382a697c0979ab0aad38a752957

리다이렉트 URI
http://localhost:5173/auth/kakao/callback
http://localhost:4001/auth/kakao/callback
http://localhost:3001/auth/kakao/callback
http://localhost:4000/auth/kakao/callback
http://localhost:3000/auth/kakao/callback
https://commitjob.site/auth/kakao/callback