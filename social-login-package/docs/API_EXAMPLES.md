# API 예시 및 테스트

##  curl 테스트

### 1. Google 로그인 시작
```bash
# 브라우저에서 직접 접속
open "http://localhost:4001/auth/google?origin=http://localhost:5173"

# 또는 curl로 리디렉션 URL 확인
curl -v "http://localhost:4001/auth/google?origin=http://localhost:5173"
```

### 2. Kakao 로그인 URL 받기
```bash
curl "http://localhost:4001/auth/kakao/login-url?origin=http://localhost:5173"

# 응답 예시
{
  "url": "https://kauth.kakao.com/oauth/authorize?client_id=...&state=...",
  "state": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 3. 사용자 프로필 조회 (로그인 필요)
```bash
curl -X GET "http://localhost:4001/api/user/profile" \
  -H "Cookie: app_session=eyJhbGc..." \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

# 응답 예시
{
  "id": 1,
  "email": "user@gmail.com",
  "name": "홍길동",
  "picture": "https://...",
  "provider": "google"
}
```

### 4. 로그아웃
```bash
curl -X POST "http://localhost:4001/api/logout" \
  -H "Cookie: app_session=eyJhbGc..." \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

# 응답 예시
{
  "message": "로그아웃 성공"
}
```

##  프론트엔드 예시 (React)

### 완전한 로그인 컴포넌트
```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const origin = window.location.origin;
  const backendUrl = 'http://localhost:4001';

  const handleGoogleLogin = () => {
    window.location.href = `${backendUrl}/auth/google?origin=${encodeURIComponent(origin)}`;
  };

  const handleKakaoLogin = () => {
    window.location.href = `${backendUrl}/auth/kakao?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-3xl font-bold text-center">로그인</h2>
          <p className="mt-2 text-center text-gray-600">
            소셜 계정으로 간편하게 시작하세요
          </p>
        </div>

        <div className="space-y-4">
          {/* Google 로그인 */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <img 
              src="/google-icon.svg" 
              alt="Google" 
              className="w-6 h-6"
            />
            <span className="font-medium">Google로 계속하기</span>
          </button>

          {/* Kakao 로그인 */}
          <button
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-yellow-400 rounded-lg hover:bg-yellow-500 transition"
          >
            <img 
              src="/kakao-icon.svg" 
              alt="Kakao" 
              className="w-6 h-6"
            />
            <span className="font-medium">Kakao로 계속하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
```

### 콜백 처리 컴포넌트
```jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const ok = searchParams.get('ok');

    if (ok === '1') {
      // 로그인 성공
      console.log('로그인 성공!');
      
      // 사용자 정보 가져오기
      fetch('http://localhost:4001/api/user/profile', {
        credentials: 'include', // 쿠키 전송
      })
        .then(res => res.json())
        .then(user => {
          console.log('사용자 정보:', user);
          // 전역 상태에 사용자 정보 저장 (예: Redux, Context)
          // setUser(user);
          
          // 메인 페이지로 이동
          navigate('/');
        })
        .catch(err => {
          console.error('사용자 정보 조회 실패:', err);
          navigate('/login');
        });
    } else {
      // 로그인 실패
      console.error('로그인 실패');
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
```

### Protected Route (로그인 필요)
```jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 상태 확인
    fetch('http://localhost:4001/api/user/profile', {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
```

### 로그아웃 버튼
```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const navigate = useNavigate();

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

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    >
      로그아웃
    </button>
  );
}

export default LogoutButton;
```

##  React Router 설정

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

##  CORS 설정 (백엔드)

```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://your-frontend-domain.com'
  ],
  credentials: true, // 쿠키 전송 허용
}));
```

##  테스트 시나리오

### 1. 로그인 흐름 테스트
1. `/login` 페이지 접속
2. "Google로 계속하기" 클릭
3. Google 로그인 완료
4. `/auth/callback?ok=1`로 리디렉션
5. 사용자 정보 조회 후 `/`로 이동

### 2. 세션 유지 테스트
1. 로그인 후 페이지 새로고침
2. Protected Route 정상 접근 확인
3. 브라우저 재시작 후에도 로그인 유지 (7일 이내)

### 3. 로그아웃 테스트
1. 로그아웃 버튼 클릭
2. 쿠키 삭제 확인
3. Protected Route 접근 시 `/login`으로 리디렉션

##  디버깅 체크리스트

- [ ] 백엔드 .env 파일에 모든 환경 변수 설정
- [ ] Google/Kakao 개발자 콘솔에서 redirect URI 등록
- [ ] CORS origin에 프론트엔드 URL 추가
- [ ] credentials: 'include' 모든 API 요청에 포함
- [ ] 브라우저 쿠키 확인 (app_session)
- [ ] 네트워크 탭에서 Cookie 헤더 전송 확인
