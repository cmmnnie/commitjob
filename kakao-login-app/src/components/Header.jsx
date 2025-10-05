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
    }, [location]);

    const handleProfileClick = () => {
        // 항상 홈으로 이동 (로그인 또는 프로필 화면)
        navigate('/');
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
        fontSize: '1.2rem',
        fontWeight: '700',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease'
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
                    <span>CommitJob</span>
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
