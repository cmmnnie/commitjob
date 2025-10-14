import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function Navigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const [showResumeModal, setShowResumeModal] = useState(false);

    // 콜백 페이지에서는 네비게이션 숨기기
    if (location.pathname === '/callback') {
        return null;
    }

    // AI 메뉴 클릭 핸들러 (이력서 체크)
    const handleAIMenuClick = async (e, path) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('app_session');
            if (!token) {
                alert('로그인이 필요합니다.');
                navigate('/?view=login');
                return;
            }

            // 사용자 정보 조회
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

            // 이력서 작성 여부 확인 (skills가 있고 비어있지 않은지 확인)
            const hasResume = user.skills && (
                (Array.isArray(user.skills) && user.skills.length > 0) ||
                (typeof user.skills === 'string' && user.skills.trim() !== '' && user.skills !== '[]')
            );

            if (!hasResume) {
                setShowResumeModal(true);
                return;
            }

            // 이력서가 있으면 해당 페이지로 이동
            navigate(path);
        } catch (error) {
            console.error('이력서 확인 오류:', error);
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        }
    };

    // 이력서 작성하기 버튼 클릭
    const handleGoToResume = () => {
        setShowResumeModal(false);
        navigate('/resume');
    };

    const navStyle = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        borderTop: '1px solid rgba(0,0,0,0.1)'
    };

    const menuStyle = {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        listStyle: 'none',
        margin: 0,
        padding: '2px 0',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto'
    };

    const linkStyle = (isActive) => ({
        color: isActive ? '#667eea' : '#222',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 8px',
        fontSize: '0.9rem',
        fontWeight: '700',
        transition: 'all 0.3s ease',
        borderRadius: '8px',
        minWidth: '65px',
        flex: 1,
        letterSpacing: '-0.3px',
        textShadow: isActive ? '0 1px 2px rgba(102, 126, 234, 0.3)' : '0 1px 1px rgba(0,0,0,0.1)'
    });

    const iconStyle = (isActive) => ({
        fontSize: '1.8rem',
        marginBottom: '2px',
        filter: isActive ? 'brightness(1.1)' : 'brightness(0.95)',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
    });

    return (
        <>
            <nav style={navStyle}>
                <ul style={menuStyle}>
                    <li style={{ flex: 1 }}>
                        <a
                            href="/ai-recommendation"
                            onClick={(e) => handleAIMenuClick(e, '/ai-recommendation')}
                            style={linkStyle(location.pathname === '/ai-recommendation')}
                        >
                            <span style={iconStyle(location.pathname === '/ai-recommendation')}>🤖</span>
                            <span>AI채용</span>
                        </a>
                    </li>
                    <li style={{ flex: 1 }}>
                        <a
                            href="/ai-interview"
                            onClick={(e) => handleAIMenuClick(e, '/ai-interview')}
                            style={linkStyle(location.pathname === '/ai-interview')}
                        >
                            <span style={iconStyle(location.pathname === '/ai-interview')}>🎤</span>
                            <span>AI면접</span>
                        </a>
                    </li>
                    <li style={{ flex: 1 }}>
                        <Link
                            to="/jobs"
                            style={linkStyle(location.pathname === '/jobs')}
                        >
                            <span style={iconStyle(location.pathname === '/jobs')}>💼</span>
                            <span>채용공고</span>
                        </Link>
                    </li>
                    <li style={{ flex: 1 }}>
                        <Link
                            to="/resume"
                            style={linkStyle(location.pathname === '/resume')}
                        >
                            <span style={iconStyle(location.pathname === '/resume')}>📋</span>
                            <span>이력서</span>
                        </Link>
                    </li>
                    <li style={{ flex: 1 }}>
                        <Link
                            to="/menu"
                            style={linkStyle(location.pathname === '/menu')}
                        >
                            <span style={iconStyle(location.pathname === '/menu')}>☰</span>
                            <span>전체메뉴</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* 이력서 필요 모달 */}
            {showResumeModal && (
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
                    zIndex: 2000,
                    padding: '20px'
                }}
                onClick={() => setShowResumeModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '40px 30px',
                        maxWidth: '400px',
                        width: '100%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        textAlign: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '20px'
                        }}>📋</div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            color: '#333',
                            marginBottom: '20px',
                            fontWeight: '700',
                            lineHeight: '1.4'
                        }}>
                            AI 채용 추천과 AI 면접은<br/>
                            이력서 작성 후 이용 가능하십니다.
                        </h2>
                        <p style={{
                            color: '#666',
                            marginBottom: '30px',
                            lineHeight: '1.6',
                            fontSize: '1rem'
                        }}>
                            이력서를 작성하시면 맞춤형 AI 서비스를<br/>
                            이용하실 수 있습니다.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => setShowResumeModal(false)}
                                style={{
                                    flex: 1,
                                    background: '#e0e0e0',
                                    color: '#666',
                                    border: 'none',
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#d0d0d0';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#e0e0e0';
                                }}
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleGoToResume}
                                style={{
                                    flex: 1.5,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 20px',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }}
                            >
                                이력서 작성하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
