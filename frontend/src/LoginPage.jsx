import React from 'react';
import axios from 'axios';

function LoginPage() {
  // 백엔드 URL (로컬 테스트 - Vercel CORS 이슈로 인해 로컬 사용)
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
          <span>🟡</span>
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
