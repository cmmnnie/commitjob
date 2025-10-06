import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app');

export default function AIJobsPage() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [displayedJobs, setDisplayedJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [offset, setOffset] = useState(0);
    const ITEMS_PER_PAGE = 2;

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = document.documentElement.scrollTop;
            const clientHeight = document.documentElement.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 100 && !loadingMore) {
                loadMoreJobs();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [offset, jobs, loadingMore]);

    const isExpired = (job) => {
        if (!job.registration_info || job.registration_info.length === 0) return false;

        const dateStr = job.registration_info[0];
        const match = dateStr.match(/~(\d+)\.(\d+)/);
        if (!match) return false;

        const [, month, day] = match;
        const currentYear = new Date().getFullYear();
        const deadlineDate = new Date(currentYear, parseInt(month) - 1, parseInt(day), 23, 59, 59);

        return new Date() > deadlineDate;
    };

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('[AI-JOBS] Fetching from:', `${API_BASE_URL}/api/jobs/BIGDATA_AI`);

            const response = await axios.get(
                `${API_BASE_URL}/api/jobs/BIGDATA_AI`,
                {
                    withCredentials: true,
                    timeout: 10000  // 10초 타임아웃
                }
            );

            console.log('[AI-JOBS] Response:', response.data);

            if (response.data.success) {
                // 만료되지 않은 공고만 필터링하고 최신순 정렬
                const activeJobs = response.data.jobs
                    .filter(job => !isExpired(job))
                    .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));

                setJobs(activeJobs);
                setDisplayedJobs(activeJobs.slice(0, ITEMS_PER_PAGE));
                setOffset(ITEMS_PER_PAGE);
            }
        } catch (error) {
            console.error('[AI-JOBS] Failed to fetch AI jobs:', error);
            setError(error.message || 'AI 채용공고를 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    const loadMoreJobs = () => {
        if (offset >= jobs.length) return;

        setLoadingMore(true);
        setTimeout(() => {
            const newJobs = jobs.slice(offset, offset + ITEMS_PER_PAGE);
            setDisplayedJobs(prev => [...prev, ...newJobs]);
            setOffset(prev => prev + ITEMS_PER_PAGE);
            setLoadingMore(false);
        }, 500);
    };

    const handleJobClick = (job) => {
        navigate(`/jobs/detail/${job.id}`, { state: { job } });
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
        onClick={() => handleJobClick(job)}>
            {/* 정사각형 이미지 */}
            <div style={{
                width: '100%',
                paddingBottom: '100%',
                position: 'relative',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: '16px',
                borderRadius: '12px 12px 0 0',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '3.5rem',
                    textAlign: 'center',
                    width: '80%'
                }}>
                    📊
                    <div style={{
                        fontSize: '1rem',
                        marginTop: '12px',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        wordBreak: 'keep-all'
                    }}>
                        {job.company}
                    </div>
                </div>
            </div>

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
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    flexShrink: 0,
                    marginLeft: '12px'
                }}>
                    빅데이터/AI
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
                        AI 채용공고를 불러오는 중...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
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
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '1.2rem',
                        color: '#d32f2f',
                        marginBottom: '20px'
                    }}>
                        ⚠️ 오류 발생
                    </div>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                        {error}
                    </p>
                    <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '20px' }}>
                        백엔드 서버가 응답하지 않습니다.<br/>
                        Railway 백엔드를 확인해주세요.
                    </p>
                    <button
                        onClick={() => navigate('/jobs')}
                        style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            marginRight: '10px'
                        }}
                    >
                        뒤로가기
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'transparent',
                            color: '#667eea',
                            border: '2px solid #667eea',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        다시 시도
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
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <span style={{ fontSize: '2rem' }}>📊</span>
                                BIGDATA/AI 채용공고
                                <span style={{
                                    fontSize: '1.2rem',
                                    color: '#1976d2',
                                    fontWeight: '600',
                                    marginLeft: '8px'
                                }}>
                                    ({jobs.length}건)
                                </span>
                            </h1>
                            <p style={{
                                fontSize: '1rem',
                                color: '#666'
                            }}>
                                최신 빅데이터/AI 분야 채용정보를 확인하세요
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/jobs')}
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
                            뒤로가기
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 영역 - 2개씩 그리드 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px'
                }}>
                    {displayedJobs.length > 0 ? (
                        displayedJobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))
                    ) : (
                        <div style={{
                            gridColumn: '1 / -1',
                            background: 'white',
                            borderRadius: '16px',
                            padding: '40px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            textAlign: 'center',
                            color: '#999'
                        }}>
                            채용공고가 없습니다.
                        </div>
                    )}
                </div>

                {/* 로딩 인디케이터 */}
                {loadingMore && (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: '#667eea',
                        fontSize: '1rem'
                    }}>
                        로딩 중...
                    </div>
                )}

                {/* 끝 메시지 */}
                {!loadingMore && displayedJobs.length >= jobs.length && jobs.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: '#999',
                        fontSize: '0.9rem'
                    }}>
                        모든 채용공고를 확인했습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
