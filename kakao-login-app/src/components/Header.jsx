import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 콜백 페이지에서는 헤더 숨기기
    if (location.pathname === '/callback') {
        return null;
    }

    // 모든 페이지에서 검색바 표시
    const showSearchBar = true;

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = localStorage.getItem('app_session');
                if (!token) {
                    setCurrentUser(null);
                    return;
                }

                const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        setCurrentUser(data.user);
                    }
                } else {
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error('[HEADER] 로그인 상태 확인 오류:', error);
                setCurrentUser(null);
            }
        };

        checkLoginStatus();
    }, [location.pathname]);

    // URL 파라미터와 검색어 동기화
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const searchParam = urlParams.get('search');

        // 검색 파라미터가 있으면 그 값으로 설정, 없으면 초기화
        if (searchParam) {
            setSearchQuery(searchParam);
        } else {
            setSearchQuery('');
        }
    }, [location.pathname, location.search]);

    const handleProfileClick = () => {
        if (currentUser) {
            // 로그인된 경우: 프로필 화면 표시
            // 현재 위치와 상관없이 항상 네비게이트 (replace 사용)
            window.location.href = '/?view=profile';
        } else {
            // 로그인되지 않은 경우: 로그인 화면 표시
            // 현재 위치와 상관없이 항상 네비게이트 (replace 사용)
            window.location.href = '/?view=login';
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const headerStyle = {
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        background: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        borderBottom: '1px solid rgba(0,0,0,0.1)'
    };

    const containerStyle = {
        maxWidth: showSearchBar ? '1200px' : '600px',
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
    };

    const logoStyle = {
        color: '#667eea',
        fontSize: '1.8rem',
        fontWeight: '800',
        fontFamily: "'Quicksand', sans-serif",
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease',
        letterSpacing: '-0.8px',
        textShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
    };

    const profileButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: currentUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
        color: currentUser ? 'white' : '#666',
        border: 'none',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: currentUser ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none'
    };

    const profileImageStyle = {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid white',
        objectFit: 'cover'
    };

    return (
        <header style={headerStyle}>
            <div style={containerStyle}>
                <Link to="/" style={logoStyle}>
                    <span>
                        <span style={{ color: '#ec4899' }}>C</span>ommit<span style={{ color: '#ec4899' }}>J</span>ob
                    </span>
                </Link>

                {/* 검색바 - 메인 페이지에서만 표시 */}
                {showSearchBar && (
                    <div style={{
                        flex: 1,
                        maxWidth: '500px',
                        position: 'relative'
                    }}>
                        <input
                            type="text"
                            placeholder="회사명 또는 직무 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearch}
                            style={{
                                width: '100%',
                                padding: '10px 40px 10px 16px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                border: '2px solid #e0e0e0',
                                borderRadius: '24px',
                                outline: 'none',
                                transition: 'all 0.3s',
                                color: '#222'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e0e0e0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '1.1rem',
                            color: '#999',
                            pointerEvents: 'none'
                        }}>🔍</span>
                    </div>
                )}

                <button onClick={handleProfileClick} style={profileButtonStyle}>
                    {currentUser ? (
                        <>
                            {currentUser.picture ? (
                                <img
                                    src={currentUser.picture}
                                    alt="Profile"
                                    style={profileImageStyle}
                                />
                            ) : (
                                <span>👤</span>
                            )}
                            <span style={{ fontSize: '0.8rem' }}>프로필</span>
                        </>
                    ) : (
                        <>
                            <span>👤</span>
                            <span>로그인</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    );
}
