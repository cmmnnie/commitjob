import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export default function JobsPage() {
    const navigate = useNavigate();
    const [bigdataJobs, setBigdataJobs] = useState([]);
    const [itJobs, setItJobs] = useState([]);
    const [showAllBigdata, setShowAllBigdata] = useState(false);
    const [showAllIT, setShowAllIT] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);

            // BIGDATA_AI 카테고리 조회
            const bigdataResponse = await axios.get(
                `${API_BASE_URL}/api/jobs/BIGDATA_AI`,
                { withCredentials: true }
            );

            // IT 카테고리 조회
            const itResponse = await axios.get(
                `${API_BASE_URL}/api/jobs/IT`,
                { withCredentials: true }
            );

            if (bigdataResponse.data.success) {
                setBigdataJobs(bigdataResponse.data.jobs);
            }

            if (itResponse.data.success) {
                setItJobs(itResponse.data.jobs);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const JobCard = ({ job }) => (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '12px',
            border: '1px solid #e0e0e0',
            transition: 'all 0.2s',
            cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
        }}
        onClick={() => window.open(job.url, '_blank')}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
            }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                    }}>{job.title}</h3>
                    <p style={{
                        fontSize: '0.95rem',
                        color: '#666',
                        fontWeight: '500',
                        marginBottom: '8px'
                    }}>
                        <span style={{ fontSize: '1.1rem', marginRight: '6px' }}>🏢</span>
                        {job.company}
                    </p>
                </div>
                <span style={{
                    background: job.category === 'BIGDATA_AI' ? '#e3f2fd' : '#f3e5f5',
                    color: job.category === 'BIGDATA_AI' ? '#1976d2' : '#7b1fa2',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    flexShrink: 0,
                    marginLeft: '12px'
                }}>
                    {job.category === 'BIGDATA_AI' ? '빅데이터/AI' : 'IT개발'}
                </span>
            </div>

            {/* 직무 정보 */}
            {job.job_info && job.job_info.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px'
                    }}>
                        {job.job_info.slice(0, 3).map((info, index) => (
                            <span key={index} style={{
                                background: '#f5f5f5',
                                color: '#555',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.85rem'
                            }}>
                                {info}
                            </span>
                        ))}
                        {job.job_info.length > 3 && (
                            <span style={{
                                color: '#999',
                                fontSize: '0.85rem',
                                padding: '4px 10px'
                            }}>
                                +{job.job_info.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* 조건 */}
            {job.conditions && job.conditions.length > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px'
                }}>
                    {job.conditions.map((condition, index) => (
                        <span key={index} style={{
                            color: '#666',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span style={{ color: '#999' }}>•</span>
                            {condition}
                        </span>
                    ))}
                </div>
            )}

            {/* 등록 정보 */}
            {job.registration_info && job.registration_info.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f0f0f0'
                }}>
                    {job.registration_info.map((info, index) => (
                        <span key={index} style={{
                            color: info.includes('D-') ? '#d32f2f' : '#999',
                            fontSize: '0.85rem',
                            fontWeight: info.includes('D-') ? '600' : '400'
                        }}>
                            {info}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );

    const CategorySection = ({ title, jobs, showAll, setShowAll, color }) => {
        const displayJobs = showAll ? jobs : jobs.slice(0, 5);

        return (
            <div style={{ marginBottom: '40px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '1.8rem' }}>{title === 'BIGDATA/AI' ? '📊' : '💻'}</span>
                        {title}
                        <span style={{
                            fontSize: '0.9rem',
                            color: '#999',
                            fontWeight: '400',
                            marginLeft: '8px'
                        }}>
                            ({jobs.length}건)
                        </span>
                    </h2>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        style={{
                            background: color,
                            color: 'white',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}>
                        {showAll ? '접기' : '전체보기'}
                    </button>
                </div>

                <div style={{
                    maxHeight: showAll ? '600px' : 'none',
                    overflowY: showAll ? 'auto' : 'visible',
                    paddingRight: showAll ? '8px' : '0'
                }}>
                    {displayJobs.length > 0 ? (
                        displayJobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#999'
                        }}>
                            채용공고가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        fontSize: '1.2rem',
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        채용공고를 불러오는 중...
                    </div>
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
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '30px',
                    marginBottom: '30px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#333',
                                marginBottom: '8px'
                            }}>
                                채용공고
                            </h1>
                            <p style={{
                                fontSize: '1rem',
                                color: '#666'
                            }}>
                                최신 IT 및 빅데이터/AI 분야 채용정보를 확인하세요
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/main')}
                            style={{
                                background: 'transparent',
                                border: '2px solid #667eea',
                                color: '#667eea',
                                padding: '10px 24px',
                                borderRadius: '24px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
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
                            메인으로
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '40px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    {/* BIGDATA_AI 섹션 */}
                    <CategorySection
                        title="BIGDATA/AI"
                        jobs={bigdataJobs}
                        showAll={showAllBigdata}
                        setShowAll={setShowAllBigdata}
                        color="#1976d2"
                    />

                    {/* IT 섹션 */}
                    <CategorySection
                        title="IT 개발"
                        jobs={itJobs}
                        showAll={showAllIT}
                        setShowAll={setShowAllIT}
                        color="#7b1fa2"
                    />
                </div>
            </div>
        </div>
    );
}
