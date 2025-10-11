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
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginLeft: '10px'
                    }}>
                        {job.match_score}% 매칭
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
                    background: '#e6fffa',
                    color: '#234e52',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '12px',
                    fontSize: '0.85rem',
                    lineHeight: '1.5'
                }}>
                    <strong>🤖 AI 매칭 이유:</strong><br/>
                    {job.match_reasons.join(', ')}
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
                                    GPT-5-mini가 추천하는 맞춤형 채용 공고
                                </p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    backdropFilter: 'blur(10px)',
                                    color: 'white',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s',
                                    opacity: isLoading ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                    }
                                }}>
                                <span style={{
                                    fontSize: '1.2rem',
                                    display: 'inline-block',
                                    animation: isLoading ? 'spin 1s linear infinite' : 'none'
                                }}>🔄</span>
                                <span>{isLoading ? '로딩 중' : '새로고침'}</span>
                            </button>
                        </div>

                        {allJobs.length > 0 && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '16px',
                                padding: '20px 24px',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        fontSize: '1.8rem',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                    }}>✨</div>
                                    <p style={{
                                        color: 'white',
                                        fontSize: '1.05rem',
                                        margin: 0,
                                        fontWeight: '800',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        lineHeight: '1.6',
                                        letterSpacing: '-0.3px'
                                    }}>
                                        GPT-5-mini가 회원님 이력서와 CommitJob 채용공고를 매칭하여 매칭률 높은 {allJobs.length}개 채용공고를 추천
                                    </p>
                                </div>
                            </div>
                        )}
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
                                            fontSize: '0.9rem',
                                            color: '#999',
                                            fontWeight: '400',
                                            marginLeft: '8px'
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
