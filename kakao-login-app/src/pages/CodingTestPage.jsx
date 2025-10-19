import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app');

export default function CodingTestPage() {
    const navigate = useNavigate();
    const [companiesWithProblems, setCompaniesWithProblems] = useState({});
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [problemDetail, setProblemDetail] = useState(null);
    const [code, setCode] = useState('// 여기에 코드를 작성하세요\n');
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedCompanies, setExpandedCompanies] = useState({});

    // 페이지 로드 시 모든 회사의 문제 조회
    useEffect(() => {
        fetchAllCompaniesProblems();
    }, []);

    const fetchAllCompaniesProblems = async () => {
        try {
            setLoading(true);

            // 회사별 통계 조회
            const statsResponse = await axios.get(
                `${API_BASE_URL}/api/coding/companies/stats`,
                { withCredentials: true }
            );

            if (statsResponse.data.success) {
                const companies = Object.keys(statsResponse.data.companies);
                const companiesData = {};

                // 각 회사별로 문제 목록 조회 (company_workbook_problem 테이블)
                for (const company of companies) {
                    try {
                        const problemsResponse = await axios.get(
                            `${API_BASE_URL}/api/coding/company-problems`,
                            {
                                params: { company },
                                withCredentials: true
                            }
                        );

                        if (problemsResponse.data.success) {
                            companiesData[company] = problemsResponse.data.problems;
                        }
                    } catch (error) {
                        console.error(`${company} 문제 조회 오류:`, error);
                        companiesData[company] = [];
                    }
                }

                setCompaniesWithProblems(companiesData);

                // 첫 번째 회사만 기본으로 펼치기
                if (companies.length > 0) {
                    setExpandedCompanies({ [companies[0]]: true });
                }
            }
        } catch (error) {
            console.error('회사별 문제 조회 오류:', error);
            console.error('오류 상세:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleCompany = (company) => {
        setExpandedCompanies(prev => ({
            ...prev,
            [company]: !prev[company]
        }));
    };

    const handleProblemSelect = async (problem, company) => {
        setLoading(true);
        setProblemDetail(null);

        try {
            // problem_detail 테이블에서 상세 정보 조회
            const detailResponse = await axios.get(
                `${API_BASE_URL}/api/coding/problem-detail/${problem.problem_number}`,
                { withCredentials: true }
            );

            if (detailResponse.data.success) {
                setSelectedProblem({ ...problem, company });
                setProblemDetail(detailResponse.data.detail);
                setCode('// 여기에 코드를 작성하세요\n');
                setTestResult(null);
            }
        } catch (error) {
            console.error('문제 상세 조회 오류:', error);
            alert('문제 상세 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!selectedProblem) {
            alert('문제를 먼저 선택해주세요.');
            return;
        }

        if (!code || code.trim() === '' || code.trim() === '// 여기에 코드를 작성하세요') {
            alert('코드를 작성해주세요.');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(
                `${API_BASE_URL}/api/coding/submit`,
                {
                    problem_id: selectedProblem.id || selectedProblem.problem_number,
                    code: code,
                    language: 'javascript'
                },
                { withCredentials: true }
            );

            if (response.data.success) {
                setTestResult({
                    status: 'success',
                    message: '코드가 성공적으로 제출되었습니다!',
                    submissionId: response.data.submission_id
                });
            }
        } catch (error) {
            console.error('코드 제출 오류:', error);
            setTestResult({
                status: 'error',
                message: '코드 제출 중 오류가 발생했습니다.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBackToList = () => {
        setSelectedProblem(null);
        setProblemDetail(null);
        setCode('// 여기에 코드를 작성하세요\n');
        setTestResult(null);
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            paddingBottom: '80px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                {!selectedProblem ? (
                    <>
                        {/* 기능 설명 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '40px',
                            marginBottom: '30px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    fontSize: '4rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    🖥️
                                </div>
                                <div style={{ flex: '1' }}>
                                    <h1 style={{
                                        fontSize: '2.5rem',
                                        fontWeight: '800',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        marginBottom: '10px'
                                    }}>
                                        AI 코딩 Test
                                    </h1>
                                    <p style={{
                                        fontSize: '1.1rem',
                                        color: '#666',
                                        lineHeight: '1.8',
                                        margin: 0
                                    }}>
                                        기업별 코딩 테스트 문제를 풀어보고 AI의 도움으로 실력을 향상시킬 수 있습니다.
                                    </p>
                                </div>
                            </div>

                            {/* AI 기능 소개 */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                marginTop: '20px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                                    borderRadius: '15px',
                                    border: '2px solid #667eea30',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        flexShrink: 0
                                    }}>🤖</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '700',
                                            marginBottom: '6px',
                                            color: '#667eea',
                                            fontSize: '1.1rem'
                                        }}>
                                            AI 어시스턴트
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>
                                            문제 해결에 어려움이 있을 때 AI가 힌트와 가이드를 제공합니다
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #10b98115 0%, #059ff215 100%)',
                                    borderRadius: '15px',
                                    border: '2px solid #10b98130',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        flexShrink: 0
                                    }}>⚡</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '700',
                                            marginBottom: '6px',
                                            color: '#10b981',
                                            fontSize: '1.1rem'
                                        }}>
                                            실시간 피드백
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>
                                            코드 작성 후 즉시 AI 리뷰와 개선 제안을 받을 수 있습니다
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #f59e0b15 0%, #d97f0715 100%)',
                                    borderRadius: '15px',
                                    border: '2px solid #f59e0b30',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        flexShrink: 0
                                    }}>🎯</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '700',
                                            marginBottom: '6px',
                                            color: '#f59e0b',
                                            fontSize: '1.1rem'
                                        }}>
                                            맞춤형 문제 생성
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>
                                            회원님의 실력에 맞는 맞춤형 문제를 AI가 생성해드립니다
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #ec489915 0%, #d946ef15 100%)',
                                    borderRadius: '15px',
                                    border: '2px solid #ec489930',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '3rem',
                                        flexShrink: 0
                                    }}>✨</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: '700',
                                            marginBottom: '6px',
                                            color: '#ec4899',
                                            fontSize: '1.1rem'
                                        }}>
                                            코드 자동 완성
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#666', lineHeight: '1.6' }}>
                                            AI가 코드 패턴을 학습하여 자동 완성 기능을 제공합니다
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 로딩 중 */}
                        {loading && (
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '60px',
                                textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
                                <div style={{ color: '#666', fontSize: '1.2rem' }}>문제 목록을 불러오는 중...</div>
                            </div>
                        )}

                        {/* 회사별 문제 목록 */}
                        {!loading && Object.keys(companiesWithProblems).length === 0 && (
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '60px',
                                textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📭</div>
                                <div style={{ color: '#666', fontSize: '1.2rem' }}>문제가 없습니다.</div>
                            </div>
                        )}

                        {!loading && Object.entries(companiesWithProblems).map(([company, problems]) => (
                            <div
                                key={company}
                                style={{
                                    background: 'white',
                                    borderRadius: '20px',
                                    marginBottom: '20px',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {/* 회사 헤더 */}
                                <div
                                    onClick={() => toggleCompany(company)}
                                    style={{
                                        padding: '30px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: expandedCompanies[company]
                                            ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
                                            : 'white',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!expandedCompanies[company]) {
                                            e.currentTarget.style.background = '#f9fafb';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!expandedCompanies[company]) {
                                            e.currentTarget.style.background = 'white';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{
                                            fontSize: '2.5rem',
                                            width: '60px',
                                            height: '60px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            borderRadius: '15px'
                                        }}>
                                            🏢
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: '#333',
                                                marginBottom: '5px'
                                            }}>
                                                {company}
                                            </div>
                                            <div style={{ fontSize: '1rem', color: '#666' }}>
                                                {problems.length}개 문제
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        color: '#667eea',
                                        transform: expandedCompanies[company] ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease'
                                    }}>
                                        ▼
                                    </div>
                                </div>

                                {/* 문제 목록 */}
                                {expandedCompanies[company] && (
                                    <div style={{ padding: '20px 30px 30px 30px' }}>
                                        {problems.length === 0 ? (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: '#999'
                                            }}>
                                                문제가 없습니다.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                {problems.map(problem => (
                                                    <div
                                                        key={problem.id || problem.problem_number}
                                                        onClick={() => handleProblemSelect(problem, company)}
                                                        style={{
                                                            padding: '20px',
                                                            borderRadius: '15px',
                                                            border: '2px solid #e5e8eb',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s ease',
                                                            background: 'white'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)';
                                                            e.currentTarget.style.borderColor = '#667eea';
                                                            e.currentTarget.style.transform = 'translateX(8px)';
                                                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.2)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'white';
                                                            e.currentTarget.style.borderColor = '#e5e8eb';
                                                            e.currentTarget.style.transform = 'translateX(0)';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{
                                                                    fontWeight: '700',
                                                                    marginBottom: '8px',
                                                                    color: '#333',
                                                                    fontSize: '1.1rem'
                                                                }}>
                                                                    {problem.problem_title || `문제 ${problem.problem_number}`}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.9rem',
                                                                    color: '#666',
                                                                    display: 'flex',
                                                                    gap: '15px',
                                                                    flexWrap: 'wrap'
                                                                }}>
                                                                    <span>📊 난이도: {problem.level || 'N/A'}</span>
                                                                    <span>🔢 번호: {problem.problem_number}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                color: '#667eea',
                                                                fontSize: '1.5rem',
                                                                marginLeft: '20px'
                                                            }}>
                                                                →
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                ) : (
                    /* 코딩 테스트 화면 */
                    <div>
                        {/* 문제 정보 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '40px',
                            marginBottom: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '20px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{
                                        fontSize: '2rem',
                                        fontWeight: '800',
                                        color: '#333',
                                        marginBottom: '15px'
                                    }}>
                                        {selectedProblem.problem_title || `문제 ${selectedProblem.problem_number}`}
                                    </h2>
                                    <div style={{
                                        display: 'flex',
                                        gap: '20px',
                                        fontSize: '1rem',
                                        color: '#666',
                                        flexWrap: 'wrap'
                                    }}>
                                        <span style={{ fontWeight: '600' }}>🏢 {selectedProblem.company}</span>
                                        <span>📊 난이도: {selectedProblem.level || 'N/A'}</span>
                                        <span>🔢 번호: {selectedProblem.problem_number}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleBackToList}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                    }}
                                >
                                    ← 목록으로
                                </button>
                            </div>

                            {/* 문제 상세 내용 */}
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                                    <div style={{ color: '#666' }}>문제 상세 정보를 불러오는 중...</div>
                                </div>
                            ) : problemDetail ? (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '30px',
                                    background: '#f9fafb',
                                    borderRadius: '15px',
                                    lineHeight: '1.8'
                                }}>
                                    <div style={{
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'inherit',
                                        color: '#333'
                                    }}>
                                        {problemDetail.problem_description || '문제 설명이 없습니다.'}
                                    </div>

                                    {problemDetail.input_description && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>📥 입력</h4>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#666' }}>
                                                {problemDetail.input_description}
                                            </div>
                                        </div>
                                    )}

                                    {problemDetail.output_description && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>📤 출력</h4>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#666' }}>
                                                {problemDetail.output_description}
                                            </div>
                                        </div>
                                    )}

                                    {(problemDetail.sample_input_1 || problemDetail.sample_output_1) && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>📋 예제</h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '15px'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', marginBottom: '5px', color: '#333' }}>입력</div>
                                                    <div style={{
                                                        padding: '15px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        fontFamily: 'Monaco, monospace',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'pre-wrap'
                                                    }}>
                                                        {problemDetail.sample_input_1 || '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', marginBottom: '5px', color: '#333' }}>출력</div>
                                                    <div style={{
                                                        padding: '15px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        fontFamily: 'Monaco, monospace',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'pre-wrap'
                                                    }}>
                                                        {problemDetail.sample_output_1 || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {problemDetail.link && (
                                        <div style={{ marginTop: '20px' }}>
                                            <a
                                                href={problemDetail.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '10px 20px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    textDecoration: 'none',
                                                    borderRadius: '10px',
                                                    fontWeight: '600',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                백준 문제 바로가기 →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '30px',
                                    background: '#fef2f2',
                                    borderRadius: '15px',
                                    color: '#b91c1c',
                                    textAlign: 'center'
                                }}>
                                    문제 상세 정보를 불러올 수 없습니다.
                                </div>
                            )}
                        </div>

                        {/* 코드 에디터 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '40px',
                            marginBottom: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                marginBottom: '20px',
                                color: '#333'
                            }}>
                                💻 코드 작성
                            </h3>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '500px',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    border: '2px solid #e5e8eb',
                                    fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    background: '#1e1e1e',
                                    color: '#d4d4d4',
                                    outline: 'none'
                                }}
                                placeholder="여기에 코드를 작성하세요..."
                            />
                        </div>

                        {/* 제출 버튼 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '40px',
                            marginBottom: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <button
                                onClick={handleSubmitCode}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    background: loading
                                        ? '#9ca3af'
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: '#fff',
                                    fontSize: '1.3rem',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: loading ? 'none' : '0 10px 30px rgba(102, 126, 234, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
                                    }
                                }}
                            >
                                {loading ? '제출 중...' : '🚀 코드 제출'}
                            </button>
                        </div>

                        {/* 테스트 결과 */}
                        {testResult && (
                            <div style={{
                                background: testResult.status === 'success' ? '#ecfdf5' : '#fef2f2',
                                borderRadius: '20px',
                                padding: '40px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                borderLeft: `6px solid ${testResult.status === 'success' ? '#10b981' : '#ef4444'}`
                            }}>
                                <h3 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    marginBottom: '15px',
                                    color: testResult.status === 'success' ? '#065f46' : '#991b1b'
                                }}>
                                    {testResult.status === 'success' ? '✓ 제출 완료' : '✗ 제출 실패'}
                                </h3>
                                <p style={{
                                    margin: 0,
                                    fontSize: '1.1rem',
                                    color: testResult.status === 'success' ? '#047857' : '#b91c1c',
                                    lineHeight: '1.6'
                                }}>
                                    {testResult.message}
                                </p>
                                {testResult.submissionId && (
                                    <p style={{
                                        margin: '15px 0 0 0',
                                        fontSize: '0.95rem',
                                        color: '#6b7280'
                                    }}>
                                        제출 ID: {testResult.submissionId}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
