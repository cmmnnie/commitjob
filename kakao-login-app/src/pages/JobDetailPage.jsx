import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

export default function JobDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const job = location.state?.job;

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
            </div>
        </div>
    );
}
