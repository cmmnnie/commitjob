import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app');

export default function JobsPage() {
    const navigate = useNavigate();
    const [bigdataJobs, setBigdataJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('[JOBS] Fetching 3 jobs from BIGDATA_AI category');

            // BIGDATA_AI 카테고리 3개 조회
            const bigdataResponse = await axios.get(
                `${API_BASE_URL}/api/jobs/BIGDATA_AI?limit=3`,
                {
                    withCredentials: true,
                    timeout: 10000  // 10초 타임아웃
                }
            );

            console.log('[JOBS] Response:', bigdataResponse.data);

            if (bigdataResponse.data.success) {
                // 만료되지 않은 채용공고만 필터링하고 id 내림차순으로 정렬
                const activeJobs = bigdataResponse.data.jobs
                    .filter(job => !isExpired(job))
                    .sort((a, b) => b.id - a.id) // id 내림차순
                    .slice(0, 3); // 최대 3개만

                setBigdataJobs(activeJobs);
            }
        } catch (error) {
            console.error('[JOBS] Failed to fetch jobs:', error);
            setError(error.message || '채용공고를 불러오는데 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

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

    const handleViewAll = () => {
        navigate('/jobs/ai');
    };

    const handleJobClick = (job) => {
        navigate(`/jobs/detail/${job.id}`, { state: { job } });
    };

    const JobCard = ({ job }) => (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e0e0e0',
            overflow: 'hidden',
            transition: 'all 0.3s',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '3rem',
                    textAlign: 'center',
                    width: '80%'
                }}>
                    📊
                    <div style={{
                        fontSize: '0.9rem',
                        marginTop: '10px',
                        fontWeight: '600',
                        lineHeight: '1.3',
                        wordBreak: 'keep-all'
                    }}>
                        {job.company}
                    </div>
                </div>
            </div>

            {/* 제목 및 회사명 */}
            <div style={{ padding: '20px' }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '2.8em'
                }}>{job.title}</h3>
                <p style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ fontSize: '1rem' }}>🏢</span>
                    {job.company}
                </p>
            </div>
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
                        채용공고를 불러오는 중...
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
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
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
                                <span style={{ fontSize: '1.8rem' }}>📊</span>
                                BIGDATA/AI
                                <span style={{
                                    fontSize: '0.9rem',
                                    color: '#999',
                                    fontWeight: '400',
                                    marginLeft: '8px'
                                }}>
                                    ({bigdataJobs.length}건)
                                </span>
                            </h2>
                            <button
                                onClick={handleViewAll}
                                style={{
                                    background: '#1976d2',
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
                                전체보기
                            </button>
                        </div>

                        {/* 1x3 그리드 레이아웃 */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '20px',
                            maxWidth: '1200px',
                            margin: '0 auto'
                        }}>
                            {bigdataJobs.length > 0 ? (
                                bigdataJobs.map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))
                            ) : (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    textAlign: 'center',
                                    padding: '40px',
                                    color: '#999'
                                }}>
                                    채용공고가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
