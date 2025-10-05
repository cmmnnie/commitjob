export default function JobsPage() {
    return (
        <div style={{
            padding: '20px',
            paddingBottom: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: 'calc(100vh - 60px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💼</div>
                    <h1 style={{
                        fontSize: '1.8rem',
                        color: '#667eea',
                        marginBottom: '10px',
                        fontWeight: '700'
                    }}>채용공고</h1>
                    <p style={{ color: '#666', fontSize: '0.95rem' }}>
                        최신 채용공고를 확인하고 지원하세요
                    </p>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: '15px',
                    padding: '30px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: '1rem',
                        color: '#333',
                        marginBottom: '15px',
                        fontWeight: '600'
                    }}>
                        🚀 준비 중입니다
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                        채용공고 기능이 곧 제공될 예정입니다.<br/>
                        조금만 기다려주세요!
                    </p>
                </div>

                <div style={{
                    background: '#f8f9fa',
                    borderRadius: '10px',
                    padding: '20px',
                    fontSize: '0.85rem',
                    color: '#666'
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '10px', color: '#333' }}>
                        💡 채용공고 기능 소개
                    </p>
                    <ul style={{
                        paddingLeft: '20px',
                        lineHeight: '1.8',
                        margin: 0
                    }}>
                        <li>최신 IT 채용공고 실시간 업데이트</li>
                        <li>직무별, 기술별 필터링</li>
                        <li>북마크 및 관심 공고 저장</li>
                        <li>원클릭 지원 서비스</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
