import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';
import '../styles/main.css';

const API_BASE_URL = CONFIG.BACKEND_URL;

export default function MainPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);
    // 토큰이 있으면 로딩 상태로 시작 (로그인 화면 깜빡임 방지)
    const [isLoading, setIsLoading] = useState(!!localStorage.getItem('app_session'));
    const [loadingMessage, setLoadingMessage] = useState('로그인 상태 확인 중...');
    const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [bigdataJobs, setBigdataJobs] = useState([]);
    const [itJobs, setItJobs] = useState([]);
    const [showLoginModal, setShowLoginModal] = useState(false);
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

    const fetchJobs = async () => {
        try {
            console.log('[MAIN] Fetching latest jobs');

            // BIGDATA_AI 및 IT 카테고리 병렬 조회
            const [bigdataResponse, itResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/jobs/BIGDATA_AI?limit=6`, {
                    withCredentials: true,
                    timeout: 10000
                }).catch(err => {
                    console.error('[MAIN] BIGDATA_AI fetch error:', err);
                    return null;
                }),
                axios.get(`${API_BASE_URL}/api/jobs/IT?limit=6`, {
                    withCredentials: true,
                    timeout: 10000
                }).catch(err => {
                    console.error('[MAIN] IT fetch error:', err);
                    return null;
                })
            ]);

            if (bigdataResponse?.data?.success) {
                setBigdataJobs(bigdataResponse.data.jobs.slice(0, 6));
            }

            if (itResponse?.data?.success) {
                setItJobs(itResponse.data.jobs.slice(0, 6));
            }
        } catch (error) {
            console.error('[MAIN] Failed to fetch jobs:', error);
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

        // 채용공고 가져오기
        fetchJobs();

        // URL 파라미터 확인 (에러 메시지 등)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const showLogin = urlParams.get('showLogin');

        if (error === 'login_failed') {
            showStatus('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
        } else if (error === 'login_cancelled') {
            showStatus('로그인이 취소되었습니다.', 'warning');
        }

        // URL 파라미터로 로그인 모달 표시 요청이 있으면 모달 열기
        if (showLogin === 'true' && !currentUser) {
            setShowLoginModal(true);
            // URL에서 파라미터 제거
            window.history.replaceState({}, '', window.location.pathname);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // URL 파라미터 변경 감지
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const showLogin = urlParams.get('showLogin');

        if (showLogin === 'true' && !currentUser) {
            setShowLoginModal(true);
            // URL에서 파라미터 제거
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [location.search, currentUser]);

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

    const JobCard = ({ job }) => (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e0e0e0',
            overflow: 'hidden',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => navigate(`/jobs/detail/${job.id}`, { state: { job } })}>
            {/* 이미지 영역 */}
            <div style={{
                width: '100%',
                paddingBottom: '60%',
                position: 'relative',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '2.5rem',
                    textAlign: 'center',
                    width: '80%'
                }}>
                    📊
                    <div style={{
                        fontSize: '0.85rem',
                        marginTop: '8px',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        wordBreak: 'keep-all'
                    }}>
                        {job.company}
                    </div>
                </div>
            </div>

            {/* 제목 및 회사명 */}
            <div style={{ padding: '20px' }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '2.8em'
                }}>{job.title}</h3>
                <p style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ fontSize: '1rem' }}>🏢</span>
                    {job.company}
                </p>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: 'calc(100vh - 60px)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px 20px',
            paddingBottom: '80px'
        }}>
            {isLoading ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}>
                        <div className="spinner"></div>
                        <p style={{ marginTop: '20px', color: '#666' }}>로딩 중...</p>
                    </div>
                </div>
            ) : (
                <div style={{
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {/* 헤더 */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h1 style={{
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '8px'
                                }}>
                                    채용공고
                                </h1>
                                <p style={{
                                    fontSize: '1rem',
                                    color: '#666'
                                }}>
                                    최신 IT 및 빅데이터/AI 분야 채용정보를 확인하세요
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 컨텐츠 영역 */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}>
                        {/* BIGDATA_AI 섹션 */}
                        {bigdataJobs.length > 0 && (
                            <div style={{ marginBottom: '0px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#333',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ fontSize: '1.8rem' }}>📊</span>
                                        BIGDATA/AI
                                        <span style={{
                                            fontSize: '0.9rem',
                                            color: '#999',
                                            fontWeight: '400',
                                            marginLeft: '8px'
                                        }}>
                                            ({bigdataJobs.length}건)
                                        </span>
                                    </h2>
                                    <button
                                        onClick={() => navigate('/jobs/ai')}
                                        style={{
                                            background: '#1976d2',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 20px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.opacity = '0.9';
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}>
                                        전체보기
                                    </button>
                                </div>

                                {/* 1x3 그리드 레이아웃 */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '20px',
                                    maxWidth: '1200px',
                                    margin: '0 auto'
                                }}>
                                    {bigdataJobs.map((job) => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* IT 섹션 */}
                        {itJobs.length > 0 && (
                            <div style={{ marginBottom: '0px', marginTop: '40px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '15px'
                                }}>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#333',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{ fontSize: '1.8rem' }}>💻</span>
                                        IT
                                        <span style={{
                                            fontSize: '0.9rem',
                                            color: '#999',
                                            fontWeight: '400',
                                            marginLeft: '8px'
                                        }}>
                                            ({itJobs.length}건)
                                        </span>
                                    </h2>
                                    <button
                                        onClick={() => navigate('/jobs/it')}
                                        style={{
                                            background: '#1976d2',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 20px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.opacity = '0.9';
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}>
                                        전체보기
                                    </button>
                                </div>

                                {/* 1x3 그리드 레이아웃 */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '20px',
                                    maxWidth: '1200px',
                                    margin: '0 auto'
                                }}>
                                    {itJobs.map((job) => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 로그인 모달 */}
            {showLoginModal && !currentUser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}
                onClick={() => setShowLoginModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '40px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                    }}
                    onClick={(e) => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{
                                fontFamily: "'Quicksand', sans-serif",
                                fontWeight: '600',
                                fontSize: '2rem',
                                marginBottom: '10px',
                                letterSpacing: '-0.5px'
                            }}>
                                <span style={{ color: '#ec4899' }}>C</span>ommit<span style={{ color: '#ec4899' }}>J</span>ob
                            </h2>
                            <p style={{ color: '#666', fontSize: '0.95rem' }}>AI 채용 추천 플랫폼</p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                                카카오 계정으로 간편하게 로그인하세요
                            </p>
                        </div>

                        <button
                            onClick={handleKakaoLogin}
                            style={{
                                width: '100%',
                                background: '#FEE500',
                                color: '#000000',
                                border: 'none',
                                padding: '14px 24px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s',
                                marginBottom: '15px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                            }}>
                            <span style={{ fontSize: '1.2rem' }}>💬</span>
                            <span>카카오로 로그인</span>
                        </button>

                        <button
                            onClick={() => setShowLoginModal(false)}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                color: '#666',
                                border: '2px solid #e0e0e0',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f5f5f5';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}>
                            닫기
                        </button>

                        {statusMessage.text && (
                            <div style={{
                                marginTop: '20px',
                                padding: '12px',
                                borderRadius: '8px',
                                background: statusMessage.type === 'error' ? '#ffebee' : statusMessage.type === 'success' ? '#e8f5e9' : '#fff3e0',
                                color: statusMessage.type === 'error' ? '#c62828' : statusMessage.type === 'success' ? '#2e7d32' : '#ef6c00',
                                fontSize: '0.9rem',
                                textAlign: 'center'
                            }}>
                                {statusMessage.text}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
