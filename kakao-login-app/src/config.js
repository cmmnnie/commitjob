// 카카오 로그인 앱 설정 파일

export const CONFIG = {
    // 백엔드 API URL (환경별 자동 감지)
    BACKEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app',  // Railway 백엔드 URL

    // 카카오 JavaScript 키 (선택사항 - JavaScript SDK 사용 시)
    // 현재는 백엔드를 통해 로그인하므로 사용하지 않음
    KAKAO_JS_KEY: 'e25fbc640864f7b5a58315285f7e464d',

    // 현재 앱의 origin (프론트엔드 URL로 고정)
    APP_ORIGIN: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.origin  // 로컬에서는 현재 origin 사용
        : 'https://commitjob.site',  // 프론트엔드 URL

    // 로그인 성공 후 리다이렉트 경로
    LOGIN_SUCCESS_REDIRECT: '/',

    // 로그인 실패 후 리다이렉트 경로
    LOGIN_FAIL_REDIRECT: '/?error=login_failed',

    // API 엔드포인트
    API: {
        KAKAO_LOGIN_URL: '/auth/kakao/login-url',
        USER_INFO: '/api/me',
        LOGOUT: '/api/logout'
    }
};
