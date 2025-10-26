import { useState, useEffect } from 'react';

export default function CodingTestPage() {
    const [iframeLoaded, setIframeLoaded] = useState(false);

    useEffect(() => {
        // iframe 로드 완료 후 로딩 상태 변경
        const timer = setTimeout(() => {
            setIframeLoaded(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{
            width: '100%',
            height: 'calc(100vh - 60px)', // 하단바 높이 제외
            position: 'relative',
            background: '#f5f5f5'
        }}>
            {/* 로딩 인디케이터 */}
            {!iframeLoaded && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    zIndex: 10
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid #f3f3f3',
                        borderTop: '5px solid #667eea',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{
                        color: '#666',
                        fontSize: '1rem',
                        fontWeight: '600'
                    }}>코딩 테스트 페이지 로딩 중...</p>
                </div>
            )}

            {/* iframe */}
            <iframe
                src="https://commitjob.vercel.app/"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                }}
                title="Coding Test"
                onLoad={() => setIframeLoaded(true)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />

            {/* 스피너 애니메이션 */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
