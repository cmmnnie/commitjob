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

            // 2. AI 추천 채용공고 가져오기
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
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🤖</div>
                        <h1 style={{
                            fontSize: '2rem',
                            color: '#667eea',
                            marginBottom: '10px',
                            fontWeight: '700'
                        }}>AI 맞춤 채용공고</h1>
                        <p style={{ color: '#666', fontSize: '1rem' }}>
                            {maskName(currentUser?.name)}님의 프로필을 기반으로 추천된 채용공고입니다
                        </p>
                    </div>

                    {allJobs.length > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, #e6fffa 0%, #e0e7ff 100%)',
                            borderRadius: '12px',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                color: '#333',
                                marginBottom: '5px'
                            }}>
                                총 {allJobs.length}개의 맞춤 채용공고
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                GPT-5-mini가 분석한 매칭 이유와 실제 기업 데이터를 확인해보세요
                            </p>
                        </div>
                    )}
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
