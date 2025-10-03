# 소셜 로그인 연동 가이드 (프론트엔드용)

##  개요
Google과 Kakao 소셜 로그인을 통한 OAuth 2.0 인증 흐름 구현

##  지원하는 소셜 로그인
-  Google OAuth 2.0
-  Kakao OAuth 2.0

##  인증 흐름

### 1. Google 로그인
```
프론트엔드 → 백엔드 /auth/google?origin={프론트URL}
           ↓
       Google 인증 페이지
           ↓
       백엔드 /auth/google/callback
           ↓
       JWT 쿠키 생성 (app_session)
           ↓
       프론트엔드 /auth/callback?ok=1
```

### 2. Kakao 로그인
```
프론트엔드 → 백엔드 /auth/kakao?origin={프론트URL}
           ↓
       Kakao 인증 페이지
           ↓
       백엔드 /auth/kakao/callback
           ↓
       JWT 쿠키 생성 (app_session)
           ↓
       프론트엔드 /auth/callback?ok=1
```

##  프론트엔드 구현 방법

### 1. Google 로그인 버튼
```javascript
const handleGoogleLogin = () => {
  const origin = window.location.origin; // 예: http://localhost:5173
  window.location.href = `http://localhost:4001/auth/google?origin=${encodeURIComponent(origin)}`;
};

// React 예시
<button onClick={handleGoogleLogin}>
  Google로 로그인
</button>
```

### 2. Kakao 로그인 버튼 (방법 1: 직접 리디렉션)
```javascript
const handleKakaoLogin = () => {
  const origin = window.location.origin;
  window.location.href = `http://localhost:4001/auth/kakao?origin=${encodeURIComponent(origin)}`;
};

<button onClick={handleKakaoLogin}>
  Kakao로 로그인
</button>
```

### 3. Kakao 로그인 버튼 (방법 2: URL 받아서 리디렉션)
```javascript
const handleKakaoLogin = async () => {
  const origin = window.location.origin;
  
  try {
    const response = await fetch(
      `http://localhost:4001/auth/kakao/login-url?origin=${encodeURIComponent(origin)}`
    );
    const data = await response.json();
    
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error('카카오 로그인 URL 가져오기 실패:', error);
  }
};

<button onClick={handleKakaoLogin}>
  Kakao로 로그인
</button>
```

### 4. 콜백 처리 (프론트엔드)
```javascript
// /auth/callback 페이지에서
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ok = urlParams.get('ok');
  
  if (ok === '1') {
    // 로그인 성공 - 쿠키에 app_session이 자동으로 설정됨
    console.log('로그인 성공!');
    // 메인 페이지로 이동
    navigate('/');
  } else {
    // 로그인 실패
    console.error('로그인 실패');
    navigate('/login');
  }
}, []);
```

### 5. 로그인 상태 확인
```javascript
// 백엔드 API 호출 시 자동으로 쿠키 전송됨 (credentials: 'include' 필요)
const checkLoginStatus = async () => {
  try {
    const response = await fetch('http://localhost:4001/api/user/profile', {
      credentials: 'include', // 중요: 쿠키 전송
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('로그인됨:', userData);
      return userData;
    } else {
      console.log('로그인되지 않음');
      return null;
    }
  } catch (error) {
    console.error('로그인 상태 확인 실패:', error);
    return null;
  }
};
```

### 6. 로그아웃
```javascript
const handleLogout = async () => {
  try {
    await fetch('http://localhost:4001/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    
    // 로그인 페이지로 이동
    navigate('/login');
  } catch (error) {
    console.error('로그아웃 실패:', error);
  }
};
```

##  백엔드 API 엔드포인트

### 로그인 시작
- **Google**: `GET /auth/google?origin={프론트엔드URL}`
- **Kakao**: `GET /auth/kakao?origin={프론트엔드URL}`
- **Kakao (URL 받기)**: `GET /auth/kakao/login-url?origin={프론트엔드URL}`

### 콜백 (자동 처리)
- **Google**: `GET /auth/google/callback` (백엔드가 자동 처리)
- **Kakao**: `GET /auth/kakao/callback` (백엔드가 자동 처리)

### 세션 관리
- **프로필 조회**: `GET /api/user/profile` (쿠키 필요)
- **로그아웃**: `POST /api/logout` (쿠키 필요)

##  JWT 쿠키 (app_session)

백엔드가 자동으로 설정하는 쿠키:
```
{
  "name": "app_session",
  "value": "eyJhbGc...", // JWT 토큰
  "httpOnly": true,      // JavaScript로 접근 불가 (보안)
  "secure": false,       // 프로덕션에서는 true (HTTPS)
  "sameSite": "lax",     // CSRF 방지
  "maxAge": 604800000    // 7일 (밀리초)
}
```

JWT 페이로드:
```json
{
  "uid": 1,                    // 사용자 ID
  "email": "user@gmail.com",   // 이메일
  "provider": "google",        // 로그인 제공자
  "iat": 1696000000,          // 발급 시각
  "exp": 1696604800           // 만료 시각 (7일 후)
}
```

##  환경 변수 설정 (백엔드 .env)

```bash
# JWT
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4001/auth/google/callback

# Kakao OAuth
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret  # 선택사항
KAKAO_REDIRECT_URI=http://localhost:4001/auth/kakao/callback
```

##  UI 예시 (React)

```jsx
import { useState } from 'react';

function LoginPage() {
  const origin = window.location.origin;

  const handleGoogleLogin = () => {
    window.location.href = `http://localhost:4001/auth/google?origin=${encodeURIComponent(origin)}`;
  };

  const handleKakaoLogin = () => {
    window.location.href = `http://localhost:4001/auth/kakao?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <div className="login-container">
      <h1>로그인</h1>
      
      <button 
        onClick={handleGoogleLogin}
        className="google-login-btn"
      >
        <img src="/google-icon.svg" alt="Google" />
        Google로 계속하기
      </button>

      <button 
        onClick={handleKakaoLogin}
        className="kakao-login-btn"
      >
        <img src="/kakao-icon.svg" alt="Kakao" />
        Kakao로 계속하기
      </button>
    </div>
  );
}

export default LoginPage;
```

##  디버깅

### 1. 쿠키 확인
브라우저 개발자 도구 → Application → Cookies → `app_session` 확인

### 2. 네트워크 확인
브라우저 개발자 도구 → Network → 요청 헤더에 `Cookie: app_session=...` 포함 확인

### 3. CORS 에러 해결
프론트엔드 요청 시 반드시 `credentials: 'include'` 추가:
```javascript
fetch('http://localhost:4001/api/...', {
  credentials: 'include', // 쿠키 전송
})
```

### 4. 백엔드 로그 확인
```bash
tail -f /tmp/backend.log
```

##  주의사항

1. **origin 파라미터 필수**: 백엔드가 허용된 origin만 처리합니다
2. **credentials: 'include'**: 모든 API 요청에 포함해야 쿠키가 전송됩니다
3. **HTTPS (프로덕션)**: 실서비스에서는 HTTPS 필수
4. **CORS 설정**: 백엔드에서 프론트엔드 origin을 허용 목록에 추가해야 합니다


상세한 백엔드 코드는 `backend-code/` 폴더 참고
