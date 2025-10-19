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

                // 각 회사별로 문제 목록 조회
                for (const company of companies) {
                    try {
                        const problemsResponse = await axios.get(
                            `${API_BASE_URL}/api/coding/problems`,
                            {
                                params: { company, limit: 100 },
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

    const handleProblemSelect = (problem, company) => {
        setSelectedProblem({ ...problem, company });
        setCode('// 여기에 코드를 작성하세요\n');
        setTestResult(null);
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
                    problem_id: selectedProblem.id,
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
        setCode('// 여기에 코드를 작성하세요\n');
        setTestResult(null);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f5f7fa',
            paddingBottom: '80px'
        }}>
            {/* 헤더 */}
            <div style={{
                backgroundColor: '#fff',
                borderBottom: '1px solid #e5e8eb',
                padding: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '8px',
                            marginRight: '12px'
                        }}
                    >
                        ←
                    </button>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                        코딩 테스트
                    </h1>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                {!selectedProblem ? (
                    <>
                        {/* 기능 설명 */}
                        <div style={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#1a202c' }}>
                                💻 AI 코딩 테스트
                            </h2>
                            <p style={{ color: '#4a5568', lineHeight: '1.8', marginBottom: '20px', fontSize: '15px' }}>
                                기업별 코딩 테스트 문제를 풀어보고 AI의 도움으로 실력을 향상시킬 수 있습니다.<br/>
                                아래 회사 목록에서 문제를 선택하여 직접 코드를 작성하고 테스트해보세요.
                            </p>

                            {/* AI 기능 소개 */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '12px',
                                marginTop: '20px',
                                paddingTop: '20px',
                                borderTop: '1px solid #e5e8eb'
                            }}>
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#f0f9ff',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #3b82f6'
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#1e40af', fontSize: '14px' }}>
                                        AI 어시스턴트
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
                                        문제 해결에 어려움이 있을 때 AI가 힌트와 가이드를 제공합니다
                                    </div>
                                </div>

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#f0fdf4',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #10b981'
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#065f46', fontSize: '14px' }}>
                                        실시간 피드백
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#064e3b', lineHeight: '1.5' }}>
                                        코드 작성 후 즉시 AI 리뷰와 개선 제안을 받을 수 있습니다
                                    </div>
                                </div>

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#fef3c7',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #f59e0b'
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#92400e', fontSize: '14px' }}>
                                        맞춤형 문제 생성
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.5' }}>
                                        회원님의 실력에 맞는 맞춤형 문제를 AI가 생성해드립니다
                                    </div>
                                </div>

                                <div style={{
                                    padding: '16px',
                                    backgroundColor: '#fce7f3',
                                    borderRadius: '8px',
                                    borderLeft: '3px solid #ec4899'
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#831843', fontSize: '14px' }}>
                                        코드 자동 완성
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#831843', lineHeight: '1.5' }}>
                                        AI가 코드 패턴을 학습하여 자동 완성 기능을 제공합니다
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 로딩 중 */}
                        {loading && (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px',
                                color: '#6b7280',
                                fontSize: '16px'
                            }}>
                                문제 목록을 불러오는 중...
                            </div>
                        )}

                        {/* 회사별 문제 목록 */}
                        {!loading && Object.keys(companiesWithProblems).length === 0 && (
                            <div style={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                padding: '60px 24px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                color: '#6b7280'
                            }}>
                                문제가 없습니다.
                            </div>
                        )}

                        {!loading && Object.entries(companiesWithProblems).map(([company, problems]) => (
                            <div
                                key={company}
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: '12px',
                                    marginBottom: '16px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* 회사 헤더 */}
                                <div
                                    onClick={() => toggleCompany(company)}
                                    style={{
                                        padding: '20px 24px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: expandedCompanies[company] ? '#f9fafb' : '#fff',
                                        borderBottom: expandedCompanies[company] ? '1px solid #e5e8eb' : 'none',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!expandedCompanies[company]) {
                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!expandedCompanies[company]) {
                                            e.currentTarget.style.backgroundColor = '#fff';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '24px' }}>🏢</span>
                                        <div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
                                                {company}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                                {problems.length}개 문제
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '20px',
                                        color: '#6b7280',
                                        transform: expandedCompanies[company] ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}>
                                        ▼
                                    </div>
                                </div>

                                {/* 문제 목록 */}
                                {expandedCompanies[company] && (
                                    <div style={{ padding: '12px 24px 24px 24px' }}>
                                        {problems.length === 0 ? (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: '#6b7280'
                                            }}>
                                                문제가 없습니다.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {problems.map(problem => (
                                                    <div
                                                        key={problem.id}
                                                        onClick={() => handleProblemSelect(problem, company)}
                                                        style={{
                                                            padding: '16px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e5e8eb',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            backgroundColor: '#fff'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                            e.currentTarget.style.transform = 'translateX(4px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#fff';
                                                            e.currentTarget.style.borderColor = '#e5e8eb';
                                                            e.currentTarget.style.transform = 'translateX(0)';
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{
                                                                    fontWeight: 'bold',
                                                                    marginBottom: '6px',
                                                                    color: '#1a202c',
                                                                    fontSize: '15px'
                                                                }}>
                                                                    {problem.title || `문제 ${problem.problem_id}`}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '13px',
                                                                    color: '#6b7280',
                                                                    display: 'flex',
                                                                    gap: '12px',
                                                                    flexWrap: 'wrap'
                                                                }}>
                                                                    <span>
                                                                        난이도: {problem.level || problem.difficulty || 'N/A'}
                                                                    </span>
                                                                    {problem.problem_id && (
                                                                        <span>번호: {problem.problem_id}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                color: '#3b82f6',
                                                                fontSize: '20px',
                                                                marginLeft: '12px'
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
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px'
                            }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1a202c' }}>
                                    {selectedProblem.title || `문제 ${selectedProblem.problem_id}`}
                                </h2>
                                <button
                                    onClick={handleBackToList}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e8eb',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f9fafb';
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#fff';
                                        e.currentTarget.style.borderColor = '#e5e8eb';
                                    }}
                                >
                                    ← 목록으로
                                </button>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '16px',
                                fontSize: '14px',
                                color: '#6b7280',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ fontWeight: '600' }}>
                                    🏢 {selectedProblem.company}
                                </span>
                                <span>•</span>
                                <span>
                                    난이도: {selectedProblem.level || selectedProblem.difficulty || 'N/A'}
                                </span>
                                {selectedProblem.problem_id && (
                                    <>
                                        <span>•</span>
                                        <span>번호: {selectedProblem.problem_id}</span>
                                    </>
                                )}
                            </div>
                            {selectedProblem.link && (
                                <div style={{ marginTop: '16px' }}>
                                    <a
                                        href={selectedProblem.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#3b82f6',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        백준 문제 바로가기 →
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* 코드 에디터 */}
                        <div style={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#1a202c' }}>
                                코드 작성
                            </h3>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '450px',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e8eb',
                                    fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    backgroundColor: '#f9fafb',
                                    color: '#1a202c'
                                }}
                                placeholder="여기에 코드를 작성하세요..."
                            />
                        </div>

                        {/* 제출 버튼 */}
                        <div style={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <button
                                onClick={handleSubmitCode}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = '#2563eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = '#3b82f6';
                                    }
                                }}
                            >
                                {loading ? '제출 중...' : '코드 제출'}
                            </button>
                        </div>

                        {/* 테스트 결과 */}
                        {testResult && (
                            <div style={{
                                backgroundColor: testResult.status === 'success' ? '#ecfdf5' : '#fef2f2',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                borderLeft: `4px solid ${testResult.status === 'success' ? '#10b981' : '#ef4444'}`
                            }}>
                                <h3 style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    color: testResult.status === 'success' ? '#065f46' : '#991b1b'
                                }}>
                                    {testResult.status === 'success' ? '✓ 제출 완료' : '✗ 제출 실패'}
                                </h3>
                                <p style={{
                                    margin: 0,
                                    color: testResult.status === 'success' ? '#047857' : '#b91c1c',
                                    lineHeight: '1.6'
                                }}>
                                    {testResult.message}
                                </p>
                                {testResult.submissionId && (
                                    <p style={{
                                        margin: '8px 0 0 0',
                                        fontSize: '14px',
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
