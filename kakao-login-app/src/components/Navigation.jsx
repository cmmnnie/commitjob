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
        padding: '8px 12px',
        fontSize: '0.7rem',
        fontWeight: isActive ? '600' : '500',
        transition: 'all 0.3s ease',
        borderRadius: '8px',
        minWidth: '60px'
    });

    const iconStyle = (isActive) => ({
        fontSize: '1.4rem',
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
                        to="/ai-recommendation"
                        style={linkStyle(location.pathname === '/ai-recommendation')}
                    >
                        <span style={iconStyle(location.pathname === '/ai-recommendation')}>🤖</span>
                        <span>AI추천</span>
                    </Link>
                </li>
                <li>
                    <Link
                        to="/jobs"
                        style={linkStyle(location.pathname === '/jobs')}
                    >
                        <span style={iconStyle(location.pathname === '/jobs')}>💼</span>
                        <span>채용공고</span>
                    </Link>
                </li>
                <li>
                    <Link
                        to="/resume"
                        style={linkStyle(location.pathname === '/resume')}
                    >
                        <span style={iconStyle(location.pathname === '/resume')}>📄</span>
                        <span>이력서</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
}
