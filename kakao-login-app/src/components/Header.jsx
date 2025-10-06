import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);

    // 콜백 페이지에서는 헤더 숨기기
    if (location.pathname === '/callback') {
        return null;
    }

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

    const handleProfileClick = () => {
        if (currentUser) {
            // 로그인된 경우: 홈 페이지로 이동하면서 프로필 모달 표시
            if (location.pathname === '/') {
                // 이미 홈 페이지에 있으면 URL 파라미터로 프로필 모달 열기
                navigate('/?showProfile=true');
            } else {
                // 다른 페이지에 있으면 홈으로 이동하면서 프로필 모달 열기
                navigate('/?showProfile=true');
            }
        } else {
            // 로그인되지 않은 경우: 홈 페이지로 이동하면서 로그인 모달 표시
            navigate('/?showLogin=true');
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
        maxWidth: '600px',
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    };

    const logoStyle = {
        color: '#667eea',
        fontSize: '1.3rem',
        fontWeight: '600',
        fontFamily: "'Quicksand', sans-serif",
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease',
        letterSpacing: '-0.3px'
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
