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
                            🏢 회사 정보
                        </h3>
                        <div style={{
                            display: 'grid',
                            gap: '12px'
                        }}>
                            {companyInfo.industry && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>산업:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.industry}</span>
                                </div>
                            )}
                            {companyInfo.company_type && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>기업형태:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.company_type}</span>
                                </div>
                            )}
                            {companyInfo.company_form && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>기업형태:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.company_form}</span>
                                </div>
                            )}
                            {companyInfo.employee_count && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>직원 수:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.employee_count}</span>
                                </div>
                            )}
                            {companyInfo.establishment_date && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>설립일:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.establishment_date}</span>
                                </div>
                            )}
                            {companyInfo.ceo && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>대표이사:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.ceo}</span>
                                </div>
                            )}
                            {companyInfo.location && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>주소:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.location}</span>
                                </div>
                            )}
                            {companyInfo.revenue && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>매출액:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.revenue}</span>
                                </div>
                            )}
                            {companyInfo.credit_rating && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>신용등급:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.credit_rating}</span>
                                </div>
                            )}
                            {companyInfo.starting_salary && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>초봉:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.starting_salary}</span>
                                </div>
                            )}
                            {companyInfo.average_salary && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>평균연봉:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.average_salary}</span>
                                </div>
                            )}
                            {companyInfo.industry_average_salary && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>업계 평균연봉:</span>
                                    <span style={{ color: '#555' }}>{companyInfo.industry_average_salary}</span>
                                </div>
                            )}
                            {companyInfo.tags && companyInfo.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>태그:</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {companyInfo.tags.map((tag, idx) => (
                                            <span key={idx} style={{
                                                background: '#e3f2fd',
                                                color: '#1976d2',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '500'
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {companyInfo.recommendation_keywords && companyInfo.recommendation_keywords.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: '600', color: '#667eea', minWidth: '120px' }}>추천 키워드:</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {companyInfo.recommendation_keywords.map((keyword, idx) => (
                                            <span key={idx} style={{
                                                background: '#f3e5f5',
                                                color: '#7b1fa2',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '500'
                                            }}>
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
                            💬 면접 기출문제 ({interviewQuestions.length}건)
                        </h3>
                        {interviewQuestions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {interviewQuestions.map((item, index) => (
                                    <div key={index} style={{
                                        background: '#f8f9fa',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        borderLeft: '4px solid #764ba2'
                                    }}>
                                        {item.position && (
                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: '#888',
                                                marginBottom: '8px',
                                                fontWeight: '600'
                                            }}>
                                                📌 {item.position}
                                            </div>
                                        )}
                                        {item.question && (
                                            <div style={{
                                                fontSize: '1rem',
                                                color: '#333',
                                                lineHeight: '1.6',
                                                marginBottom: '8px'
                                            }}>
                                                <span style={{ fontWeight: '600', color: '#764ba2' }}>Q. </span>
                                                {item.question}
                                            </div>
                                        )}
                                        {item.difficulty && (
                                            <div style={{
                                                display: 'inline-block',
                                                background: item.difficulty === '어려움' ? '#dc3545' :
                                                           item.difficulty === '보통' ? '#ffc107' : '#28a745',
                                                color: 'white',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600'
                                            }}>
                                                난이도: {item.difficulty}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#999'
                            }}>
                                <p style={{ fontSize: '1rem' }}>아직 등록된 면접 기출문제가 없습니다.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                    회사명: {job.company}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
