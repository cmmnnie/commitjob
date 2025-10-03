# 백엔드 소셜 로그인 코드

##  포함된 파일

### social-login-routes.js
백엔드 server.js에서 추출한 소셜 로그인 관련 코드:

1. **findOrCreateUser** - 사용자 생성/조회 함수
2. **findUserById** - 사용자 ID로 조회
3. **Google OAuth** 
   - GET /auth/google
   - GET /auth/google/callback
4. **Kakao OAuth**
   - GET /auth/kakao
   - GET /auth/kakao/login-url
   - GET /auth/kakao/callback

##  통합 방법

### 1. 필요한 패키지 설치
```bash
npm install jose axios cookie-parser
```

### 2. 환경 변수 설정 (.env)
```bash
# JWT
JWT_SECRET=your-secret-key

# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret  
GOOGLE_REDIRECT_URI=http://localhost:4001/auth/google/callback

# Kakao
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=http://localhost:4001/auth/kakao/callback
```

### 3. 데이터베이스 테이블 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_key VARCHAR(255) UNIQUE NOT NULL,  -- 예: 'google:123456789'
  email VARCHAR(255),
  name VARCHAR(255),
  picture TEXT,
  provider VARCHAR(50),  -- 'google' 또는 'kakao'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. server.js에 코드 추가
```javascript
// 1. 필요한 모듈 import
const crypto = require('crypto');
const jose = require('jose');
const axios = require('axios');
const cookieParser = require('cookie-parser');

// 2. 미들웨어 설정
app.use(cookieParser());

// 3. state 저장소 (CSRF 방지)
const stateStore = new Map();

// 4. CORS 허용 origin 목록
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://your-frontend-domain.com'
];

// 5. social-login-routes.js의 함수들을 복사해서 붙여넣기
// (findOrCreateUser, findUserById, Google/Kakao 라우트)
```

##  API 엔드포인트

### Google 로그인
```
GET /auth/google?origin=http://localhost:5173
→ Google 인증 페이지로 리디렉션

GET /auth/google/callback?code=...&state=...
→ 자동 처리 후 프론트엔드로 리디렉션
```

### Kakao 로그인
```
GET /auth/kakao?origin=http://localhost:5173
→ Kakao 인증 페이지로 리디렉션

GET /auth/kakao/login-url?origin=http://localhost:5173
→ JSON { url, state } 반환

GET /auth/kakao/callback?code=...&state=...
→ 자동 처리 후 프론트엔드로 리디렉션
```

##  보안 고려사항

1. **state 파라미터**: CSRF 공격 방지
2. **HttpOnly 쿠키**: XSS 공격 방지
3. **JWT 토큰**: 7일 만료, HS256 알고리즘
4. **origin 검증**: 허용된 도메인만 처리
5. **HTTPS**: 프로덕션에서 필수

##  디버깅 팁

```javascript
// Google/Kakao 응답 데이터 확인
console.log('Token Response:', tokenRes.data);
console.log('User Data:', meRes.data);

// DB 저장 확인
console.log('Created User:', user);

// JWT 토큰 확인
console.log('JWT:', appJwt);
```

##  주의사항

1. **provider_key 형식**: `{provider}:{sub}` (예: `google:123456789`)
2. **이메일 처리**: Kakao는 이메일 선택사항이므로 fallback 필요
3. **쿠키 설정**: sameSite='lax', httpOnly=true
4. **에러 처리**: 실패 시 프론트엔드로 `ok=0` 전달
