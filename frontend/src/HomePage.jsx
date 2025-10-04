import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('profile');

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('app_session');

        if (!token) {
          console.log('[HOME] No token found');
          navigate('/login');
          setLoading(false);
          return;
        }

        const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:4001'
          : 'https://commitjob-backend.up.railway.app';

        const response = await fetch(`${BACKEND_URL}/api/me`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[HOME] User data:', data.user);
          setUser(data.user);
        } else {
          console.log('[HOME] Not logged in');
          localStorage.removeItem('app_session');
          navigate('/login');
        }
      } catch (error) {
        console.error('[HOME] Auth check error:', error);
        localStorage.removeItem('app_session');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app';

      await fetch(`${BACKEND_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[HOME] Logged out');
      localStorage.removeItem('app_session');
      navigate('/login');
    } catch (error) {
      console.error('[HOME] Logout error:', error);
      localStorage.removeItem('app_session');
      navigate('/login');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div>;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'jobs':
        return (
          <div style={{ padding: '20px' }}>
            <h2>채용공고</h2>
            <p>채용공고 목록이 여기에 표시됩니다.</p>
          </div>
        );
      case 'resume':
        return (
          <div style={{ padding: '20px' }}>
            <h2>이력서</h2>
            <p>이력서 관리 페이지입니다.</p>
          </div>
        );
      case 'profile':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>MyProfile</h2>
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
                <h3>환영합니다, {user.name}님!</h3>
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
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단 헤더 */}
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '0 40px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        <h1 style={{
          fontSize: '28px',
          margin: 0,
          fontWeight: 'bold'
        }}>
          CommitJob
        </h1>

        <nav style={{ display: 'flex', gap: '30px' }}>
          <div
            onClick={() => setCurrentPage('jobs')}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'jobs' ? '#3498db' : 'transparent',
              borderRadius: '5px',
              transition: 'background-color 0.3s',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 'jobs') e.target.style.backgroundColor = '#34495e';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 'jobs') e.target.style.backgroundColor = 'transparent';
            }}
          >
            📋 채용공고
          </div>

          <div
            onClick={() => setCurrentPage('resume')}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'resume' ? '#3498db' : 'transparent',
              borderRadius: '5px',
              transition: 'background-color 0.3s',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 'resume') e.target.style.backgroundColor = '#34495e';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 'resume') e.target.style.backgroundColor = 'transparent';
            }}
          >
            📄 이력서
          </div>

          <div
            onClick={() => setCurrentPage('profile')}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'profile' ? '#3498db' : 'transparent',
              borderRadius: '5px',
              transition: 'background-color 0.3s',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 'profile') e.target.style.backgroundColor = '#34495e';
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 'profile') e.target.style.backgroundColor = 'transparent';
            }}
          >
            👤 MyProfile
          </div>
        </nav>
      </header>

      {/* 하단 콘텐츠 영역 */}
      <main style={{
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: '40px',
        overflowY: 'auto'
      }}>
        {renderContent()}
      </main>
    </div>
  );
}

export default HomePage;
