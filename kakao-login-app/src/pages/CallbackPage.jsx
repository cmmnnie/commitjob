import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function CallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('로그인 처리 중...');
    const [message, setMessage] = useState('잠시만 기다려주세요');
    const [debugInfo, setDebugInfo] = useState('');
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        const handleCallback = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const ok = params.get('ok');
            const token = params.get('token');

            console.log('[CALLBACK] ok parameter:', ok);
            console.log('[CALLBACK] token received:', !!token);
            console.log('[CALLBACK] token length:', token ? token.length : 0);
            console.log('[CALLBACK] Current URL:', window.location.href);

            // 디버그 정보는 개발 환경에서만 표시
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const debug = `URL: ${window.location.href}\nok: ${ok}\ntoken: ${token ? 'exists (length: ' + token.length + ')' : 'missing'}`;
                setDebugInfo(debug);
                setShowDebug(true);
            }

            if (ok === '1' && token) {
                setStatus('로그인 성공!');
                setMessage('사용자 정보를 확인하는 중...');

                // JWT 토큰을 localStorage에 저장
                localStorage.setItem('app_session', token);
                console.log('[CALLBACK] Token saved to localStorage');

                // 사용자 정보 확인
                console.log('[CALLBACK] Fetching user info from:', `${CONFIG.BACKEND_URL}/api/me`);
                console.log('[CALLBACK] Authorization header:', `Bearer ${token.substring(0, 20)}...`);

                const response = await fetch(`${CONFIG.BACKEND_URL}/api/me`, {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('[CALLBACK] /api/me response status:', response.status);
                console.log('[CALLBACK] /api/me response headers:', [...response.headers.entries()]);

                if (response.ok) {
                    const data = await response.json();
                    console.log('[CALLBACK] User data:', data);

                    if (data.user) {
                        // 이름 마스킹
                        const name = data.user.name || '사용자';
                        let maskedName = name;

                        if (name !== '사용자' && name.length > 0) {
                            if (name.length === 2) {
                                maskedName = name[0] + '*';
                            } else if (name.length >= 3) {
                                const middle = '*'.repeat(name.length - 2);
                                maskedName = name[0] + middle + name[name.length - 1];
                            }
                        }

                        setStatus(`환영합니다, ${maskedName}님!`);
                        setMessage('메인 페이지로 이동합니다...');

                        setTimeout(() => {
                            navigate('/', {
                                replace: true,
                                state: { fromLogin: true, user: data.user }
                            });
                        }, 1000);
                    } else {
                        throw new Error('사용자 정보를 찾을 수 없습니다');
                    }
                } else {
                    const errorText = await response.text();
                    console.error('[CALLBACK] Error response:', errorText);

                    // 디버그 정보는 개발 환경에서만 표시
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        const debug = `Error: ${response.status}\nToken: ${token ? 'exists' : 'missing'}\nResponse: ${errorText}`;
                        setDebugInfo(debug);
                        setShowDebug(true);
                    }
                    throw new Error('사용자 정보 조회 실패');
                }
            } else {
                throw new Error('로그인에 실패했습니다');
            }
        } catch (error) {
            console.error('[CALLBACK] Error:', error);
            setStatus('로그인 실패');
            setMessage(error.message);

            // 디버그 정보는 개발 환경에서만 표시
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                setDebugInfo(error.stack || error.message);
                setShowDebug(true);
            }

            setTimeout(() => {
                navigate('/');
            }, 3000);
        }
        };

        handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{
            margin: 0,
            padding: 0,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%'
            }}>
                <div style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #667eea',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h2 style={{ margin: '0 0 10px', color: '#333' }}>{status}</h2>
                <p style={{ color: '#666', margin: 0 }}>{message}</p>
                {showDebug && (
                    <div style={{
                        marginTop: '20px',
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#666',
                        textAlign: 'left',
                        wordBreak: 'break-all'
                    }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{debugInfo}</pre>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
