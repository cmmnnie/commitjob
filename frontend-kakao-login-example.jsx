// ========================================
// 1. LoginPage.jsx - 카카오 로그인 페이지
// ========================================
import React from 'react';
import axios from 'axios';

function LoginPage() {
  // 백엔드 URL (로컬 개발용)
  const BACKEND_URL = 'http://localhost:4001';

  // 현재 프론트엔드 origin
  const origin = window.location.origin; // 예: http://localhost:3000

  // 카카오 로그인 버튼 클릭 핸들러
  const handleKakaoLogin = async () => {
    try {
      console.log('[KAKAO-LOGIN] Requesting login URL from backend...');
      console.log('[KAKAO-LOGIN] Origin:', origin);

      // 백엔드에서 카카오 인증 URL 받기
      const response = await axios.get(
        `${BACKEND_URL}/auth/kakao/login-url?origin=${encodeURIComponent(origin)}`
      );

      console.log('[KAKAO-LOGIN] Received response:', response.data);

      if (response.data.url) {
        console.log('[KAKAO-LOGIN] Redirecting to:', response.data.url);
        // 카카오 인증 페이지로 이동
        window.location.href = response.data.url;
      } else {
        console.error('[KAKAO-LOGIN] No URL in response');
        alert('카카오 로그인 URL을 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('[KAKAO-LOGIN] Error:', error);
      console.error('[KAKAO-LOGIN] Error response:', error.response?.data);
      alert('카카오 로그인 요청 실패: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="login-page" style={{ padding: '50px', textAlign: 'center' }}>
      <h1>CommitJob 로그인</h1>
      <p>소셜 계정으로 간편하게 로그인하세요</p>

      <div style={{ marginTop: '30px' }}>
        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          style={{
            backgroundColor: '#FEE500',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>🟡</span> {/* 카카오 아이콘 대신 임시 이모지 */}
          Kakao로 로그인
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>개발 환경: {origin}</p>
        <p>백엔드 URL: {BACKEND_URL}</p>
      </div>
    </div>
  );
}

export default LoginPage;


// ========================================
// 2. RedirectLogin.jsx - 카카오 콜백 처리 페이지
// ========================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RedirectLogin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('로그인 처리 중...');

  useEffect(() => {
    const handleCallback = async () => {
      // URL에서 ok 파라미터 가져오기
      const params = new URLSearchParams(window.location.search);
      const ok = params.get('ok');

      console.log('[CALLBACK] Received ok parameter:', ok);
      console.log('[CALLBACK] Full URL:', window.location.href);

      if (ok === '1') {
        // 로그인 성공
        console.log('[CALLBACK] Login successful!');
        setStatus('로그인 성공! 사용자 정보를 확인하는 중...');

        try {
          // 사용자 정보 확인 (JWT 쿠키가 자동으로 전송됨)
          const response = await fetch('http://localhost:4001/api/me', {
            credentials: 'include', // 쿠키 전송 필수!
          });

          console.log('[CALLBACK] /api/me response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[CALLBACK] User data:', data.user);

            if (data.user) {
              setStatus(`환영합니다, ${data.user.name}님!`);

              // 1초 후 메인 페이지로 이동
              setTimeout(() => {
                navigate('/');
              }, 1000);
            } else {
              console.error('[CALLBACK] No user in response');
              setStatus('사용자 정보를 찾을 수 없습니다.');
              setTimeout(() => navigate('/login'), 2000);
            }
          } else {
            console.error('[CALLBACK] /api/me failed:', response.status);
            setStatus('사용자 정보 조회 실패');
            setTimeout(() => navigate('/login'), 2000);
          }
        } catch (error) {
          console.error('[CALLBACK] Error fetching user info:', error);
          setStatus('사용자 정보 조회 중 오류 발생');
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        // 로그인 실패
        console.error('[CALLBACK] Login failed, ok =', ok);
        setStatus('로그인에 실패했습니다.');
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="redirect-page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center'
    }}>
      {/* 로딩 스피너 */}
      <div style={{
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>

      <h2>{status}</h2>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RedirectLogin;


// ========================================
// 3. App.jsx - 라우터 설정
// ========================================
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import RedirectLogin from './RedirectLogin';
import HomePage from './HomePage'; // 메인 페이지 (직접 만드셔야 함)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 카카오/구글 콜백 처리 */}
        <Route path="/auth/callback" element={<RedirectLogin />} />

        {/* 메인 페이지 */}
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


// ========================================
// 4. HomePage.jsx - 로그인 후 메인 페이지 (예시)
// ========================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:4001/api/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[HOME] User data:', data.user);
          setUser(data.user);
        } else {
          console.log('[HOME] Not logged in');
          // 로그인되지 않았으면 로그인 페이지로 이동
          navigate('/login');
        }
      } catch (error) {
        console.error('[HOME] Auth check error:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4001/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[HOME] Logged out');
      navigate('/login');
    } catch (error) {
      console.error('[HOME] Logout error:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div>;
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>CommitJob 메인 페이지</h1>

      {user && (
        <div style={{ marginTop: '30px' }}>
          <img
            src={user.picture}
            alt="프로필"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              marginBottom: '20px'
            }}
          />
          <h2>환영합니다, {user.name}님!</h2>
          <p>이메일: {user.email}</p>
          <p>로그인 제공자: {user.provider}</p>

          <button
            onClick={handleLogout}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export default HomePage;


// ========================================
// 5. package.json 필요한 패키지
// ========================================
/*
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "axios": "^1.0.0"
  }
}

설치 명령어:
npm install react-router-dom axios
*/
