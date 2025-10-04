// 카카오 로그인 앱 설정 파일

const CONFIG = {
    // 백엔드 API URL (환경별 자동 감지)
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app',  // Railway 백엔드 URL

    // 카카오 JavaScript 키 (선택사항 - JavaScript SDK 사용 시)
    // 현재는 백엔드를 통해 로그인하므로 사용하지 않음
    KAKAO_JS_KEY: 'e25fbc640864f7b5a58315285f7e464d',

    // 현재 앱의 origin (자동 감지)
    APP_ORIGIN: window.location.origin,

    // 로그인 성공 후 리다이렉트 경로
    LOGIN_SUCCESS_REDIRECT: '/index.html',

    // 로그인 실패 후 리다이렉트 경로
    LOGIN_FAIL_REDIRECT: '/index.html?error=login_failed',

    // API 엔드포인트
    API: {
        KAKAO_LOGIN_URL: '/auth/kakao/login-url',
        USER_INFO: '/api/me',
        LOGOUT: '/api/logout'
    }
};

// 환경별 설정 (필요시 수정)
if (CONFIG.APP_ORIGIN.includes('localhost')) {
    // 로컬 개발 환경
    console.log('[CONFIG] 로컬 개발 환경 설정');
} else {
    // 프로덕션 환경
    console.log('[CONFIG] 프로덕션 환경 설정');
    // 프로덕션 백엔드 URL로 변경
    // CONFIG.BACKEND_URL = 'https://your-production-api.com';
}
