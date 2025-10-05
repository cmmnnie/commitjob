import { Link } from 'react-router-dom';

export default function MenuPage() {
    const menuItemStyle = {
        display: 'block',
        padding: '20px',
        background: 'white',
        borderRadius: '15px',
        marginBottom: '15px',
        textDecoration: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
    };

    const menuIconStyle = {
        fontSize: '2.5rem',
        marginBottom: '10px',
        display: 'block'
    };

    const menuTitleStyle = {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#333',
        marginBottom: '5px'
    };

    const menuDescStyle = {
        fontSize: '0.85rem',
        color: '#999',
        lineHeight: '1.4'
    };

    return (
        <div style={{
            padding: '20px',
            paddingBottom: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: 'calc(100vh - 60px)'
        }}>
            <div style={{
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    color: 'white',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    textAlign: 'center'
                }}>전체 메뉴</h1>

                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '15px',
                        opacity: 0.9
                    }}>메인 기능</h2>

                    <Link to="/" style={menuItemStyle}>
                        <span style={menuIconStyle}>🏠</span>
                        <div style={menuTitleStyle}>홈</div>
                        <div style={menuDescStyle}>로그인 및 프로필 확인</div>
                    </Link>

                    <Link to="/ai-recommendation" style={menuItemStyle}>
                        <span style={menuIconStyle}>🤖</span>
                        <div style={menuTitleStyle}>AI 맞춤 추천</div>
                        <div style={menuDescStyle}>당신의 경력과 스킬에 딱 맞는 채용공고를 AI가 추천해드립니다</div>
                    </Link>

                    <Link to="/jobs" style={menuItemStyle}>
                        <span style={menuIconStyle}>💼</span>
                        <div style={menuTitleStyle}>채용공고</div>
                        <div style={menuDescStyle}>최신 IT 채용공고를 확인하고 지원하세요</div>
                    </Link>

                    <Link to="/resume" style={menuItemStyle}>
                        <span style={menuIconStyle}>📄</span>
                        <div style={menuTitleStyle}>이력서 관리</div>
                        <div style={menuDescStyle}>나만의 이력서를 작성하고 관리하세요</div>
                    </Link>
                </div>

                <div>
                    <h2 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '15px',
                        opacity: 0.9
                    }}>개발자 도구</h2>

                    <Link to="/cookie-test" style={menuItemStyle}>
                        <span style={menuIconStyle}>🍪</span>
                        <div style={menuTitleStyle}>쿠키 테스트</div>
                        <div style={menuDescStyle}>쿠키 전송 및 세션 관리 테스트</div>
                    </Link>

                    <Link to="/simple-test" style={menuItemStyle}>
                        <span style={menuIconStyle}>🔬</span>
                        <div style={menuTitleStyle}>간단 테스트</div>
                        <div style={menuDescStyle}>백엔드 연결 상태 확인</div>
                    </Link>

                    <Link to="/test-connection" style={menuItemStyle}>
                        <span style={menuIconStyle}>🔌</span>
                        <div style={menuTitleStyle}>연결 테스트</div>
                        <div style={menuDescStyle}>상세 백엔드 연결 및 CORS 테스트</div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
