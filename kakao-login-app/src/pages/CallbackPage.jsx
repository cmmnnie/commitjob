import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import '../styles/callback.css';

export default function CallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('로그인 처리 중...');
    const [message, setMessage] = useState('잠시만 기다려주세요');
    const [debugInfo, setDebugInfo] = useState('');
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        handleCallback();
    }, []);

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
                            navigate('/');
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

    return (
        <div className="callback-container">
            <div className="spinner"></div>
            <h2>{status}</h2>
            <p>{message}</p>
            {showDebug && (
                <div className="debug">
                    <pre>{debugInfo}</pre>
                </div>
            )}
        </div>
    );
}
