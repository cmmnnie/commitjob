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
