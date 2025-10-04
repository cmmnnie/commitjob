import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
    const location = useLocation();

    const navStyle = {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '15px 0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
    };

    const containerStyle = {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const logoStyle = {
        color: 'white',
        fontSize: '1.5rem',
        fontWeight: '700',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    };

    const menuStyle = {
        display: 'flex',
        gap: '20px',
        listStyle: 'none',
        margin: 0,
        padding: 0
    };

    const linkStyle = (isActive) => ({
        color: 'white',
        textDecoration: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
        border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent'
    });

    const linkHoverStyle = {
        background: 'rgba(255, 255, 255, 0.15)',
    };

    return (
        <nav style={navStyle}>
            <div style={containerStyle}>
                <Link to="/" style={logoStyle}>
                    <span>🎯</span>
                    <span>CommitJob</span>
                </Link>
                <ul style={menuStyle}>
                    <li>
                        <Link
                            to="/"
                            style={linkStyle(location.pathname === '/')}
                            onMouseEnter={(e) => Object.assign(e.target.style, linkHoverStyle)}
                            onMouseLeave={(e) => Object.assign(e.target.style, linkStyle(location.pathname === '/'))}
                        >
                            홈
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="/cookie-test"
                            style={linkStyle(location.pathname === '/cookie-test')}
                            onMouseEnter={(e) => Object.assign(e.target.style, linkHoverStyle)}
                            onMouseLeave={(e) => Object.assign(e.target.style, linkStyle(location.pathname === '/cookie-test'))}
                        >
                            쿠키 테스트
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="/test-connection"
                            style={linkStyle(location.pathname === '/test-connection')}
                            onMouseEnter={(e) => Object.assign(e.target.style, linkHoverStyle)}
                            onMouseLeave={(e) => Object.assign(e.target.style, linkStyle(location.pathname === '/test-connection'))}
                        >
                            연결 테스트
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
}
