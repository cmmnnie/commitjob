import { useState } from 'react';
import '../styles/test.css';

const BACKEND_URL = 'http://localhost:4001';

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
        <div className="test-page">
            <h1>쿠키 전송 테스트</h1>

            <div className="test-box">
                <h3>현재 상태</h3>
                <p><strong>프론트엔드 URL:</strong> {window.location.origin}</p>
                <p><strong>백엔드 URL:</strong> {BACKEND_URL}</p>
            </div>

            <div className="test-box">
                <h3>테스트 1: 쿠키 설정</h3>
                <button onClick={handleSetCookie}>백엔드에서 쿠키 설정</button>
                <pre>{setCookieResult}</pre>
            </div>

            <div className="test-box">
                <h3>테스트 2: 쿠키 확인</h3>
                <button onClick={handleCheckCookie}>백엔드에서 쿠키 읽기</button>
                <pre>{checkCookieResult}</pre>
            </div>

            <div className="test-box">
                <h3>테스트 3: /api/me 호출</h3>
                <button onClick={handleTestApiMe}>사용자 정보 API 호출</button>
                <pre>{apiMeResult}</pre>
            </div>

            <div className="test-box">
                <h3>브라우저 쿠키 (JavaScript로 볼 수 있는 것만)</h3>
                <button onClick={handleShowBrowserCookies}>브라우저 쿠키 보기</button>
                <pre>{browserCookies}</pre>
                <p><em>참고: httpOnly 쿠키는 JavaScript로 볼 수 없습니다 (보안상 정상)</em></p>
            </div>
        </div>
    );
}
