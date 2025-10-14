import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function AIRecommendationPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState(null);
    const [error, setError] = useState(null);

    // 이름 마스킹 함수
    const maskName = (name) => {
        if (!name || name.length === 0) return '사용자';
        if (name.length === 1) return name;
        if (name.length === 2) return name[0] + '*';
        // 3글자 이상: 첫 글자 + 중간 * + 마지막 글자
        return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    };

    useEffect(() => {
        checkLoginAndFetchRecommendations();
    }, []);

    const checkLoginAndFetchRecommendations = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // 1. 로그인 상태 확인
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
            if (!userData.user) {
                setError('사용자 정보를 불러올 수 없습니다.');
                setIsLoading(false);
                return;
            }

            setCurrentUser(userData.user);

            // 2. 캐시된 추천 결과 확인
            const cacheKey = `ai_recommendations_${userData.user.id}`;
            const cachedRecommendations = sessionStorage.getItem(cacheKey);

            if (cachedRecommendations) {
                // 캐시된 데이터가 있으면 사용
                console.log('[AI 추천] 캐시된 추천 결과 사용');
                setRecommendations(JSON.parse(cachedRecommendations));
                setIsLoading(false);
                return;
            }

            // 3. AI 추천 채용공고 가져오기 (캐시 없을 때만)
            console.log('[AI 추천] 새로운 추천 요청');
            const recommendResponse = await fetch(
                `${CONFIG.BACKEND_URL}/api/main-recommendations?user_id=${userData.user.id}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!recommendResponse.ok) {
                throw new Error('AI 추천을 가져오는데 실패했습니다.');
            }

            const recommendData = await recommendResponse.json();

            // 4. 추천 결과를 sessionStorage에 저장
            sessionStorage.setItem(cacheKey, JSON.stringify(recommendData));
            setRecommendations(recommendData);

        } catch (err) {
            console.error('[AI 추천] 오류:', err);
            setError(err.message || '추천을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        navigate('/?view=login');
    };

    const handleRefresh = async () => {
        if (!currentUser) return;

        // 캐시 삭제
        const cacheKey = `ai_recommendations_${currentUser.id}`;
        sessionStorage.removeItem(cacheKey);

        // 다시 추천 받기
        await checkLoginAndFetchRecommendations();
    };

    const JobCard = ({ job }) => (
        <div
            style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                padding: '20px',
                marginBottom: '15px',
                transition: 'all 0.3s',
                cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => navigate(`/jobs/detail/${job.id}`, { state: { job } })}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '12px'
            }}>
                <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                    flex: 1
                }}>{job.title}</h3>
                {job.match_score && (
                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '16px',
                        fontSize: '1rem',
                        fontWeight: '800',
                        marginLeft: '10px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        letterSpacing: '-0.3px'
                    }}>
                        AI 매칭률 {job.match_score}%
                    </div>
                )}
            </div>

            <p style={{
                fontSize: '0.95rem',
                color: '#667eea',
                fontWeight: '600',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <span style={{ fontSize: '1rem' }}>🏢</span>
                {job.company}
            </p>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px',
                fontSize: '0.85rem',
                color: '#666'
            }}>
                {job.location && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📍 {Array.isArray(job.location) ? job.location.join(', ') : job.location}
                    </span>
                )}
                {job.experience && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💼 {job.experience}
                    </span>
                )}
                {job.salary && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💰 {job.salary}
                    </span>
                )}
            </div>

            {job.skills && job.skills.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '12px'
                }}>
                    {job.skills.map((skill, idx) => (
                        <span key={idx} style={{
                            background: '#edf2f7',
                            color: '#2d3748',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem'
                        }}>
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            {job.match_reasons && job.match_reasons.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    color: '#0c4a6e',
                    padding: '24px',
                    borderRadius: '16px',
                    marginTop: '20px',
                    border: '3px solid #0ea5e9',
                    boxShadow: '0 8px 24px rgba(14, 165, 233, 0.25)'
                }}>
                    <div style={{
                        fontWeight: '800',
                        fontSize: '1.15rem',
                        marginBottom: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #38bdf8'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <span style={{ color: '#0369a1' }}>GPT AI 매칭 분석</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {job.match_reasons.map((reason, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '14px 16px',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                border: '1px solid #bae6fd',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.15)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}>
                                <div style={{
                                    minWidth: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)'
                                }}>
                                    {idx + 1}
                                </div>
                                <span style={{
                                    flex: 1,
                                    fontSize: '1rem',
                                    lineHeight: '1.7',
                                    fontWeight: '600',
                                    color: '#0c4a6e',
                                    letterSpacing: '-0.2px'
                                }}>{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (isLoading) {
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
                    <p style={{ color: '#666', fontSize: '1rem' }}>AI가 맞춤 채용공고를 분석하고 있습니다...</p>
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
                        AI 맞춤 채용공고 추천 서비스를 이용하려면<br/>
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
                        }}
                    >
                        로그인하러 가기
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
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
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: '#d32f2f',
                        marginBottom: '15px',
                        fontWeight: '700'
                    }}>오류가 발생했습니다</h2>
                    <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
                    <button
                        onClick={checkLoginAndFetchRecommendations}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    // 추천 결과 표시
    const allJobs = [];
    if (recommendations) {
        Object.keys(recommendations).forEach(category => {
            if (Array.isArray(recommendations[category])) {
                allJobs.push(...recommendations[category]);
            }
        });
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
                {/* 헤더 섹션 */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '24px',
                    padding: '40px 30px',
                    marginBottom: '24px',
                    boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* 배경 장식 요소 */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        filter: 'blur(40px)'
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-30px',
                        left: '-30px',
                        width: '150px',
                        height: '150px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                        filter: 'blur(30px)'
                    }}></div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        fontSize: '2.5rem',
                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                    }}>🤖</div>
                                    <h1 style={{
                                        fontSize: '2rem',
                                        color: 'white',
                                        margin: 0,
                                        fontWeight: '800',
                                        letterSpacing: '-0.5px'
                                    }}>AI 채용공고 추천</h1>
                                </div>
                                <p style={{
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    margin: 0,
                                    fontWeight: '700',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    letterSpacing: '-0.3px'
                                }}>
                                    GPT가 추천하는 맞춤형 채용 공고
                                </p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                style={{
                                    background: isLoading ? '#cbd5e0' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                    color: 'white',
                                    border: isLoading ? 'none' : '3px solid white',
                                    padding: '14px 28px',
                                    borderRadius: '20px',
                                    fontSize: '1rem',
                                    fontWeight: '800',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s',
                                    opacity: isLoading ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    boxShadow: isLoading ? 'none' : '0 6px 20px rgba(240, 147, 251, 0.4)',
                                    letterSpacing: '-0.3px'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(240, 147, 251, 0.5)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(240, 147, 251, 0.4)';
                                    }
                                }}>
                                <span style={{
                                    fontSize: '1.3rem',
                                    display: 'inline-block',
                                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                                }}>🔄</span>
                                <span>{isLoading ? '로딩 중...' : 'AI추천 새로고침'}</span>
                            </button>
                        </div>

                        {/* AI 기능 프로세스 도식화 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            borderRadius: '20px',
                            padding: '30px',
                            marginBottom: '0px',
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
                                <span>AI 채용공고 추천 프로세스</span>
                            </h3>

                            {/* 3단계 플로우차트 */}
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
                                            marginBottom: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ fontSize: '1.5rem' }}>📋</span>
                                            <span>회원님 이력서 조회</span>
                                        </h4>
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
                                            <span style={{ fontSize: '1.5rem' }}>💼</span>
                                            <span>CommitJob 최근 채용공고 조회</span>
                                        </h4>
                                        <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                            CommitJob에 등록된 최신 빅데이터/AI, IT개발 채용공고를 조회합니다
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
                                            <span style={{ fontSize: '1.5rem' }}>🎯</span>
                                            <span>AI 매칭 및 추천</span>
                                        </h4>
                                        <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                            GPT가 이력서와 채용공고의 매칭률을 분석하여 가장 적합한 공고를 추천합니다
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>

                {/* 추천 공고 목록 */}
                {allJobs.length === 0 ? (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '40px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📭</div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            color: '#333',
                            marginBottom: '15px',
                            fontWeight: '700'
                        }}>추천 공고가 없습니다</h2>
                        <p style={{ color: '#666', lineHeight: '1.6' }}>
                            프로필을 업데이트하시면<br/>
                            더 정확한 추천을 받으실 수 있습니다.
                        </p>
                    </div>
                ) : (
                    <>
                        {Object.keys(recommendations).map(category => {
                            const jobs = recommendations[category];
                            if (!Array.isArray(jobs) || jobs.length === 0) return null;

                            return (
                                <div key={category} style={{
                                    background: 'white',
                                    borderRadius: '20px',
                                    padding: '30px',
                                    marginBottom: '20px',
                                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                                }}>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: '#333',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        borderBottom: '2px solid #e2e8f0',
                                        paddingBottom: '15px'
                                    }}>
                                        {category === 'IT' ? '💻' : '📊'} {category} 분야
                                        <span style={{
                                            fontSize: '1.1rem',
                                            color: '#333',
                                            fontWeight: '700',
                                            marginLeft: '12px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            padding: '4px 0'
                                        }}>
                                            ({jobs.length}개 공고)
                                        </span>
                                    </h2>

                                    {jobs.map((job, index) => (
                                        <JobCard key={job.id || index} job={job} />
                                    ))}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
