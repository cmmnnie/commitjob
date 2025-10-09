import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function AIInterviewPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState(null);
    const [companyName, setCompanyName] = useState('');

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('app_session');
            if (!token) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }

            const userResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }

            const userData = await userResponse.json();
            if (userData.user) {
                setCurrentUser(userData.user);
            } else {
                setError('사용자 정보를 불러올 수 없습니다.');
            }
        } catch (err) {
            console.error('[AI면접] 오류:', err);
            setError('사용자 정보를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const generateQuestions = async () => {
        if (!companyName.trim()) {
            alert('회사명을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/interview-questions`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    custom_company: companyName.trim()
                })
            });

            if (!response.ok) {
                throw new Error('면접 질문 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.questions) {
                setQuestions(data.questions);
            } else {
                // 샘플 질문 표시
                showSampleQuestions();
            }
        } catch (err) {
            console.error('[면접 질문 생성] 오류:', err);
            showSampleQuestions();
        } finally {
            setIsLoading(false);
        }
    };

    const showSampleQuestions = () => {
        const sampleQuestions = [
            {
                id: 1,
                question: "자기소개를 해주세요.",
                category: "인성",
                difficulty: "쉬움"
            },
            {
                id: 2,
                question: `${companyName || '해당 회사'}에 지원한 이유는 무엇인가요?`,
                category: "지원동기",
                difficulty: "쉬움"
            },
            {
                id: 3,
                question: `해당 포지션에서 가장 중요하다고 생각하는 역량은 무엇인가요?`,
                category: "직무 이해",
                difficulty: "보통"
            },
            {
                id: 4,
                question: "최근에 진행한 프로젝트나 학습한 기술에 대해 설명해주세요.",
                category: "기술 역량",
                difficulty: "보통"
            },
            {
                id: 5,
                question: "어려운 문제를 해결한 경험이 있다면 공유해주세요.",
                category: "문제해결",
                difficulty: "어려움"
            }
        ];
        setQuestions(sampleQuestions);
    };

    const handleLogin = () => {
        navigate('/?view=login');
    };

    if (isLoading && !currentUser) {
        return (
            <div style={{
                padding: '20px',
                paddingBottom: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minHeight: 'calc(100vh - 60px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    textAlign: 'center'
                }}>
                    <div className="spinner" style={{
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #667eea',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: '#666', fontSize: '1rem' }}>로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error === '로그인이 필요합니다.') {
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
                    margin: '0 auto',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: '#333',
                        marginBottom: '15px',
                        fontWeight: '700'
                    }}>로그인이 필요합니다</h2>
                    <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                        AI 면접 준비 서비스를 이용하려면<br/>
                        로그인이 필요합니다.
                    </p>
                    <button
                        onClick={handleLogin}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '15px 24px',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}>
                        로그인하러 가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '20px',
            paddingBottom: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: 'calc(100vh - 60px)'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto'
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            fontSize: '2.2rem',
                            padding: '8px',
                            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                            borderRadius: '12px',
                            flexShrink: '0'
                        }}>🎤</div>
                        <div style={{ flex: '1' }}>
                            <h1 style={{
                                fontSize: '1.6rem',
                                color: '#667eea',
                                marginBottom: '2px',
                                fontWeight: '700',
                                letterSpacing: '-0.5px'
                            }}>AI 면접 준비</h1>
                            <p style={{
                                color: '#718096',
                                fontSize: '0.85rem',
                                margin: '0'
                            }}>
                                GPT-5-mini가 생성한 맞춤형 면접 질문
                            </p>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)',
                        border: '1px solid #e0e7ff',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '18px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                    }}>
                        <div style={{
                            fontSize: '1.25rem',
                            lineHeight: '1',
                            marginTop: '2px',
                            flexShrink: '0'
                        }}>💡</div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#4a5568',
                            lineHeight: '1.5',
                            flex: '1'
                        }}>
                            <strong style={{ color: '#667eea' }}>AI 기능</strong>
                            <br />
                            회사명 입력 → www.catch.co.kr에서 실시간 기출질문 10건 수집 → 사용자 프로필 참고 → 맞춤형 면접 질문 5개 생성
                        </div>
                    </div>

                    {/* 입력 폼 */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontWeight: '600',
                            color: '#2d3748',
                            fontSize: '0.95rem'
                        }}>
                            회사명 <span style={{ color: '#e53e3e' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isLoading) {
                                    generateQuestions();
                                }
                            }}
                            placeholder="예: 네이버, 카카오, 삼성전자, 쿠팡"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <button
                        onClick={generateQuestions}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            background: isLoading
                                ? '#cbd5e0'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '13px 20px',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            }
                        }}>
                        {isLoading ? '질문 생성 중...' : '면접 질문 생성하기'}
                    </button>
                </div>

                {/* 면접 질문 결과 */}
                {questions.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }}>
                        <div style={{
                            background: '#f7fafc',
                            padding: '20px',
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                color: '#2d3748',
                                marginBottom: '10px',
                                fontSize: '1.2rem',
                                fontWeight: '700'
                            }}>
                                {companyName} 면접 질문
                            </h3>
                            <p style={{ color: '#718096', fontSize: '0.95rem' }}>
                                <strong>총 {questions.length}개 질문</strong>
                            </p>
                        </div>

                        {questions.map((question, index) => (
                            <div
                                key={question.id || index}
                                style={{
                                    background: '#f8f9fa',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    marginBottom: '15px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                <div style={{
                                    color: '#667eea',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    marginBottom: '8px'
                                }}>
                                    Q{index + 1}.
                                </div>
                                <div style={{
                                    color: '#2d3748',
                                    fontSize: '1.05rem',
                                    lineHeight: '1.6',
                                    marginBottom: '12px',
                                    fontWeight: '500'
                                }}>
                                    {question.question}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    fontSize: '0.85rem'
                                }}>
                                    <span style={{
                                        background: '#e0e7ff',
                                        color: '#5a67d8',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontWeight: '500'
                                    }}>
                                        {question.category || '일반'}
                                    </span>
                                    <span style={{
                                        background: question.difficulty === '어려움'
                                            ? '#fed7d7'
                                            : question.difficulty === '보통'
                                            ? '#fefcbf'
                                            : '#c6f6d5',
                                        color: question.difficulty === '어려움'
                                            ? '#c53030'
                                            : question.difficulty === '보통'
                                            ? '#975a16'
                                            : '#22543d',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontWeight: '500'
                                    }}>
                                        난이도: {question.difficulty || '보통'}
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div style={{
                            background: '#f0f4f8',
                            borderRadius: '8px',
                            padding: '15px',
                            marginTop: '20px',
                            fontSize: '0.85rem',
                            color: '#718096',
                            textAlign: 'center'
                        }}>
                            💡 GPT-5-mini가 www.catch.co.kr 실시간 기출면접질문 10건과 사용자 프로필을 참고하여 생성한 맞춤형 질문입니다
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
