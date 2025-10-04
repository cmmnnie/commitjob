import { Link, useLocation } from 'react-router-dom';

export default function Header() {
    const location = useLocation();

    // 콜백 페이지에서는 헤더 숨기기
    if (location.pathname === '/callback') {
        return null;
    }

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
        justifyContent: 'center'
    };

    const logoStyle = {
        color: '#667eea',
        fontSize: '1.3rem',
        fontWeight: '700',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease'
    };

    return (
        <header style={headerStyle}>
            <div style={containerStyle}>
                <Link to="/" style={logoStyle}>
                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                    <span>CommitJob</span>
                </Link>
            </div>
        </header>
    );
}
