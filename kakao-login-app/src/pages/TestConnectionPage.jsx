import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

const BACKEND_URL = CONFIG.BACKEND_URL;

export default function TestConnectionPage() {
    const [envInfo, setEnvInfo] = useState('');
    const [testResult, setTestResult] = useState('');
    const [testClass, setTestClass] = useState('');

    useEffect(() => {
        setEnvInfo(
            `현재 URL: ${window.location.href}\n` +
            `Origin: ${window.location.origin}\n` +
            `Protocol: ${window.location.protocol}\n` +
            `Backend URL: ${BACKEND_URL}\n` +
            `User Agent: ${navigator.userAgent}`
        );

        // 페이지 로드 시 자동 테스트
        if (window.location.protocol === 'file:') {
            alert('⚠️ file:// 프로토콜로 실행 중입니다.\n웹 서버를 사용하여 실행해야 합니다.\n\n아래 "권장 실행 방법"을 참고하세요.');
        }
    }, []);

    const testBackend = async () => {
        setTestResult('테스트 중...');
        setTestClass('');

        try {
            const response = await fetch(`${BACKEND_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            });

            const data = await response.json();

            setTestResult(
                `✅ 백엔드 연결 성공!\n\n` +
                `상태 코드: ${response.status}\n` +
                `응답: ${JSON.stringify(data, null, 2)}`
            );
            setTestClass('success');
        } catch (error) {
            setTestResult(
                `❌ 백엔드 연결 실패\n\n` +
                `오류: ${error.message}\n` +
                `오류 타입: ${error.name}\n\n` +
                `가능한 원인:\n` +
                `1. 백엔드 서버가 실행되지 않음 (포트 4001)\n` +
                `2. file:// 프로토콜로 실행 중 (웹 서버 사용 필요)\n` +
                `3. 방화벽/네트워크 문제`
            );
            setTestClass('error');
        }
    };

    const testCORS = async () => {
        setTestResult('CORS 설정 확인 중...');
        setTestClass('');

        try {
            const response = await fetch(`${BACKEND_URL}/debug/cors`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            });

            const data = await response.json();

            setTestResult(
                `✅ CORS 설정:\n\n` +
                JSON.stringify(data, null, 2)
            );
            setTestClass('success');
        } catch (error) {
            setTestResult(
                `❌ CORS 확인 실패\n\n` +
                `오류: ${error.message}`
            );
            setTestClass('error');
        }
    };

    const testLoginURL = async () => {
        setTestResult('카카오 로그인 URL 요청 중...');
        setTestClass('');

        const origin = window.location.origin;

        try {
            const response = await fetch(
                `${BACKEND_URL}/auth/kakao/login-url?origin=${encodeURIComponent(origin)}`,
                {
                    method: 'GET',
                    mode: 'cors',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setTestResult(
                    `✅ 카카오 로그인 URL 요청 성공!\n\n` +
                    `Origin: ${origin}\n` +
                    `카카오 URL:\n${data.url}`
                );
                setTestClass('success');
            } else {
                const errorData = await response.json();
                setTestResult(
                    `❌ 카카오 로그인 URL 요청 실패\n\n` +
                    `상태 코드: ${response.status}\n` +
                    `오류: ${JSON.stringify(errorData, null, 2)}`
                );
                setTestClass('error');
            }
        } catch (error) {
            setTestResult(
                `❌ 카카오 로그인 URL 요청 실패\n\n` +
                `오류: ${error.message}\n\n` +
                `Origin: ${origin}\n` +
                `이 origin이 백엔드 CORS 허용 목록에 있는지 확인하세요.`
            );
            setTestClass('error');
        }
    };

    const buttonStyle = {
        background: '#667eea',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '5px'
    };

    const testBoxStyle = {
        background: 'white',
        padding: '20px',
        margin: '10px 0',
        borderRadius: '5px',
        borderLeft: testClass === 'success' ? '4px solid #22c55e' : testClass === 'error' ? '4px solid #ef4444' : '4px solid #667eea'
    };

    return (
        <div style={{
            fontFamily: 'monospace',
            padding: '20px',
            paddingBottom: '80px',
            background: '#f5f5f5',
            minHeight: '100vh'
        }}>
            <h1 style={{ marginBottom: '20px' }}>카카오 로그인 앱 - 백엔드 연결 테스트</h1>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>1. 현재 환경</h3>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{envInfo}</pre>
            </div>

            <div style={testBoxStyle}>
                <h3>2. 백엔드 연결 테스트</h3>
                <button onClick={testBackend} style={buttonStyle}>백엔드 연결 테스트</button>
                <button onClick={testCORS} style={buttonStyle}>CORS 설정 확인</button>
                <button onClick={testLoginURL} style={buttonStyle}>카카오 로그인 URL 요청</button>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{testResult}</pre>
            </div>

            <div style={{
                background: 'white',
                padding: '20px',
                margin: '10px 0',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea'
            }}>
                <h3>3. 권장 실행 방법</h3>
                <p>file:// 프로토콜로 실행하면 CORS 오류가 발생합니다.</p>
                <p><strong>다음 중 하나를 사용하세요:</strong></p>
                <pre style={{
                    background: '#f9fafb',
                    padding: '10px',
                    borderRadius: '3px',
                    overflowX: 'auto'
                }}>{`# 방법 1: Vite (권장)
npm run dev

# 방법 2: http-server
npx http-server -p 3000 -c-1

# 방법 3: Python
python -m http.server 3000`}</pre>
            </div>
        </div>
    );
}
