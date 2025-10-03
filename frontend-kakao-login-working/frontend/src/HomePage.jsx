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
