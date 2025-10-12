import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
    const location = useLocation();

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
        <nav style={navStyle}>
            <ul style={menuStyle}>
                <li style={{ flex: 1 }}>
                    <Link
                        to="/ai-recommendation"
                        style={linkStyle(location.pathname === '/ai-recommendation')}
                    >
                        <span style={iconStyle(location.pathname === '/ai-recommendation')}>🤖</span>
                        <span>AI채용</span>
                    </Link>
                </li>
                <li style={{ flex: 1 }}>
                    <Link
                        to="/ai-interview"
                        style={linkStyle(location.pathname === '/ai-interview')}
                    >
                        <span style={iconStyle(location.pathname === '/ai-interview')}>🎤</span>
                        <span>AI면접</span>
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
    );
}
