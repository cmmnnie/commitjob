import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navigation() {
    const location = useLocation();
    const [showMenu, setShowMenu] = useState(false);

    // 콜백 페이지에서는 네비게이션 숨기기
    if (location.pathname === '/callback') {
        return null;
    }

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
        padding: '8px 0',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto'
    };

    const linkStyle = (isActive) => ({
        color: isActive ? '#667eea' : '#666',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        fontSize: '0.7rem',
        fontWeight: isActive ? '600' : '500',
        transition: 'all 0.3s ease',
        borderRadius: '8px',
        minWidth: '70px',
        flex: 1
    });

    const menuButtonStyle = {
        color: showMenu ? '#667eea' : '#666',
        background: 'none',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        fontSize: '0.7rem',
        fontWeight: showMenu ? '600' : '500',
        transition: 'all 0.3s ease',
        borderRadius: '8px',
        minWidth: '70px',
        cursor: 'pointer',
        flex: 1
    };

    const iconStyle = (isActive) => ({
        fontSize: '1.4rem',
        marginBottom: '2px'
    });

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
        display: showMenu ? 'block' : 'none'
    };

    const menuPanelStyle = {
        position: 'fixed',
        bottom: '60px',
        left: 0,
        right: 0,
        background: 'white',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        boxShadow: '0 -5px 20px rgba(0,0,0,0.2)',
        zIndex: 1001,
        transform: showMenu ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        maxHeight: '70vh',
        overflowY: 'auto'
    };

    const menuHeaderStyle = {
        padding: '20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const menuListStyle = {
        padding: '10px 0'
    };

    const menuItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '15px 20px',
        textDecoration: 'none',
        color: '#333',
        transition: 'background 0.2s',
        cursor: 'pointer'
    };

    const closeMenuPanelStyle = {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#666'
    };

    return (
        <>
            <div style={overlayStyle} onClick={() => setShowMenu(false)}></div>

            <div style={menuPanelStyle}>
                <div style={menuHeaderStyle}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>전체 메뉴</h3>
                    <button style={closeMenuPanelStyle} onClick={() => setShowMenu(false)}>✕</button>
                </div>
                <div style={menuListStyle}>
                    <Link to="/" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <span style={{ fontSize: '1.5rem' }}>🏠</span>
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '2px' }}>홈</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>로그인 및 프로필</div>
                        </div>
                    </Link>
                    <Link to="/cookie-test" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <span style={{ fontSize: '1.5rem' }}>🍪</span>
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '2px' }}>쿠키 테스트</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>쿠키 전송 테스트</div>
                        </div>
                    </Link>
                    <Link to="/simple-test" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <span style={{ fontSize: '1.5rem' }}>🔬</span>
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '2px' }}>간단 테스트</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>백엔드 연결 테스트</div>
                        </div>
                    </Link>
                    <Link to="/test-connection" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <span style={{ fontSize: '1.5rem' }}>🔌</span>
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '2px' }}>연결 테스트</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>상세 연결 테스트</div>
                        </div>
                    </Link>
                </div>
            </div>

            <nav style={navStyle}>
                <ul style={menuStyle}>
                    <li style={{ flex: 1 }}>
                        <Link
                            to="/ai-recommendation"
                            style={linkStyle(location.pathname === '/ai-recommendation')}
                        >
                            <span style={iconStyle(location.pathname === '/ai-recommendation')}>🤖</span>
                            <span>AI추천</span>
                        </Link>
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
                            <span style={iconStyle(location.pathname === '/resume')}>📄</span>
                            <span>이력서</span>
                        </Link>
                    </li>
                    <li style={{ flex: 1 }}>
                        <button style={menuButtonStyle} onClick={() => setShowMenu(!showMenu)}>
                            <span style={{ fontSize: '1.4rem', marginBottom: '2px' }}>☰</span>
                            <span>전체메뉴</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </>
    );
}
