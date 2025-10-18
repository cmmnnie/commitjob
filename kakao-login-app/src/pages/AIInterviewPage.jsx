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
    const [generatedCompanyName, setGeneratedCompanyName] = useState(''); // 질문 생성 시점의 회사명 저장
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [modelAnswer, setModelAnswer] = useState(null);
    const [isModelAnswerLoading, setIsModelAnswerLoading] = useState(false);
    const [revisedAnswer, setRevisedAnswer] = useState(null);
    const [isRevisedAnswerLoading, setIsRevisedAnswerLoading] = useState(false);

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

                // 이력서 정보 확인
                try {
                    const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${userData.user.id}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        // 이력서 필수 정보가 없는 경우
                        if (!profileData.profile ||
                            (!profileData.profile.preferred_jobs &&
                             !profileData.profile.experience &&
                             (!profileData.profile.skills || profileData.profile.skills.length === 0))) {
                            setError('이력서를 먼저 작성해주세요.');
                        }
                    }
                } catch (profileErr) {
                    console.warn('[AI면접] 이력서 확인 실패:', profileErr);
                }
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

        // 질문 생성 시점의 회사명 저장
        const currentCompanyName = companyName.trim();
        setGeneratedCompanyName(currentCompanyName);

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
                    custom_company: currentCompanyName
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
                showSampleQuestions(currentCompanyName);
            }
        } catch (err) {
            console.error('[면접 질문 생성] 오류:', err);
            showSampleQuestions(currentCompanyName);
        } finally {
            setIsLoading(false);
        }
    };

    const showSampleQuestions = (company) => {
        const sampleQuestions = [
            {
                id: 1,
                question: "자기소개를 해주세요.",
                category: "인성",
                difficulty: "쉬움"
            },
            {
                id: 2,
                question: `${company || '해당 회사'}에 지원한 이유는 무엇인가요?`,
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

    const handleSelectQuestion = (question) => {
        setSelectedQuestion(question);
        setAnswer('');
        setFeedback(null);
        setModelAnswer(null);
        setRevisedAnswer(null);
    };

    const handleGetModelAnswer = async () => {
        setIsModelAnswerLoading(true);
        setModelAnswer(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/interview-model-answer`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: selectedQuestion.question,
                    company: generatedCompanyName,
                    user_id: currentUser?.id
                })
            });

            if (!response.ok) {
                throw new Error('모범답변 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.modelAnswer) {
                setModelAnswer(data.modelAnswer);
            } else {
                alert('모범답변을 받을 수 없습니다.');
            }
        } catch (err) {
            console.error('[모범답변 생성] 오류:', err);
            alert('모범답변 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsModelAnswerLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim()) {
            alert('답변을 입력해주세요.');
            return;
        }

        setIsFeedbackLoading(true);
        setFeedback(null);
        setRevisedAnswer(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/interview-feedback`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: selectedQuestion.question,
                    answer: answer.trim(),
                    company: generatedCompanyName,
                    user_id: currentUser?.id
                })
            });

            if (!response.ok) {
                throw new Error('피드백 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.feedback) {
                setFeedback(data.feedback);
            } else {
                alert('피드백을 받을 수 없습니다.');
            }
        } catch (err) {
            console.error('[피드백 생성] 오류:', err);
            alert('피드백 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsFeedbackLoading(false);
        }
    };

    const handleGetRevisedAnswer = async () => {
        setIsRevisedAnswerLoading(true);
        setRevisedAnswer(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/interview-revised-answer`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: selectedQuestion.question,
                    original_answer: answer.trim(),
                    feedback: feedback,
                    company: generatedCompanyName,
                    user_id: currentUser?.id
                })
            });

            if (!response.ok) {
                throw new Error('수정된 답변 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.revisedAnswer) {
                console.log('[수정된 답변] 답변 업데이트:', data.revisedAnswer.substring(0, 50) + '...');
                setRevisedAnswer(data.revisedAnswer);
                // 수정된 답변을 textarea에 자동으로 채우기
                setAnswer(data.revisedAnswer);
                // 기존 피드백 초기화 (새로운 답변이므로 다시 피드백 받아야 함)
                setFeedback(null);
                // 사용자에게 다음 단계 안내
                setTimeout(() => {
                    alert('✨ 개선된 답변이 답변란에 입력되었습니다!\n\n새로운 답변에 대해 "AI 피드백 받기" 버튼을 다시 클릭하여 개선 내용을 확인해보세요!');
                }, 500);
            } else {
                alert('수정된 답변을 받을 수 없습니다.');
            }
        } catch (err) {
            console.error('[수정된 답변 생성] 오류:', err);
            alert('수정된 답변 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsRevisedAnswerLoading(false);
        }
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

    if (error === '이력서를 먼저 작성해주세요.') {
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
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📋</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: '#333',
                        marginBottom: '15px',
                        fontWeight: '700'
                    }}>이력서를 먼저 작성해주세요</h2>
                    <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                        AI 면접 준비 서비스를 이용하려면<br/>
                        이력서 정보가 필요합니다.
                    </p>
                    <button
                        onClick={() => navigate('/resume')}
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
                        }}
                    >
                        이력서 작성하러 가기
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
                                color: '#1a202c',
                                fontSize: '0.95rem',
                                margin: '0',
                                fontWeight: '700',
                                letterSpacing: '-0.3px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                GPT가 맞춤형 면접 질문, 모범 답변, 답변에 대한 피드백 제공
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI 기능 프로세스 도식화 */}
                <div style={{
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '30px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.8rem' }}>🤖</span>
                        <span>AI 면접 준비 프로세스</span>
                    </h3>

                    {/* 4단계 플로우차트 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {/* Step 1 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #667eea',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                            }}>
                                STEP 1
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>📝</span>
                                    <span>맞춤형 면접 질문 5개 생성</span>
                                </h4>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flexWrap: 'wrap',
                                    fontSize: '0.95rem',
                                    color: '#555',
                                    lineHeight: '1.8'
                                }}>
                                    <span style={{
                                        background: '#e3f2fd',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#1976d2'
                                    }}>회사명 입력</span>
                                    <span style={{ fontSize: '1.2rem', color: '#999' }}>→</span>
                                    <span style={{
                                        background: '#f3e5f5',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#7b1fa2'
                                    }}>CommitJob의 면접 기출질문 조회 또는 catch.co.kr에서 실시간 스크래핑</span>
                                    <span style={{ fontSize: '1.2rem', color: '#999' }}>→</span>
                                    <span style={{
                                        background: '#e8f5e9',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#388e3c'
                                    }}>회원님 이력서 조회</span>
                                    <span style={{ fontSize: '1.2rem', color: '#999' }}>→</span>
                                    <span style={{
                                        background: '#fff3e0',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#f57c00'
                                    }}>GPT에게 면접 질문 생성 요청</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow down */}
                        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#667eea', margin: '-5px 0' }}>⬇️</div>

                        {/* Step 2 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #f093fb',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(240, 147, 251, 0.4)'
                            }}>
                                STEP 2
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>💡</span>
                                    <span>AI 모범 답변 제시</span>
                                </h4>
                                <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                    회원님이 선택한 면접 질문에 대해 GPT가 모범 답변을 생성합니다
                                </p>
                            </div>
                        </div>

                        {/* Arrow down */}
                        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#667eea', margin: '-5px 0' }}>⬇️</div>

                        {/* Step 3 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #4facfe',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(79, 172, 254, 0.4)'
                            }}>
                                STEP 3
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>✍️</span>
                                    <span>AI 피드백 제시</span>
                                </h4>
                                <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                    회원님이 입력한 답변을 GPT가 분석하여 상세한 피드백을 제공합니다
                                </p>
                            </div>
                        </div>

                        {/* Arrow down */}
                        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#667eea', margin: '-5px 0' }}>⬇️</div>

                        {/* Step 4 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #43e97b',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(67, 233, 123, 0.4)'
                            }}>
                                STEP 4
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                                    <span>수정된 모범 답변 제시</span>
                                </h4>
                                <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                    AI 피드백을 반영하여 GPT가 개선된 모범 답변을 제공합니다
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 회사명 입력 섹션 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
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
                                <span style={{
                                    color: '#667eea',
                                    fontWeight: '800',
                                    textShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                                }}>{generatedCompanyName}</span> 면접 질문
                            </h3>
                        </div>

                        {questions.map((question, index) => (
                            <div
                                key={question.id || index}
                                style={{
                                    background: selectedQuestion?.id === question.id ? '#e6f2ff' : '#f8f9fa',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    marginBottom: '15px',
                                    border: selectedQuestion?.id === question.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                                    transition: 'all 0.3s'
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
                                    fontSize: '0.85rem',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
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
                                    <button
                                        onClick={() => handleSelectQuestion(question)}
                                        style={{
                                            marginLeft: 'auto',
                                            background: selectedQuestion?.id === question.id
                                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                : '#667eea',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {selectedQuestion?.id === question.id ? '선택됨 ✓' : '답변하기'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 답변 입력 및 피드백 */}
                {selectedQuestion && (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        marginTop: '20px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                            borderRadius: '12px',
                            padding: '16px 18px',
                            marginBottom: '20px',
                            border: '2px solid #2196f3'
                        }}>
                            <div style={{
                                fontSize: '1.1rem',
                                color: '#0d47a1',
                                fontWeight: '700',
                                marginBottom: '8px'
                            }}>
                                선택한 질문
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                color: '#1976d2',
                                lineHeight: '1.6'
                            }}>
                                {selectedQuestion.question}
                            </div>
                        </div>

                        {/* 모범답변 받기 버튼 */}
                        <button
                            onClick={handleGetModelAnswer}
                            disabled={isModelAnswerLoading}
                            style={{
                                width: '100%',
                                background: isModelAnswerLoading
                                    ? '#cbd5e0'
                                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 20px',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: isModelAnswerLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isModelAnswerLoading ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)',
                                marginBottom: '20px'
                            }}
                            onMouseEnter={(e) => {
                                if (!isModelAnswerLoading) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isModelAnswerLoading) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                                }
                            }}
                        >
                            {isModelAnswerLoading ? '🤖 AI 모범답변 생성 중...' : '💡 AI 모범답변 받기'}
                        </button>

                        {/* 모범답변 결과 */}
                        {modelAnswer && (
                            <div style={{
                                marginBottom: '24px',
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '2px solid #f59e0b'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '1.8rem' }}>⭐</span>
                                        <h3 style={{
                                            fontSize: '1.2rem',
                                            color: '#92400e',
                                            fontWeight: '700',
                                            margin: 0
                                        }}>
                                            AI 모범답변
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(modelAnswer);
                                            alert('모범답변이 클립보드에 복사되었습니다!');
                                        }}
                                        style={{
                                            background: 'white',
                                            color: '#92400e',
                                            border: '2px solid #f59e0b',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#fef3c7';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        📋 복사하기
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    color: '#78350f',
                                    lineHeight: '1.8',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {modelAnswer}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '18px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#2d3748',
                                fontSize: '0.95rem'
                            }}>
                                답변 작성 <span style={{ color: '#e53e3e' }}>*</span>
                            </label>
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="면접 답변을 작성해주세요. 구체적이고 상세하게 작성할수록 더 정확한 피드백을 받을 수 있습니다."
                                style={{
                                    width: '100%',
                                    minHeight: '200px',
                                    padding: '14px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box',
                                    resize: 'vertical',
                                    lineHeight: '1.6',
                                    fontFamily: 'inherit'
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
                            onClick={handleSubmitAnswer}
                            disabled={isFeedbackLoading || !answer.trim()}
                            style={{
                                width: '100%',
                                background: isFeedbackLoading || !answer.trim()
                                    ? '#cbd5e0'
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 24px',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: isFeedbackLoading || !answer.trim() ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isFeedbackLoading || !answer.trim() ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isFeedbackLoading && answer.trim()) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isFeedbackLoading && answer.trim()) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }
                            }}
                        >
                            {isFeedbackLoading ? 'AI 피드백 생성 중...' : 'AI 피드백 받기'}
                        </button>

                        {/* 피드백 결과 */}
                        {feedback && (
                            <div style={{
                                marginTop: '24px',
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                borderRadius: '12px',
                                padding: '20px',
                                border: '2px solid #10b981'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    marginBottom: '16px'
                                }}>
                                    <span style={{ fontSize: '1.8rem' }}>🎯</span>
                                    <h3 style={{
                                        fontSize: '1.2rem',
                                        color: '#065f46',
                                        fontWeight: '700',
                                        margin: 0
                                    }}>
                                        AI 피드백
                                    </h3>
                                </div>
                                <div style={{
                                    fontSize: '1rem',
                                    color: '#047857',
                                    lineHeight: '1.8',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {feedback}
                                </div>
                            </div>
                        )}

                        {/* 피드백을 받은 후 수정된 답변 받기 버튼 */}
                        {feedback && !revisedAnswer && (
                            <button
                                onClick={handleGetRevisedAnswer}
                                disabled={isRevisedAnswerLoading}
                                style={{
                                    width: '100%',
                                    marginTop: '20px',
                                    background: isRevisedAnswerLoading
                                        ? '#cbd5e0'
                                        : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    cursor: isRevisedAnswerLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isRevisedAnswerLoading ? 'none' : '0 4px 12px rgba(6, 182, 212, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isRevisedAnswerLoading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(6, 182, 212, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isRevisedAnswerLoading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
                                    }
                                }}
                            >
                                {isRevisedAnswerLoading ? '✨ AI 피드백 반영 모범답변 생성 중...' : '✨ AI 피드백 반영한 모범답변 받기'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
