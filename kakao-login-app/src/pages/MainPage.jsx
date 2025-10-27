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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [bigdataJobs, setBigdataJobs] = useState([]);
    const [itJobs, setItJobs] = useState([]);
    const [bigdataTotal, setBigdataTotal] = useState(0);
    const [itTotal, setItTotal] = useState(0);
    const [currentView, setCurrentView] = useState('jobs'); // 'jobs', 'login', 'profile'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
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

    // 만료된 공고 필터링 함수 (AIJobsPage/ITJobsPage와 동일)
    const isExpired = (job) => {
        if (!job.registration_info || job.registration_info.length === 0) return false;

        const dateStr = job.registration_info[0];
        const match = dateStr.match(/~(\d+)\.(\d+)/);
        if (!match) return false;

        const [, month, day] = match;
        const currentYear = new Date().getFullYear();
        const deadlineDate = new Date(currentYear, parseInt(month) - 1, parseInt(day), 23, 59, 59);

        return new Date() > deadlineDate;
    };

    const fetchJobs = async () => {
        try {
            console.log('[MAIN] Fetching latest jobs');

            // BIGDATA_AI 및 IT 카테고리 병렬 조회 (전체 데이터 가져오기)
            const [bigdataResponse, itResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/jobs/BIGDATA_AI`, {
                    timeout: 10000
                }).catch(err => {
                    console.error('[MAIN] BIGDATA_AI fetch error:', err);
                    return null;
                }),
                axios.get(`${API_BASE_URL}/api/jobs/IT`, {
                    timeout: 10000
                }).catch(err => {
                    console.error('[MAIN] IT fetch error:', err);
                    return null;
                })
            ]);

            if (bigdataResponse?.data?.success) {
                // 만료되지 않은 공고만 필터링
                const activeJobs = bigdataResponse.data.jobs.filter(job => !isExpired(job));
                setBigdataJobs(activeJobs.slice(0, 6));
                setBigdataTotal(activeJobs.length);
            }

            if (itResponse?.data?.success) {
                // 만료되지 않은 공고만 필터링
                const activeJobs = itResponse.data.jobs.filter(job => !isExpired(job));
                setItJobs(activeJobs.slice(0, 6));
                setItTotal(activeJobs.length);
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

        if (error === 'login_failed') {
            showStatus('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
        } else if (error === 'login_cancelled') {
            showStatus('로그인이 취소되었습니다.', 'warning');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // URL 파라미터 변경 감지
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const view = urlParams.get('view');
        const search = urlParams.get('search');

        if (view === 'login') {
            setCurrentView('login');
            // URL에서 파라미터 제거
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        } else if (view === 'profile') {
            setCurrentView('profile');
            // URL에서 파라미터 제거
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }

        // 검색 파라미터 처리
        if (search) {
            setSearchQuery(search);
            handleSearchFromUrl(search);
        } else {
            setSearchQuery('');
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [location.search]);

    // URL에서 검색어를 받아서 DB 검색
    const handleSearchFromUrl = async (query) => {
        if (!query || !query.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        try {
            setIsSearching(true);
            console.log('[MAIN] Searching jobs with query:', query);

            const response = await axios.get(`${API_BASE_URL}/api/jobs/search`, {
                params: { query },
                timeout: 10000
            });

            if (response.data.success) {
                setSearchResults(response.data.jobs);
                console.log('[MAIN] Found', response.data.jobs.length, 'jobs');
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('[MAIN] Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // 로그인 상태 변경 감지
    useEffect(() => {
        if (currentUser && currentView === 'login') {
            // 로그인 성공 시 메인 화면으로
            setCurrentView('jobs');
        }
    }, [currentUser, currentView]);

    const handleKakaoLogin = async () => {
        console.log('[APP] 카카오 로그인 시작');

        try {
            setIsLoading(true);
            setLoadingMessage('카카오 로그인 URL을 가져오는 중...');

            const origin = window.location.origin;
            let loginUrl = `${CONFIG.BACKEND_URL}${CONFIG.API.KAKAO_LOGIN_URL}?origin=${encodeURIComponent(origin)}&prompt=login`;

            console.log('[APP] Request URL:', loginUrl);

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

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[APP] Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

    const handleDeleteAccount = async () => {
        console.log('[APP] 회원 탈퇴 시작');
        setShowDeleteModal(false);

        try {
            setIsLoading(true);
            setLoadingMessage('회원 탈퇴 처리 중...');

            const token = localStorage.getItem('app_session');

            // 백엔드 회원 탈퇴 수행
            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.DELETE_ACCOUNT}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || '회원 탈퇴에 실패했습니다');
            }

            // 로컬 데이터 완전 삭제
            localStorage.clear();
            sessionStorage.clear();

            console.log('[APP] 회원 탈퇴 완료');
            setCurrentUser(null);
            setCurrentView('jobs');
            showStatus('회원 탈퇴가 완료되었습니다', 'success');

            // 페이지 새로고침
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 1500);

        } catch (error) {
            console.error('[APP] 회원 탈퇴 오류:', error);
            setIsLoading(false);
            showStatus(error.message || '회원 탈퇴 중 오류가 발생했습니다', 'error');
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

            console.log('[APP] 로그아웃 완료, 메인 화면으로 이동');
            setCurrentUser(null);
            setCurrentView('jobs');

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

    const getCompanyLogoUrl = (job) => {
        // 회사 로고 URL이 있으면 직접 사용
        if (job.company_logo_url) {
            return job.company_logo_url;
        }
        return null;
    };

    const JobCard = ({ job }) => {
        const logoUrl = getCompanyLogoUrl(job);
        const [logoError, setLogoError] = useState(false);

        // 버튼 클릭 핸들러
        const handleJobDetailClick = (e) => {
            e.stopPropagation();
            navigate(`/jobs/detail/${job.id}`, { state: { job } });
        };

        const handleAIInterviewClick = async (e) => {
            e.stopPropagation();

            const token = localStorage.getItem('app_session');
            if (!token) {
                alert('로그인이 필요합니다.');
                navigate('/?view=login');
                return;
            }

            // 이력서 확인
            try {
                const userResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!userResponse.ok) {
                    alert('로그인이 필요합니다.');
                    navigate('/?view=login');
                    return;
                }

                const userData = await userResponse.json();
                const user = userData.user;

                if (!user) {
                    alert('로그인이 필요합니다.');
                    navigate('/?view=login');
                    return;
                }

                const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${user.id}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!profileResponse.ok || !profileResponse) {
                    alert('이력서 작성이 필요합니다.');
                    navigate('/resume');
                    return;
                }

                const profileData = await profileResponse.json();

                if (!profileData.profile ||
                    (!profileData.profile.preferred_jobs &&
                     !profileData.profile.experience &&
                     (!profileData.profile.skills || profileData.profile.skills.length === 0))) {
                    alert('이력서 작성이 필요합니다.');
                    navigate('/resume');
                    return;
                }

                navigate('/ai-interview', {
                    state: {
                        companyName: job.company
                    }
                });
            } catch (error) {
                console.error('확인 오류:', error);
                navigate('/ai-interview', {
                    state: {
                        companyName: job.company
                    }
                });
            }
        };

        const handleAICoverLetterClick = async (e) => {
            e.stopPropagation();

            const token = localStorage.getItem('app_session');
            if (!token) {
                alert('로그인이 필요합니다.');
                navigate('/?view=login');
                return;
            }

            // 이력서 확인
            try {
                const userResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!userResponse.ok) {
                    alert('로그인이 필요합니다.');
                    navigate('/?view=login');
                    return;
                }

                const userData = await userResponse.json();
                const user = userData.user;

                if (!user) {
                    alert('로그인이 필요합니다.');
                    navigate('/?view=login');
                    return;
                }

                const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${user.id}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!profileResponse.ok || !profileResponse) {
                    alert('이력서 작성이 필요합니다.');
                    navigate('/resume');
                    return;
                }

                const profileData = await profileResponse.json();

                if (!profileData.profile ||
                    (!profileData.profile.preferred_jobs &&
                     !profileData.profile.experience &&
                     (!profileData.profile.skills || profileData.profile.skills.length === 0))) {
                    alert('이력서 작성이 필요합니다.');
                    navigate('/resume');
                    return;
                }

                navigate('/ai-cover-letter', {
                    state: {
                        companyName: job.company,
                        jobId: job.id
                    }
                });
            } catch (error) {
                console.error('확인 오류:', error);
                navigate('/ai-cover-letter', {
                    state: {
                        companyName: job.company,
                        jobId: job.id
                    }
                });
            }
        };

        return (
            <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                overflow: 'hidden',
                transition: 'all 0.3s',
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
            }}>
                {/* 이미지 영역 */}
                <div style={{
                    width: '100%',
                    paddingBottom: '60%',
                    position: 'relative',
                    background: logoUrl && !logoError ? 'white' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {logoUrl && !logoError ? (
                        <img
                            src={logoUrl}
                            alt={`${job.company} 로고`}
                            onError={() => setLogoError(true)}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                maxWidth: '70%',
                                maxHeight: '70%',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
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
                    )}
                </div>

                {/* 제목 및 회사명 */}
                <div style={{ padding: '16px' }}>
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
                        gap: '6px',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '1rem' }}>🏢</span>
                        {job.company}
                    </p>
                    {job.location && (
                        <p style={{
                            fontSize: '0.85rem',
                            color: '#888',
                            fontWeight: '400',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '12px'
                        }}>
                            <span style={{ fontSize: '0.9rem' }}>📍</span>
                            {typeof job.location === 'string' ? job.location.split(' ').slice(0, 2).join(' ') : job.location}
                        </p>
                    )}

                    {/* 버튼 영역 - 2x2 그리드 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px'
                    }}>
                        <button
                            onClick={handleJobDetailClick}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                            }}>
                            💼 채용공고
                        </button>
                        <button
                            onClick={handleAIInterviewClick}
                            style={{
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 87, 108, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 87, 108, 0.3)';
                            }}>
                            🎤 AI면접
                        </button>
                        <button
                            onClick={handleAICoverLetterClick}
                            style={{
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(79, 172, 254, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 172, 254, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 172, 254, 0.3)';
                            }}>
                            📝 AI자소서
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // 회사별 코딩테스트 페이지 분기
                                if (job.company && job.company.includes('LG')) {
                                    navigate('/lg-coding-test');
                                } else if (job.company && job.company.includes('현대')) {
                                    navigate('/hyundai-coding-test');
                                } else if (job.company && job.company.includes('삼성')) {
                                    navigate('/samsung-coding-test');
                                } else if (job.company && job.company.includes('카카오')) {
                                    navigate('/kakao-coding-test');
                                } else {
                                    navigate('/coding-test');
                                }
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(67, 233, 123, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 233, 123, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 233, 123, 0.3)';
                            }}>
                            💻 코딩Test
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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

                    {/* 로그인 화면 */}
                    {currentView === 'login' && (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '60px 40px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            maxWidth: '500px',
                            margin: '0 auto'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                                <h2 style={{
                                    fontFamily: "'Quicksand', sans-serif",
                                    fontWeight: '600',
                                    fontSize: '2.5rem',
                                    marginBottom: '15px',
                                    letterSpacing: '-0.5px'
                                }}>
                                    <span style={{ color: '#ec4899' }}>C</span>ommit<span style={{ color: '#ec4899' }}>J</span>ob
                                </h2>
                                <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '10px' }}>AI 채용 추천 플랫폼</p>
                                <p style={{ color: '#999', fontSize: '0.95rem' }}>카카오 계정으로 간편하게 로그인하세요</p>
                            </div>

                            <button
                                onClick={handleKakaoLogin}
                                style={{
                                    width: '100%',
                                    background: '#FEE500',
                                    color: '#000000',
                                    border: 'none',
                                    padding: '18px 24px',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s',
                                    marginBottom: '20px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                }}>
                                <span style={{ fontSize: '1.5rem' }}>💬</span>
                                <span>카카오로 로그인</span>
                            </button>

                            {statusMessage.text && (
                                <div style={{
                                    marginTop: '25px',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    background: statusMessage.type === 'error' ? '#ffebee' : statusMessage.type === 'success' ? '#e8f5e9' : '#fff3e0',
                                    color: statusMessage.type === 'error' ? '#c62828' : statusMessage.type === 'success' ? '#2e7d32' : '#ef6c00',
                                    fontSize: '0.95rem',
                                    textAlign: 'center'
                                }}>
                                    {statusMessage.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 프로필 화면 */}
                    {currentView === 'profile' && currentUser && (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            maxWidth: '450px',
                            margin: '0 auto'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px', color: '#333' }}>
                                    환영합니다!
                                </h2>
                            </div>

                            {/* 회색 박스 */}
                            <div style={{
                                background: '#f5f5f5',
                                borderRadius: '16px',
                                padding: '24px',
                                marginBottom: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                {/* 원형 프로필 사진 */}
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    marginBottom: '16px',
                                    background: '#e0e0e0',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                                    border: '3px solid white'
                                }}>
                                    <img
                                        src={currentUser.picture || ''}
                                        alt={currentUser.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>

                                <h3 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: '600',
                                    color: '#333',
                                    marginBottom: '8px'
                                }}>
                                    {maskName(currentUser.name || '-')}
                                </h3>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: '#999',
                                    background: 'white',
                                    padding: '6px 14px',
                                    borderRadius: '16px',
                                    marginBottom: '16px'
                                }}>
                                    {currentUser.provider === 'kakao' ? '카카오 로그인' : currentUser.provider}
                                </p>

                                {/* 사용자 정보 */}
                                <div style={{
                                    width: '100%',
                                    background: 'white',
                                    borderRadius: '10px',
                                    padding: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        paddingBottom: '12px',
                                        borderBottom: '1px solid #e0e0e0'
                                    }}>
                                        <span style={{ color: '#666', fontSize: '0.85rem' }}>사용자 ID</span>
                                        <span style={{ color: '#333', fontWeight: '600', fontSize: '0.85rem' }}>
                                            {maskId(currentUser.email, currentUser.name)}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: '#666', fontSize: '0.85rem' }}>가입일</span>
                                        <span style={{ color: '#333', fontWeight: '600', fontSize: '0.85rem' }}>
                                            {formatDate(currentUser.created_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 버튼 영역 */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    style={{
                                        flex: 1,
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 20px',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 5px 14px rgba(102, 126, 234, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 3px 10px rgba(102, 126, 234, 0.3)';
                                    }}>
                                    로그아웃
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        flex: 1,
                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 20px',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 3px 10px rgba(245, 87, 108, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 5px 14px rgba(245, 87, 108, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 3px 10px rgba(245, 87, 108, 0.3)';
                                    }}>
                                    회원탈퇴
                                </button>
                            </div>

                            {showLogoutModal && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(4px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 3000,
                                    animation: 'fadeIn 0.2s ease-out'
                                }}
                                onClick={() => setShowLogoutModal(false)}>
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '24px',
                                        padding: '40px',
                                        maxWidth: '440px',
                                        width: '90%',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                        animation: 'slideUp 0.3s ease-out',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={(e) => e.stopPropagation()}>
                                        {/* 배경 장식 */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-50px',
                                            right: '-50px',
                                            width: '150px',
                                            height: '150px',
                                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            borderRadius: '50%',
                                            opacity: 0.1,
                                            filter: 'blur(40px)'
                                        }}></div>

                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            {/* 아이콘 */}
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, #fff5f8 0%, #ffe8f0 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '3px solid #ffebf0'
                                            }}>
                                                <div style={{
                                                    fontSize: '2.5rem',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                                }}>👋</div>
                                            </div>

                                            {/* 제목 */}
                                            <h3 style={{
                                                marginBottom: '16px',
                                                fontSize: '1.5rem',
                                                textAlign: 'center',
                                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: '800',
                                                letterSpacing: '-0.5px'
                                            }}>로그아웃</h3>

                                            {/* 설명 */}
                                            <div style={{
                                                background: '#f8f9fa',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                marginBottom: '28px',
                                                border: '1px solid #f1f3f5'
                                            }}>
                                                <p style={{
                                                    color: '#495057',
                                                    fontSize: '1rem',
                                                    lineHeight: '1.7',
                                                    margin: 0,
                                                    textAlign: 'center'
                                                }}>
                                                    로그아웃 하시겠습니까?<br/>
                                                    <span style={{ color: '#868e96', fontSize: '0.95rem' }}>다시 로그인해야 서비스를 이용할 수 있습니다</span>
                                                </p>
                                            </div>

                                            {/* 버튼 */}
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button
                                                    onClick={handleLogout}
                                                    style={{
                                                        flex: 1,
                                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '16px',
                                                        borderRadius: '14px',
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s',
                                                        boxShadow: '0 8px 20px rgba(245, 87, 108, 0.4)',
                                                        letterSpacing: '-0.3px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(245, 87, 108, 0.5)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 87, 108, 0.4)';
                                                    }}>
                                                    확인
                                                </button>
                                                <button
                                                    onClick={() => setShowLogoutModal(false)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
                                                        color: '#495057',
                                                        border: 'none',
                                                        padding: '16px',
                                                        borderRadius: '14px',
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s',
                                                        boxShadow: '0 4px 12px rgba(108, 117, 125, 0.2)',
                                                        letterSpacing: '-0.3px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.3)';
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, #dee2e6 0%, #ced4da 100%)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.2)';
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)';
                                                    }}>
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showDeleteModal && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(4px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 3000,
                                    animation: 'fadeIn 0.2s ease-out'
                                }}
                                onClick={() => setShowDeleteModal(false)}>
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '24px',
                                        padding: '40px',
                                        maxWidth: '440px',
                                        width: '90%',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                        animation: 'slideUp 0.3s ease-out',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={(e) => e.stopPropagation()}>
                                        {/* 배경 장식 */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '-50px',
                                            right: '-50px',
                                            width: '150px',
                                            height: '150px',
                                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                            borderRadius: '50%',
                                            opacity: 0.1,
                                            filter: 'blur(40px)'
                                        }}></div>

                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            {/* 아이콘 */}
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 20px',
                                                background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '3px solid #ffebee'
                                            }}>
                                                <div style={{
                                                    fontSize: '2.5rem',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                                }}>⚠️</div>
                                            </div>

                                            {/* 제목 */}
                                            <h3 style={{
                                                marginBottom: '16px',
                                                fontSize: '1.5rem',
                                                textAlign: 'center',
                                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: '800',
                                                letterSpacing: '-0.5px'
                                            }}>회원 탈퇴</h3>

                                            {/* 설명 */}
                                            <div style={{
                                                background: '#f8f9fa',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                marginBottom: '28px',
                                                border: '1px solid #f1f3f5'
                                            }}>
                                                <p style={{
                                                    color: '#495057',
                                                    marginBottom: '12px',
                                                    lineHeight: '1.7',
                                                    fontSize: '1rem',
                                                    textAlign: 'center'
                                                }}>
                                                    정말로 탈퇴하시겠습니까?
                                                </p>
                                                <div style={{
                                                    background: 'white',
                                                    borderRadius: '12px',
                                                    padding: '16px',
                                                    border: '1px dashed #dee2e6'
                                                }}>
                                                    <p style={{
                                                        color: '#868e96',
                                                        fontSize: '0.9rem',
                                                        lineHeight: '1.6',
                                                        margin: 0,
                                                        textAlign: 'center'
                                                    }}>
                                                        ⚡ <strong style={{ color: '#495057' }}>모든 데이터가 영구적으로 삭제</strong>되며<br/>
                                                        복구할 수 없습니다
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 버튼 */}
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button
                                                    onClick={handleDeleteAccount}
                                                    style={{
                                                        flex: 1,
                                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '16px',
                                                        borderRadius: '14px',
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s',
                                                        boxShadow: '0 8px 20px rgba(245, 87, 108, 0.4)',
                                                        letterSpacing: '-0.3px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 12px 28px rgba(245, 87, 108, 0.5)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 87, 108, 0.4)';
                                                    }}>
                                                    탈퇴하기
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteModal(false)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
                                                        color: '#495057',
                                                        border: 'none',
                                                        padding: '16px',
                                                        borderRadius: '14px',
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s',
                                                        boxShadow: '0 4px 12px rgba(108, 117, 125, 0.2)',
                                                        letterSpacing: '-0.3px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.3)';
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, #dee2e6 0%, #ced4da 100%)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.2)';
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)';
                                                    }}>
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <style>{`
                                        @keyframes fadeIn {
                                            from {
                                                opacity: 0;
                                            }
                                            to {
                                                opacity: 1;
                                            }
                                        }
                                        @keyframes slideUp {
                                            from {
                                                transform: translateY(20px);
                                                opacity: 0;
                                            }
                                            to {
                                                transform: translateY(0);
                                                opacity: 1;
                                            }
                                        }
                                    `}</style>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 채용공고 화면 */}
                    {currentView === 'jobs' && (
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '20px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }}>
                            {/* 채용공고 헤더 */}
                            <div style={{ marginBottom: '30px' }}>
                                <h1 style={{
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '8px'
                                }}>
                                    최신 채용공고
                                </h1>
                                {searchQuery && (
                                    <p style={{
                                        fontSize: '1rem',
                                        color: '#666',
                                        marginTop: '8px'
                                    }}>
                                        "{searchQuery}" 검색 결과 {isSearching ? '검색 중...' : `(${searchResults.length}건)`}
                                    </p>
                                )}
                            </div>

                            {/* 검색 결과 표시 */}
                            {searchQuery && !isSearching && (
                                <div style={{ marginBottom: '30px' }}>
                                    {searchResults.length > 0 ? (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '20px',
                                            maxWidth: '1200px',
                                            margin: '0 auto'
                                        }}>
                                            {searchResults.map((job) => (
                                                <JobCard key={job.id} job={job} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '60px 20px',
                                            color: '#999'
                                        }}>
                                            <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🔍</p>
                                            <p>검색 결과가 없습니다</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 검색 중일 때 로딩 표시 */}
                            {isSearching && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: '#666'
                                }}>
                                    <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                                    <p>검색 중...</p>
                                </div>
                            )}

                            {/* BIGDATA_AI 섹션 - 검색 중이 아닐 때만 표시 */}
                            {!searchQuery && bigdataJobs.length > 0 && (
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
                                            fontSize: '1.1rem',
                                            color: '#333',
                                            fontWeight: '700',
                                            marginLeft: '12px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            padding: '4px 0'
                                        }}>
                                            ({bigdataJobs.length}건 / 전체 {bigdataTotal > 0 ? `${bigdataTotal}건` : '확인 중...'})
                                        </span>
                                    </h2>
                                    <button
                                        onClick={() => navigate('/jobs/ai')}
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 28px',
                                            borderRadius: '24px',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
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

                        {/* IT 섹션 - 검색 중이 아닐 때만 표시 */}
                        {!searchQuery && itJobs.length > 0 && (
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
                                            fontSize: '1.1rem',
                                            color: '#333',
                                            fontWeight: '700',
                                            marginLeft: '12px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            padding: '4px 0'
                                        }}>
                                            ({itJobs.length}건 / 전체 {itTotal > 0 ? `${itTotal}건` : '확인 중...'})
                                        </span>
                                    </h2>
                                    <button
                                        onClick={() => navigate('/jobs/it')}
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 28px',
                                            borderRadius: '24px',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
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
                    )}
                </div>
            )}

        </div>
    );
}
