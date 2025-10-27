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
    const [itJobs, setItJobs] = useState([]);
    const [bigdataTotal, setBigdataTotal] = useState(0);
    const [itTotal, setItTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scraping, setScraping] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);


            // BIGDATA_AI 및 IT 카테고리 병렬 조회
            const [bigdataResponse, itResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/jobs/BIGDATA_AI?limit=6`, {
                    withCredentials: true
                    // timeout 제거: 느린 WiFi 환경 지원
                }),
                axios.get(`${API_BASE_URL}/api/jobs/IT?limit=6`, {
                    withCredentials: true
                    // timeout 제거: 느린 WiFi 환경 지원
                })
            ]);


            if (bigdataResponse.data.success) {
                const activeJobs = bigdataResponse.data.jobs.filter(job => !isExpired(job));
                setBigdataJobs(activeJobs);
                setBigdataTotal(bigdataResponse.data.total || 0);
            }

            if (itResponse.data.success) {
                const activeJobs = itResponse.data.jobs.filter(job => !isExpired(job));
                setItJobs(activeJobs);
                setItTotal(itResponse.data.total || 0);
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

    const handleScrapJobs = async () => {
        if (scraping) return;

        const confirmScrape = window.confirm('Catch.co.kr에서 최신 공고를 스크래핑하시겠습니까?\n약 30개의 IT/AI 공고를 가져옵니다.');
        if (!confirmScrape) return;

        try {
            setScraping(true);

            const response = await axios.post(`${API_BASE_URL}/api/scrape-latest-jobs`, {}, {
                withCredentials: true
            });


            if (response.data.success) {
                // 백그라운드 스크래핑 시작 알림만 표시하고 팝업창은 표시하지 않음

                // 30초 후 공고 목록 자동 새로고침
                setTimeout(() => {
                    fetchJobs();
                }, 30000);
            } else {
                alert(`스크래핑 실패: ${response.data.message || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('[SCRAPE] Error:', error);
            alert(`스크래핑 중 오류가 발생했습니다.\n${error.response?.data?.message || error.message}`);
        } finally {
            setScraping(false);
        }
    };

    const getCompanyLogoUrl = (job) => {
        // 회사 로고 URL이 있으면 직접 사용
        if (job.company_logo_url) {
            return job.company_logo_url;
        }
        return null;
    };

    const JobCard = ({ job }) => {
        const logoUrl = getCompanyLogoUrl(job);
        const [logoError, setLogoError] = useState(false);

        const handleViewJobDetail = (e) => {
            e.stopPropagation();
            handleJobClick(job);
        };

        const handleAIInterview = (e) => {
            e.stopPropagation();
            navigate('/ai-interview', {
                state: { companyName: job.company }
            });
        };

        const handleAICoverLetter = (e) => {
            e.stopPropagation();
            navigate('/ai-cover-letter', {
                state: { companyName: job.company, jobId: job.id }
            });
        };

        const handleCodingTest = (e) => {
            e.stopPropagation();
            // 회사별 코딩테스트 페이지 분기
            if (job.company && job.company.includes('LG')) {
                navigate('/lg-coding-test');
            } else if (job.company && job.company.includes('현대')) {
                navigate('/hyundai-coding-test');
            } else {
                navigate('/coding-test');
            }
        };

        return (
            <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                overflow: 'hidden',
                transition: 'all 0.3s',
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
            }}>
                {/* 이미지 영역 (세로 축소) */}
                <div style={{
                    width: '100%',
                    paddingBottom: '40%',
                    position: 'relative',
                    background: logoUrl && !logoError ? 'white' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
                onClick={handleViewJobDetail}>
                    {logoUrl && !logoError ? (
                        <img
                            src={logoUrl}
                            alt={`${job.company} 로고`}
                            onError={() => setLogoError(true)}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                maxWidth: '70%',
                                maxHeight: '70%',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: '2.5rem',
                            textAlign: 'center',
                            width: '80%'
                        }}>
                            📊
                            <div style={{
                                fontSize: '0.85rem',
                                marginTop: '8px',
                                fontWeight: '600',
                                lineHeight: '1.3',
                                wordBreak: 'keep-all'
                            }}>
                                {job.company}
                            </div>
                        </div>
                    )}
                </div>

                {/* 제목 및 회사명 */}
                <div style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={handleViewJobDetail}>
                    <h3 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '6px',
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

                {/* 4개 버튼 (2x2 그리드) */}
                <div style={{
                    padding: '0 16px 16px 16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                }}>
                    <button
                        onClick={handleViewJobDetail}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)';
                        }}>
                        채용공고
                    </button>

                    <button
                        onClick={handleAIInterview}
                        style={{
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(240, 147, 251, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(240, 147, 251, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(240, 147, 251, 0.3)';
                        }}>
                        AI면접
                    </button>

                    <button
                        onClick={handleAICoverLetter}
                        style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(79, 172, 254, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(79, 172, 254, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(79, 172, 254, 0.3)';
                        }}>
                        AI자소서
                    </button>

                    <button
                        onClick={handleCodingTest}
                        style={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(67, 233, 123, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(67, 233, 123, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(67, 233, 123, 0.3)';
                        }}>
                        코딩Test
                    </button>
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
            padding: '20px 20px',
            paddingBottom: '80px'
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
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
                                최신 채용공고
                            </h1>
                            <p style={{
                                fontSize: '1rem',
                                color: '#666'
                            }}>
                                최신 IT 및 빅데이터/AI 분야 채용정보를 확인하세요
                            </p>
                        </div>
                        <button
                            onClick={handleScrapJobs}
                            disabled={scraping}
                            style={{
                                background: scraping ? '#cbd5e0' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                border: scraping ? 'none' : '3px solid white',
                                color: 'white',
                                padding: '14px 32px',
                                borderRadius: '28px',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                cursor: scraping ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: scraping ? 'none' : '0 6px 24px rgba(6, 182, 212, 0.5)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                if (!scraping) {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 10px 32px rgba(6, 182, 212, 0.6)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!scraping) {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(6, 182, 212, 0.5)';
                                }
                            }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.3rem' }}>{scraping ? '⏳' : '🔄'}</span>
                                <span>{scraping ? '스크래핑 중...' : '최근 공고 스크래핑'}</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                    {/* BIGDATA_AI 섹션 */}
                    <div style={{ marginBottom: '0px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
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
                                    fontSize: '1.1rem',
                                    color: '#333',
                                    fontWeight: '700',
                                    marginLeft: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    padding: '4px 0'
                                }}>
                                    ({bigdataJobs.length}건 / 전체 {bigdataTotal > 0 ? `${bigdataTotal}건` : '확인 중...'})
                                </span>
                            </h2>
                            <button
                                onClick={handleViewAll}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 28px',
                                    borderRadius: '24px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
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

                    {/* IT 섹션 */}
                    <div style={{ marginBottom: '0px', marginTop: '40px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }}>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#333',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1.8rem' }}>💻</span>
                                IT
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
                                    ({itJobs.length}건 / 전체 {itTotal > 0 ? `${itTotal}건` : '확인 중...'})
                                </span>
                            </h2>
                            <button
                                onClick={() => navigate('/jobs/it')}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 28px',
                                    borderRadius: '24px',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
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
                            {itJobs.length > 0 ? (
                                itJobs.map((job) => (
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
