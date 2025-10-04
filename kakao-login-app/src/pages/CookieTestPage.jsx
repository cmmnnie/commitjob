import { useState } from 'react';
import { CONFIG } from '../config';

const BACKEND_URL = CONFIG.BACKEND_URL;

export default function CookieTestPage() {
    const [setCookieResult, setSetCookieResult] = useState('');
    const [checkCookieResult, setCheckCookieResult] = useState('');
    const [apiMeResult, setApiMeResult] = useState('');
    const [browserCookies, setBrowserCookies] = useState('');

    const handleSetCookie = async () => {
        setSetCookieResult('테스트 중...');

        try {
            const response = await fetch(`${BACKEND_URL}/debug/set-cookie`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            setSetCookieResult(
                `✅ 성공!\n\n` +
                `응답:\n${JSON.stringify(data, null, 2)}\n\n` +
                `Response Headers:\n${[...response.headers.entries()].map(([k, v]) => `${k}: ${v}`).join('\n')}`
            );
        } catch (error) {
            setSetCookieResult(`❌ 실패: ${error.message}`);
        }
    };

    const handleCheckCookie = async () => {
        setCheckCookieResult('테스트 중...');

        try {
            const response = await fetch(`${BACKEND_URL}/debug/check-cookie`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.hasTestCookie || data.hasCookie) {
                setCheckCookieResult(
                    `✅ 쿠키 전송 성공!\n\n` +
                    JSON.stringify(data, null, 2)
                );
            } else {
                setCheckCookieResult(
                    `❌ 쿠키가 백엔드로 전송되지 않음\n\n` +
                    JSON.stringify(data, null, 2) + '\n\n' +
                    `먼저 "백엔드에서 쿠키 설정" 버튼을 클릭하세요.`
                );
            }
        } catch (error) {
            setCheckCookieResult(`❌ 실패: ${error.message}`);
        }
    };

    const handleTestApiMe = async () => {
        setApiMeResult('테스트 중...');

        try {
            const response = await fetch(`${BACKEND_URL}/api/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                setApiMeResult(
                    `✅ 성공! (${response.status})\n\n` +
                    JSON.stringify(data, null, 2)
                );
            } else {
                setApiMeResult(
                    `❌ 실패 (${response.status})\n\n` +
                    JSON.stringify(data, null, 2) + '\n\n' +
                    `원인: 로그인이 필요하거나 쿠키가 전송되지 않음`
                );
            }
        } catch (error) {
            setApiMeResult(`❌ 실패: ${error.message}`);
        }
    };

    const handleShowBrowserCookies = () => {
        const cookies = document.cookie;
        setBrowserCookies(cookies || '(없음 또는 모두 httpOnly)');
    };

    return (
        <div style={{
            fontFamily: 'monospace',
            padding: '20px',
            paddingBottom: '80px',
            background: '#f5f5f5',
            minHeight: '100vh'
        }}>
            <h1 style={{ marginBottom: '20px' }}>쿠키 전송 테스트</h1>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>현재 상태</h3>
                <p><strong>프론트엔드 URL:</strong> {window.location.origin}</p>
                <p><strong>백엔드 URL:</strong> {BACKEND_URL}</p>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>테스트 1: 쿠키 설정</h3>
                <button onClick={handleSetCookie} style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    margin: '5px'
                }}>백엔드에서 쿠키 설정</button>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{setCookieResult}</pre>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>테스트 2: 쿠키 확인</h3>
                <button onClick={handleCheckCookie} style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    margin: '5px'
                }}>백엔드에서 쿠키 읽기</button>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{checkCookieResult}</pre>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>테스트 3: /api/me 호출</h3>
                <button onClick={handleTestApiMe} style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    margin: '5px'
                }}>사용자 정보 API 호출</button>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{apiMeResult}</pre>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>브라우저 쿠키 (JavaScript로 볼 수 있는 것만)</h3>
                <button onClick={handleShowBrowserCookies} style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    margin: '5px'
                }}>브라우저 쿠키 보기</button>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{browserCookies}</pre>
                <p><em>참고: httpOnly 쿠키는 JavaScript로 볼 수 없습니다 (보안상 정상)</em></p>
            </div>
        </div>
    );
}
