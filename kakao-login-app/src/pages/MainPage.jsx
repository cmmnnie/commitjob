import { useState, useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import '../styles/main.css';

export default function MainPage() {
    const [currentUser, setCurrentUser] = useState(null);
    // 토큰이 있으면 로딩 상태로 시작 (로그인 화면 깜빡임 방지)
    const [isLoading, setIsLoading] = useState(!!localStorage.getItem('app_session'));
    const [loadingMessage, setLoadingMessage] = useState('로그인 상태 확인 중...');
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const hasCheckedLogin = useRef(false);

    const showStatus = (text, type = 'info') => {
        setStatusMessage({ text, type });
        setTimeout(() => {
            setStatusMessage({ text: '', type: '' });
        }, 3000);
    };

    const checkLoginStatus = async (showMessage = false) => {
        console.log('[APP] 로그인 상태 확인');

        try {
            if (showMessage) {
                setIsLoading(true);
                setLoadingMessage('로그인 상태를 확인하는 중...');
            }

            const token = localStorage.getItem('app_session');
            console.log('[APP] localStorage 토큰 체크:', token ? `존재 (길이: ${token.length})` : '없음');

            if (!token) {
                console.log('[APP] 토큰 없음 - 로그인 필요');
                setCurrentUser(null);
                // 토큰이 없으면 로딩 상태를 명시적으로 false로
                if (isLoading) {
                    setIsLoading(false);
                }
                if (showMessage) {
                    showStatus('로그인이 필요합니다', 'warning');
                }
                return;
            }

            // 타임아웃 설정 (10초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[APP] 사용자 정보 응답 상태:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[APP] 사용자 정보 응답:', data);
                console.log('[APP] data.user 존재 여부:', !!data.user);

                if (data.user) {
                    console.log('[APP] 사용자 프로필 설정:', {
                        name: data.user.name,
                        email: data.user.email,
                        provider: data.user.provider
                    });
                    setCurrentUser(data.user);
                    if (showMessage) {
                        showStatus('로그인 상태입니다', 'success');
                    }
                } else {
                    console.warn('[APP] 응답에 user 객체 없음:', data);
                    setCurrentUser(null);
                    if (showMessage) {
                        showStatus('로그인이 필요합니다', 'warning');
                    }
                }
            } else {
                const errorText = await response.text();
                console.error('[APP] /api/me 요청 실패:', response.status, errorText);
                setCurrentUser(null);
                if (showMessage) {
                    showStatus('로그인이 필요합니다', 'warning');
                }
            }
        } catch (error) {
            console.error('[APP] 로그인 상태 확인 오류:', error);
            setCurrentUser(null);
            if (showMessage) {
                showStatus(`오류: ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // 중복 실행 방지
        if (hasCheckedLogin.current) {
            return;
        }
        hasCheckedLogin.current = true;

        // Kakao SDK 초기화
        if (window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init(CONFIG.KAKAO_JS_KEY);
            console.log('[APP] Kakao SDK 초기화 완료');
        }

        // 항상 localStorage 토큰을 확인하여 로그인 상태 체크
        checkLoginStatus();

        // URL 파라미터 확인 (에러 메시지 등)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');

        if (error === 'login_failed') {
            showStatus('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
        } else if (error === 'login_cancelled') {
            showStatus('로그인이 취소되었습니다.', 'warning');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKakaoLogin = async () => {
        console.log('[APP] 카카오 로그인 시작');

        try {
            setIsLoading(true);
            setLoadingMessage('카카오 로그인 URL을 가져오는 중...');

            const origin = CONFIG.APP_ORIGIN;

            // 항상 prompt=login을 사용하여 재인증 강제
            let loginUrl = `${CONFIG.BACKEND_URL}${CONFIG.API.KAKAO_LOGIN_URL}?origin=${encodeURIComponent(origin)}&prompt=login`;

            console.log('[APP] 재인증 강제 모드 (prompt=login)');
            console.log('[APP] Request URL:', loginUrl);
            console.log('[APP] Origin:', origin);

            // 타임아웃 추가 (20초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(loginUrl, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[APP] Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[APP] Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[APP] Response data:', data);

            if (data.url) {
                console.log('[APP] 카카오 인증 페이지로 이동:', data.url);
                showStatus('카카오 로그인 페이지로 이동합니다...', 'success');

                setTimeout(() => {
                    window.location.href = data.url;
                }, 500);
            } else {
                throw new Error('로그인 URL을 받지 못했습니다');
            }
        } catch (error) {
            console.error('[APP] 카카오 로그인 오류:', error);
            if (error.name === 'AbortError') {
                showStatus('로그인 요청 시간 초과 - 백엔드 서버를 확인해주세요', 'error');
            } else {
                showStatus(`로그인 실패: ${error.message}`, 'error');
            }
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        console.log('[APP] 로그아웃 시작');
        setShowLogoutModal(false);

        try {
            setIsLoading(true);
            setLoadingMessage('로그아웃 처리 중...');

            // 백엔드 로그아웃 수행
            await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.LOGOUT}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // 로컬 데이터 완전 삭제
            localStorage.clear();
            sessionStorage.clear();

            console.log('[APP] 로그아웃 완료, 메인 페이지로 이동');
            setCurrentUser(null);

            // 페이지 새로고침
            window.location.href = window.location.origin + window.location.pathname;

        } catch (error) {
            console.error('[APP] 로그아웃 오류:', error);
            localStorage.clear();
            sessionStorage.clear();
            setCurrentUser(null);
            window.location.href = window.location.origin + window.location.pathname;
        }
    };

    const maskName = (name) => {
        if (!name || name === '-') return name;
        if (name.length === 2) {
            return name[0] + '*';
        } else if (name.length >= 3) {
            const middle = '*'.repeat(name.length - 2);
            return name[0] + middle + name[name.length - 1];
        }
        return name;
    };

    const maskId = (email, name) => {
        const username = email ? email.split('@')[0] : name || '-';
        if (username !== '-' && username.length > 3) {
            return username.substring(0, 3) + '*'.repeat(username.length - 3);
        }
        return username;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const utcDate = new Date(dateString);
        const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
        return kstDate.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container">
            {isLoading ? (
                // 로딩 중일 때는 아무것도 표시하지 않음 (로딩 오버레이만 표시)
                null
            ) : !currentUser ? (
                <div id="loginSection" className="section">
                    <div className="login-card">
                        <div className="logo-section">
                            <h1 style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: '600', letterSpacing: '-0.5px' }}>
                                <span style={{ color: '#ec4899' }}>C</span>ommit<span style={{ color: '#ec4899' }}>J</span>ob
                            </h1>
                            <p>AI 채용 추천 플랫폼</p>
                        </div>

                        <div className="login-description">
                            <p>카카오 계정으로 간편하게 로그인하세요</p>
                        </div>

                        <button onClick={handleKakaoLogin} className="kakao-login-btn">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiMzQzFFMUUiLz4KPHBhdGggZD0iTTEyIDZDOC4xMzQgNiA1IDguNDYyIDUgMTEuNUM1IDEzLjUwNyA2LjQ1IDE1LjIyNCA4LjUgMTYuMTI1TDcuNSAxOS41TDExIDI3LjVMMTQuNSAyNy41TDE4IDI3LjVMMTcuNSAxNi4xMjVDMTkuNTUgMTUuMjI0IDIxIDEzLjUwNyAyMSAxMS41QzIxIDguNDYyIDE3Ljg2NiA2IDEyIDZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K" alt="카카오" className="kakao-icon" />
                            <span>카카오로 로그인</span>
                        </button>

                        <div className="divider">
                            <span>또는</span>
                        </div>

                        <div className="test-buttons">
                            <button onClick={() => checkLoginStatus(true)} className="btn-secondary">
                                로그인 상태 확인
                            </button>
                        </div>

                        {statusMessage.text && (
                            <div className={`status-message status-${statusMessage.type}`}>
                                {statusMessage.text}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div id="userSection" className="section">
                    <div className="user-card">
                        <div className="user-header">
                            <h2>환영합니다!</h2>
                        </div>

                        <div className="user-profile">
                            <div className="profile-image-wrapper">
                                <img
                                    src={currentUser.picture || ''}
                                    alt={currentUser.name}
                                    className="profile-image"
                                />
                            </div>
                            <div className="profile-info">
                                <h3 className="user-name">{maskName(currentUser.name || '-')}</h3>
                                <p className="user-provider">
                                    로그인 방식: {currentUser.provider === 'kakao' ? '카카오 로그인' : currentUser.provider}
                                </p>
                            </div>
                        </div>

                        <div className="user-details">
                            <div className="detail-item">
                                <span className="detail-label">사용자 ID:</span>
                                <span className="detail-value">
                                    {maskId(currentUser.email, currentUser.name)}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">가입일:</span>
                                <span className="detail-value">{formatDate(currentUser.created_at)}</span>
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button onClick={() => checkLoginStatus(true)} className="btn-secondary">
                                정보 새로고침
                            </button>
                            <button onClick={() => setShowLogoutModal(true)} className="btn-logout">
                                로그아웃
                            </button>
                        </div>

                        {showLogoutModal && (
                            <div className="modal">
                                <div className="modal-content">
                                    <h3>로그아웃 하시겠습니까?</h3>
                                    <p>로그아웃하면 다시 로그인해야 합니다.</p>
                                    <div className="modal-buttons">
                                        <button onClick={handleLogout} className="btn-logout">확인</button>
                                        <button onClick={() => setShowLogoutModal(false)} className="btn-secondary">취소</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>{loadingMessage}</p>
                </div>
            )}
        </div>
    );
}
