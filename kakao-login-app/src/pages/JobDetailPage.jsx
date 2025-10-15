import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export default function JobDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const job = location.state?.job;

    const [companyInfo, setCompanyInfo] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (job?.company) {
            fetchCompanyData(job.company);
        }
    }, [job]);

    const fetchCompanyData = async (companyName) => {
        try {
            setLoading(true);
            console.log('[JobDetail] Fetching company data for:', companyName);

            // 회사 정보 조회
            console.log('[JobDetail] Fetching company info...');
            const companyRes = await fetch(`${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}`);
            const companyData = await companyRes.json();
            console.log('[JobDetail] Company data:', companyData);
            if (companyData.success && companyData.company) {
                setCompanyInfo(companyData.company);
                console.log('[JobDetail] Company info set:', companyData.company);
            } else {
                console.log('[JobDetail] No company info found');
            }

            // 회사 리뷰 조회
            console.log('[JobDetail] Fetching reviews...');
            const reviewsRes = await fetch(`${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}/reviews?limit=5`);
            const reviewsData = await reviewsRes.json();
            console.log('[JobDetail] Reviews data:', reviewsData);
            if (reviewsData.success && reviewsData.reviews) {
                setReviews(reviewsData.reviews);
                console.log('[JobDetail] Reviews set:', reviewsData.reviews.length);
            } else {
                console.log('[JobDetail] No reviews found');
            }

            // 면접 기출문제 조회
            console.log('[JobDetail] Fetching interview questions...');
            console.log('[JobDetail] Company name:', companyName);
            console.log('[JobDetail] API URL:', `${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}/interview-questions?limit=5`);
            const questionsRes = await fetch(`${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}/interview-questions?limit=5`);
            const questionsData = await questionsRes.json();
            console.log('[JobDetail] Questions response:', JSON.stringify(questionsData, null, 2));
            if (questionsData.success && questionsData.questions) {
                setInterviewQuestions(questionsData.questions);
                console.log('[JobDetail] Questions set:', questionsData.questions.length);
            } else {
                console.log('[JobDetail] No interview questions found or error occurred');
                console.log('[JobDetail] Response success:', questionsData.success);
                console.log('[JobDetail] Questions array:', questionsData.questions);
            }
        } catch (error) {
            console.error('[JobDetail] Error fetching company data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!job) {
        return (
            <div style={{
                minHeight: 'calc(100vh - 60px)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '40px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '1.2rem', color: '#666' }}>채용공고를 찾을 수 없습니다.</p>
                    <button
                        onClick={() => navigate('/jobs')}
                        style={{
                            marginTop: '20px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '24px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>
                        채용공고로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: 'calc(100vh - 60px)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 20px',
            paddingBottom: '100px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'transparent',
                            border: '2px solid #667eea',
                            color: '#667eea',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#667eea';
                            e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#667eea';
                        }}>
                        ← 뒤로가기
                    </button>

                    {/* 등록/마감일시 */}
                    {job.registration_info && job.registration_info.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '20px',
                            padding: '12px',
                            background: '#f5f5f5',
                            borderRadius: '8px'
                        }}>
                            {job.registration_info.map((info, index) => (
                                <span key={index} style={{
                                    color: info.includes('D-') ? '#d32f2f' : '#666',
                                    fontSize: '0.95rem',
                                    fontWeight: info.includes('D-') ? '700' : '500'
                                }}>
                                    {info}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* 제목 */}
                    <h1 style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '16px',
                        lineHeight: '1.4'
                    }}>{job.title}</h1>

                    {/* 회사명 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🏢</span>
                        <h2 style={{
                            fontSize: '1.3rem',
                            fontWeight: '600',
                            color: '#555'
                        }}>{job.company}</h2>
                    </div>

                    {/* 카테고리 */}
                    <div style={{ marginBottom: '20px' }}>
                        <span style={{
                            background: job.category === 'BIGDATA_AI' ? '#e3f2fd' : '#f3e5f5',
                            color: job.category === 'BIGDATA_AI' ? '#1976d2' : '#7b1fa2',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                        }}>
                            {job.category === 'BIGDATA_AI' ? '빅데이터/AI' : 'IT개발'}
                        </span>
                    </div>
                </div>

                {/* 상세 정보 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    {/* 직무 정보 */}
                    {job.job_info && job.job_info.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{
                                fontSize: '1.2rem',
                                fontWeight: '700',
                                color: '#333',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid #667eea'
                            }}>
                                📋 직무 정보
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                {job.job_info.map((info, index) => (
                                    <span key={index} style={{
                                        background: '#f5f5f5',
                                        color: '#333',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        fontWeight: '500'
                                    }}>
                                        {info}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 채용 조건 */}
                    {job.conditions && job.conditions.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{
                                fontSize: '1.2rem',
                                fontWeight: '700',
                                color: '#333',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid #667eea'
                            }}>
                                ✅ 채용 조건
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                {job.conditions.map((condition, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '1rem',
                                        color: '#555'
                                    }}>
                                        <span style={{ color: '#667eea', fontWeight: '700' }}>•</span>
                                        {condition}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 회사명 검색키 */}
                    {job.company_search_key && (
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{
                                fontSize: '1.2rem',
                                fontWeight: '700',
                                color: '#333',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid #667eea'
                            }}>
                                🔍 회사명 검색키
                            </h3>
                            <p style={{
                                fontSize: '1rem',
                                color: '#555',
                                background: '#f5f5f5',
                                padding: '12px 16px',
                                borderRadius: '8px'
                            }}>
                                {job.company_search_key}
                            </p>
                        </div>
                    )}

                    {/* 원본 공고 링크 */}
                    {job.url && (
                        <div style={{ marginTop: '30px', textAlign: 'center' }}>
                            <button
                                onClick={() => window.open(job.url, '_blank')}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '24px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                }}>
                                원본 채용공고 보기 →
                            </button>
                        </div>
                    )}
                </div>

                {/* 회사 정보 */}
                {companyInfo && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '35px',
                        marginTop: '20px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(102, 126, 234, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '28px',
                            paddingBottom: '16px',
                            borderBottom: '3px solid',
                            borderImage: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%) 1'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>🏢</div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0
                            }}>
                                회사 정보
                            </h3>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px'
                        }}>
                            {companyInfo.industry && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>🏭 산업</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.industry}</div>
                                </div>
                            )}
                            {(companyInfo.company_type || companyInfo.company_form) && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>🏛️ 기업형태</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.company_type || companyInfo.company_form}</div>
                                </div>
                            )}
                            {companyInfo.employee_count && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>👥 직원 수</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.employee_count}</div>
                                </div>
                            )}
                            {companyInfo.establishment_date && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>📅 설립일</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.establishment_date}</div>
                                </div>
                            )}
                            {companyInfo.ceo && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>👔 대표이사</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.ceo}</div>
                                </div>
                            )}
                            {companyInfo.location && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                    gridColumn: '1 / -1'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>📍 주소</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.location}</div>
                                </div>
                            )}
                            {companyInfo.revenue && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #2196f3',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#1565c0', marginBottom: '6px', fontWeight: '600' }}>💰 매출액</div>
                                    <div style={{ fontSize: '1.05rem', color: '#0d47a1', fontWeight: '700' }}>{companyInfo.revenue}</div>
                                </div>
                            )}
                            {companyInfo.credit_rating && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #ff9800',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#e65100', marginBottom: '6px', fontWeight: '600' }}>⭐ 신용등급</div>
                                    <div style={{ fontSize: '1.05rem', color: '#e65100', fontWeight: '700' }}>{companyInfo.credit_rating}</div>
                                </div>
                            )}
                            {companyInfo.starting_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #4caf50',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💵 초봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#1b5e20', fontWeight: '700' }}>{companyInfo.starting_salary}</div>
                                </div>
                            )}
                            {companyInfo.average_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #4caf50',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💵 평균연봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#1b5e20', fontWeight: '700' }}>{companyInfo.average_salary}</div>
                                </div>
                            )}
                            {companyInfo.industry_average_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #e91e63',
                                    transition: 'all 0.2s',
                                    gridColumn: '1 / -1'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 30, 99, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#ad1457', marginBottom: '6px', fontWeight: '600' }}>📊 업계 평균연봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#880e4f', fontWeight: '700' }}>{companyInfo.industry_average_salary}</div>
                                </div>
                            )}
                        </div>
                        {(companyInfo.tags && companyInfo.tags.length > 0) && (
                            <div style={{ marginTop: '24px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.9rem', color: '#667eea', marginBottom: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🏷️</span> 회사 태그
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {companyInfo.tags.map((tag, idx) => (
                                        <span key={idx} style={{
                                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                            color: '#1565c0',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            border: '1px solid #2196f3',
                                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(companyInfo.recommendation_keywords && companyInfo.recommendation_keywords.length > 0) && (
                            <div style={{ marginTop: '16px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.9rem', color: '#7b1fa2', marginBottom: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>✨</span> 추천 키워드
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {companyInfo.recommendation_keywords.map((keyword, idx) => (
                                        <span key={idx} style={{
                                            background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                            color: '#6a1b9a',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            border: '1px solid #9c27b0',
                                            boxShadow: '0 2px 4px rgba(156, 39, 176, 0.2)'
                                        }}>
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 회사 리뷰 */}
                {reviews.length > 0 && (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        marginTop: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{
                            fontSize: '1.3rem',
                            fontWeight: '700',
                            color: '#333',
                            marginBottom: '20px',
                            paddingBottom: '12px',
                            borderBottom: '2px solid #667eea',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            ⭐ 회사 리뷰 ({reviews.length}건)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {reviews.map((review, index) => (
                                <div key={index} style={{
                                    background: '#f8f9fa',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #667eea'
                                }}>
                                    {review.rating && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#667eea' }}>
                                                {'⭐'.repeat(Math.round(parseFloat(review.rating)))}
                                            </span>
                                            <span style={{ color: '#666', fontSize: '0.9rem' }}>{review.rating}점</span>
                                        </div>
                                    )}
                                    {review.position && (
                                        <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '8px' }}>
                                            {review.position}
                                        </div>
                                    )}
                                    {review.pros && (
                                        <div style={{ marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '600', color: '#28a745' }}>장점: </span>
                                            <span style={{ color: '#555' }}>{review.pros}</span>
                                        </div>
                                    )}
                                    {review.cons && (
                                        <div>
                                            <span style={{ fontWeight: '600', color: '#dc3545' }}>단점: </span>
                                            <span style={{ color: '#555' }}>{review.cons}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 면접 기출문제 */}
                {!loading && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '35px',
                        marginTop: '20px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(118, 75, 162, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '28px',
                            paddingBottom: '16px',
                            borderBottom: '3px solid',
                            borderImage: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%) 1'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>💬</div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0
                            }}>
                                면접 기출문제
                            </h3>
                            <span style={{
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                marginLeft: 'auto'
                            }}>
                                {interviewQuestions.length}건
                            </span>
                        </div>
                        {interviewQuestions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {interviewQuestions.map((item, index) => (
                                    <div key={index} style={{
                                        background: 'white',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                        border: '2px solid transparent',
                                        transition: 'all 0.3s',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(118, 75, 162, 0.2)';
                                        e.currentTarget.style.borderColor = '#764ba2';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                                        e.currentTarget.style.borderColor = 'transparent';
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '0',
                                            left: '0',
                                            width: '5px',
                                            height: '100%',
                                            background: 'linear-gradient(180deg, #764ba2 0%, #667eea 100%)'
                                        }}></div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            marginBottom: '16px',
                                            marginLeft: '10px'
                                        }}>
                                            <div style={{
                                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                                color: 'white',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem',
                                                fontWeight: '800',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>
                                            {item.position && (
                                                <span style={{
                                                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                                    color: '#6a1b9a',
                                                    padding: '6px 14px',
                                                    borderRadius: '16px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700',
                                                    border: '1px solid #9c27b0'
                                                }}>
                                                    📌 {item.position}
                                                </span>
                                            )}
                                        </div>
                                        {item.question && (
                                            <div style={{
                                                fontSize: '1.1rem',
                                                color: '#333',
                                                lineHeight: '1.8',
                                                marginBottom: '16px',
                                                marginLeft: '10px',
                                                fontWeight: '500',
                                                padding: '16px',
                                                background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                                                borderRadius: '12px',
                                                borderLeft: '4px solid #764ba2'
                                            }}>
                                                <span style={{ fontWeight: '800', color: '#764ba2', fontSize: '1.2rem' }}>Q. </span>
                                                {item.question}
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'center',
                                            marginLeft: '10px'
                                        }}>
                                            {item.difficulty && (
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: item.difficulty === '어려움'
                                                        ? 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)'
                                                        : item.difficulty === '보통'
                                                        ? 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)'
                                                        : 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                                                    color: 'white',
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '700',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                }}>
                                                    <span>{item.difficulty === '어려움' ? '🔥' : item.difficulty === '보통' ? '⚡' : '✨'}</span>
                                                    난이도: {item.difficulty}
                                                </div>
                                            )}
                                            {item.period && (
                                                <span style={{
                                                    background: '#e3f2fd',
                                                    color: '#1976d2',
                                                    padding: '6px 12px',
                                                    borderRadius: '16px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    📅 {item.period}
                                                </span>
                                            )}
                                            {item.experience && (
                                                <span style={{
                                                    background: '#fff3e0',
                                                    color: '#f57c00',
                                                    padding: '6px 12px',
                                                    borderRadius: '16px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    👤 {item.experience}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                background: 'white',
                                borderRadius: '16px',
                                border: '2px dashed #ddd'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💭</div>
                                <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                                    아직 등록된 면접 기출문제가 없습니다
                                </p>
                                <p style={{ fontSize: '0.95rem', color: '#999' }}>
                                    {job.company}의 면접 질문이 곧 업데이트될 예정입니다
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
