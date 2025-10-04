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
        padding: '8px 16px',
        fontSize: '0.75rem',
        fontWeight: isActive ? '600' : '500',
        transition: 'all 0.3s ease',
        borderRadius: '8px',
        minWidth: '70px'
    });

    const iconStyle = (isActive) => ({
        fontSize: '1.5rem',
        marginBottom: '2px'
    });

    return (
        <nav style={navStyle}>
            <ul style={menuStyle}>
                <li>
                    <Link
                        to="/"
                        style={linkStyle(location.pathname === '/')}
                    >
                        <span style={iconStyle(location.pathname === '/')}>🏠</span>
                        <span>홈</span>
                    </Link>
                </li>
                <li>
                    <Link
                        to="/cookie-test"
                        style={linkStyle(location.pathname === '/cookie-test')}
                    >
                        <span style={iconStyle(location.pathname === '/cookie-test')}>🍪</span>
                        <span>쿠키 테스트</span>
                    </Link>
                </li>
                <li>
                    <Link
                        to="/test-connection"
                        style={linkStyle(location.pathname === '/test-connection')}
                    >
                        <span style={iconStyle(location.pathname === '/test-connection')}>🔌</span>
                        <span>연결 테스트</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
