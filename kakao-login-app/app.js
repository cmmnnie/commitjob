/**
 * 카카오 로그인 앱 - 메인 애플리케이션 로직
 */

const App = {
    // 현재 사용자 정보
    currentUser: null,

    // 로딩 상태
    isLoading: false,

    /**
     * 앱 초기화
     */
    init() {
        console.log('[APP] 앱 초기화 시작');

        // Kakao SDK 초기화
        if (window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init(CONFIG.KAKAO_JS_KEY);
            console.log('[APP] Kakao SDK 초기화 완료');
        }

        // 로그아웃 직후인지 확인
        if (sessionStorage.getItem('just_logged_out') === 'true') {
            console.log('[APP] 로그아웃 직후 감지 - localStorage 강제 삭제');
            localStorage.clear();
            sessionStorage.removeItem('just_logged_out');
        }

        // 이벤트 리스너 등록
        this.attachEventListeners();

        // 로그인 상태 확인
        this.checkLoginStatus();
    },

    /**
     * 이벤트 리스너 등록
     */
    attachEventListeners() {
        // 카카오 로그인 버튼
        const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
        if (kakaoLoginBtn) {
            kakaoLoginBtn.addEventListener('click', () => this.handleKakaoLogin());
        }

        // 로그인 상태 확인 버튼
        const checkLoginBtn = document.getElementById('checkLoginBtn');
        if (checkLoginBtn) {
            checkLoginBtn.addEventListener('click', () => this.checkLoginStatus(true));
        }

        // 로그아웃 버튼
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.showLogoutModal());
        }

        // 로그아웃 확인 버튼
        const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // 로그아웃 취소 버튼
        const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => this.hideLogoutModal());
        }

        // 사용자 정보 새로고침 버튼
        const refreshUserBtn = document.getElementById('refreshUserBtn');
        if (refreshUserBtn) {
            refreshUserBtn.addEventListener('click', () => this.refreshUserInfo());
        }

        console.log('[APP] 이벤트 리스너 등록 완료');
    },

    /**
     * 카카오 로그인 처리
     */
    async handleKakaoLogin() {
        console.log('[APP] 카카오 로그인 시작');

        try {
            this.showLoading('카카오 로그인 URL을 가져오는 중...');

            const origin = CONFIG.APP_ORIGIN;
            console.log('[APP] Origin:', origin);

            // 로그아웃 후 재로그인인지 확인
            const forceLogin = sessionStorage.getItem('force_kakao_login');
            let loginUrl = `${CONFIG.BACKEND_URL}${CONFIG.API.KAKAO_LOGIN_URL}?origin=${encodeURIComponent(origin)}`;

            if (forceLogin === 'true') {
                loginUrl += '&prompt=login';
                sessionStorage.removeItem('force_kakao_login');
                console.log('[APP] 강제 재로그인 모드 (prompt=login)');
            }

            // 백엔드에서 카카오 인증 URL 받기
            const response = await fetch(loginUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('[APP] 응답 상태:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[APP] 응답 데이터:', data);

            if (data.url) {
                console.log('[APP] 카카오 인증 페이지로 이동:', data.url);
                this.showStatus('카카오 로그인 페이지로 이동합니다...', 'success');

                // 카카오 인증 페이지로 이동
                setTimeout(() => {
                    window.location.href = data.url;
                }, 500);
            } else {
                throw new Error('로그인 URL을 받지 못했습니다');
            }

        } catch (error) {
            console.error('[APP] 카카오 로그인 오류:', error);
            this.showStatus(`로그인 실패: ${error.message}`, 'error');
            this.hideLoading();
        }
    },

    /**
     * 로그인 상태 확인
     */
    async checkLoginStatus(showMessage = false) {
        console.log('[APP] 로그인 상태 확인');

        try {
            if (showMessage) {
                this.showLoading('로그인 상태를 확인하는 중...');
            }

            // localStorage에서 토큰 가져오기
            const token = localStorage.getItem('app_session');

            console.log('[APP] localStorage 토큰 체크:', token ? `존재 (길이: ${token.length})` : '없음');

            // 토큰이 없으면 로그인 화면 표시
            if (!token) {
                console.log('[APP] 토큰 없음 - 로그인 필요');
                this.currentUser = null;
                this.showLoginSection();
                if (showMessage) {
                    this.hideLoading();
                    this.showStatus('로그인이 필요합니다', 'warning');
                }
                return;
            }

            console.log('[APP] 토큰 확인됨, 사용자 정보 요청 중...', token.substring(0, 20) + '...');

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: headers
            });

            console.log('[APP] 사용자 정보 응답 상태:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[APP] 사용자 정보:', data);

                if (data.user) {
                    // 로그인 상태
                    this.currentUser = data.user;
                    this.showUserSection();
                    this.displayUserInfo(data.user);

                    if (showMessage) {
                        this.showStatus('로그인 상태입니다', 'success');
                    }
                } else {
                    // 로그인되지 않음
                    this.currentUser = null;
                    this.showLoginSection();

                    if (showMessage) {
                        this.showStatus('로그인이 필요합니다', 'warning');
                    }
                }
            } else {
                // 인증 실패
                console.log('[APP] 로그인되지 않음');
                this.currentUser = null;
                this.showLoginSection();

                if (showMessage) {
                    this.showStatus('로그인이 필요합니다', 'warning');
                }
            }

        } catch (error) {
            console.error('[APP] 로그인 상태 확인 오류:', error);
            this.currentUser = null;
            this.showLoginSection();

            if (showMessage) {
                this.showStatus(`오류: ${error.message}`, 'error');
            }
        } finally {
            this.hideLoading();
        }
    },

    /**
     * 사용자 정보 새로고침
     */
    async refreshUserInfo() {
        console.log('[APP] 사용자 정보 새로고침');
        await this.checkLoginStatus(true);
    },

    /**
     * 로그아웃 처리
     */
    async handleLogout() {
        console.log('[APP] 로그아웃 시작');
        this.hideLogoutModal();

        try {
            this.showLoading('로그아웃 처리 중...');

            // 카카오 로그아웃 수행
            if (window.Kakao && window.Kakao.Auth) {
                try {
                    // 로그아웃 후 재로그인 플래그 설정
                    sessionStorage.setItem('force_kakao_login', 'true');

                    await new Promise((resolve) => {
                        window.Kakao.Auth.logout(() => {
                            console.log('[APP] 카카오 세션 로그아웃 완료');
                            resolve();
                        });
                    });
                } catch (kakaoError) {
                    console.error('[APP] 카카오 로그아웃 오류:', kakaoError);
                }
            }

            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.LOGOUT}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('[APP] 로그아웃 응답 상태:', response.status);

            if (response.ok) {
                console.log('[APP] 로그아웃 성공');

                // localStorage 완전 초기화
                localStorage.clear();
                console.log('[APP] localStorage 전체 삭제 완료');

                // 로그아웃 플래그 설정 (새로고침 후 확인용)
                sessionStorage.setItem('just_logged_out', 'true');

                this.currentUser = null;

                // 페이지 새로고침 (sessionStorage는 유지됨)
                console.log('[APP] 로그아웃 완료, 페이지 새로고침');
                window.location.href = window.location.origin + window.location.pathname;
            } else {
                throw new Error('로그아웃 요청 실패');
            }

        } catch (error) {
            console.error('[APP] 로그아웃 오류:', error);
            // 에러가 발생해도 localStorage 완전 삭제
            localStorage.clear();
            sessionStorage.setItem('just_logged_out', 'true');
            this.currentUser = null;

            // 페이지 새로고침
            console.log('[APP] 에러 발생했지만 로그아웃 처리');
            window.location.href = window.location.origin + window.location.pathname;
        } finally {
            // finally는 reload 전에 실행되므로 여기서 hideLoading 호출하지 않음
        }
    },

    /**
     * 로그인 섹션 표시
     */
    showLoginSection() {
        console.log('[APP] 로그인 섹션 표시');
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');

        if (loginSection) loginSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
    },

    /**
     * 사용자 섹션 표시
     */
    showUserSection() {
        console.log('[APP] 사용자 섹션 표시');
        const loginSection = document.getElementById('loginSection');
        const userSection = document.getElementById('userSection');

        if (loginSection) loginSection.classList.add('hidden');
        if (userSection) userSection.classList.remove('hidden');
    },

    /**
     * 사용자 정보 표시
     */
    displayUserInfo(user) {
        console.log('[APP] 사용자 정보 표시:', user);

        // 프로필 이미지
        const userProfileImage = document.getElementById('userProfileImage');
        if (userProfileImage && user.picture) {
            userProfileImage.src = user.picture;
            userProfileImage.alt = user.name;
        }

        // 이름
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = user.name || '-';
        }

        // 이메일
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = user.email || '-';
        }

        // 제공자
        const userProvider = document.getElementById('userProvider');
        if (userProvider) {
            const providerText = user.provider === 'kakao' ? '카카오 로그인' : user.provider;
            userProvider.textContent = `로그인 방식: ${providerText}`;
        }

        // 사용자 ID (이메일 앞부분을 아이디로 사용)
        const userId = document.getElementById('userId');
        if (userId) {
            const username = user.email ? user.email.split('@')[0] : user.name || '-';
            userId.textContent = username;
        }

        // 가입일 (UTC를 한국 시간으로 변환)
        const userCreatedAt = document.getElementById('userCreatedAt');
        if (userCreatedAt && user.created_at) {
            const date = new Date(user.created_at + 'Z'); // UTC로 명시
            userCreatedAt.textContent = date.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Seoul'
            });
        }
    },

    /**
     * 로그아웃 모달 표시
     */
    showLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    /**
     * 로그아웃 모달 숨기기
     */
    hideLogoutModal() {
        const modal = document.getElementById('logoutModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    /**
     * 로딩 표시
     */
    showLoading(message = '처리 중...') {
        this.isLoading = true;
        const overlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');

        if (overlay) overlay.classList.remove('hidden');
        if (loadingMessage) loadingMessage.textContent = message;
    },

    /**
     * 로딩 숨기기
     */
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    },

    /**
     * 상태 메시지 표시
     */
    showStatus(message, type = 'info') {
        console.log(`[APP] 상태 메시지 [${type}]:`, message);

        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;

        // 타입별 클래스 설정
        statusElement.className = 'status-message';
        statusElement.classList.add(`status-${type}`);
        statusElement.textContent = message;
        statusElement.classList.remove('hidden');

        // 3초 후 자동 숨김
        setTimeout(() => {
            statusElement.classList.add('hidden');
        }, 3000);
    }
};

// 전역으로 App 객체 노출
window.App = App;
