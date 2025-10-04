import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function SimpleTestPage() {
    const [result, setResult] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        setCurrentUrl(window.location.href);

        // 페이지 로드 시 경고
        if (window.location.protocol === 'file:') {
            alert('⚠️ file:// 프로토콜로 실행 중입니다.\n웹 서버를 사용하여 실행해야 합니다.');
        }
    }, []);

    const testBackend = async () => {
        setResult('테스트 중...\n\n브라우저 콘솔(F12)을 확인하세요!');

        console.log('=== 백엔드 연결 테스트 시작 ===');
        console.log('프론트엔드 Origin:', window.location.origin);
        console.log('백엔드 URL:', CONFIG.BACKEND_URL);

        try {
            console.log('fetch 요청 시작...');

            const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('응답 받음:', response.status);
            console.log('응답 헤더:', [...response.headers.entries()]);

            const data = await response.json();
            console.log('응답 데이터:', data);

            setResult(
                '✅ 성공!\n\n' +
                `상태: ${response.status}\n` +
                `응답: ${JSON.stringify(data, null, 2)}\n\n` +
                '브라우저 콘솔에서 더 자세한 정보를 확인하세요.'
            );

        } catch (error) {
            console.error('❌ 오류 발생:', error);
            console.error('오류 이름:', error.name);
            console.error('오류 메시지:', error.message);
            console.error('오류 스택:', error.stack);

            setResult(
                '❌ 실패!\n\n' +
                `오류: ${error.message}\n\n` +
                '=== 해결 방법 ===\n' +
                '1. 백엔드 서버가 실행 중인지 확인\n' +
                '2. localhost:5500으로 접속했는지 확인 (127.0.0.1 아님!)\n' +
                '3. 브라우저 콘솔(F12)에서 CORS 오류 확인\n' +
                '4. 백엔드 터미널에서 로그 확인\n\n' +
                '브라우저 콘솔에서 더 자세한 오류를 확인하세요!'
            );
        }
    };

    return (
        <div style={{
            fontFamily: 'monospace',
            padding: '20px',
            background: '#f5f5f5',
            minHeight: '100vh'
        }}>
            <h1 style={{ marginBottom: '20px' }}>백엔드 연결 테스트</h1>
            <p style={{ marginBottom: '20px' }}>현재 URL: <span>{currentUrl}</span></p>
            <button onClick={testBackend} style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '5px 0 20px 0'
            }}>백엔드 테스트</button>
            <pre style={{
                background: 'white',
                padding: '20px',
                borderRadius: '5px',
                borderLeft: '4px solid #667eea',
                overflowX: 'auto'
            }}>{result}</pre>

            <h2>중요: 브라우저 콘솔(F12)을 확인하세요!</h2>
        </div>
    );
}
