import { Link } from 'react-router-dom';

export default function MenuPage() {
    const menuItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        background: 'white',
        borderRadius: '15px',
        marginBottom: '15px',
        textDecoration: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
    };

    const menuIconStyle = {
        fontSize: '3rem',
        flexShrink: 0,
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const menuContentStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const menuTitleStyle = {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#333',
        lineHeight: '1.3'
    };

    const menuDescStyle = {
        fontSize: '0.95rem',
        color: '#666',
        lineHeight: '1.5',
        fontWeight: '600'
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

                    <Link to="/ai-recommendation" style={menuItemStyle}>
                        <span style={menuIconStyle}>🤖</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 채용 추천</div>
                            <div style={menuDescStyle}>GPT가 회원님 이력서와 CommitJob 채용공고를 매칭하여 매칭률 높은 채용공고를 추천해드립니다.</div>
                        </div>
                    </Link>

                    <Link to="/ai-interview" style={menuItemStyle}>
                        <span style={menuIconStyle}>🎤</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 면접 준비</div>
                            <div style={menuDescStyle}>GPT가 맞춤형 면접 질문, 모범 답변, 입력한 답변에 대한 피드백을 해드립니다.</div>
                        </div>
                    </Link>

                    <Link to="/jobs" style={menuItemStyle}>
                        <span style={menuIconStyle}>💼</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>채용공고</div>
                            <div style={menuDescStyle}>최신 빅데이터/AI, IT개발 채용공고를 확인하고 지원하세요.</div>
                        </div>
                    </Link>

                    <Link to="/ai-cover-letter" style={menuItemStyle}>
                        <span style={menuIconStyle}>📝</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 자소서 관리</div>
                            <div style={menuDescStyle}>GPT가 회원님의 이력서를 분석하여 맞춤형 자기소개서를 작성하고 피드백을 제공합니다.</div>
                        </div>
                    </Link>

                    <Link to="/resume" style={menuItemStyle}>
                        <span style={menuIconStyle}>📋</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>이력서 관리</div>
                            <div style={menuDescStyle}>이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드립니다.</div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
