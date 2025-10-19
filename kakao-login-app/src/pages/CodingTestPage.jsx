import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app');

export default function CodingTestPage() {
    const navigate = useNavigate();
    const [selectedCompany, setSelectedCompany] = useState('');
    const [companies, setCompanies] = useState([]);
    const [problems, setProblems] = useState([]);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [code, setCode] = useState('// 여기에 코드를 작성하세요\n');
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [companiesStats, setCompaniesStats] = useState({});

    // 회사별 통계 조회
    useEffect(() => {
        fetchCompaniesStats();
    }, []);

    // 선택된 회사의 문제 목록 조회
    useEffect(() => {
        if (selectedCompany) {
            fetchProblems(selectedCompany);
        }
    }, [selectedCompany]);

    const fetchCompaniesStats = async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/coding/companies/stats`,
                { withCredentials: true }
            );

            if (response.data.success) {
                setCompaniesStats(response.data.companies);
                const companyList = Object.keys(response.data.companies);
                setCompanies(companyList);
            }
        } catch (error) {
            console.error('회사별 통계 조회 오류:', error);
        }
    };

    const fetchProblems = async (company) => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/api/coding/problems`,
                {
                    params: { company, limit: 50 },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                setProblems(response.data.problems);
            }
        } catch (error) {
            console.error('문제 목록 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProblemSelect = (problem) => {
        setSelectedProblem(problem);
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
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
                                💻 코딩 테스트란?
                            </h2>
                            <p style={{ color: '#4a5568', lineHeight: '1.6', margin: 0 }}>
                                기업별 코딩 테스트 문제를 풀어보고 실력을 향상시킬 수 있습니다.
                                회사를 선택하면 해당 기업의 기출 문제들을 확인할 수 있으며,
                                문제를 선택하여 직접 코드를 작성하고 테스트할 수 있습니다.
                            </p>
                        </div>

                        {/* 회사 선택 */}
                        <div style={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                회사 선택
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '12px'
                            }}>
                                {companies.map(company => (
                                    <button
                                        key={company}
                                        onClick={() => setSelectedCompany(company)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '8px',
                                            border: selectedCompany === company
                                                ? '2px solid #3b82f6'
                                                : '1px solid #e5e8eb',
                                            backgroundColor: selectedCompany === company
                                                ? '#eff6ff'
                                                : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                            {company}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {companiesStats[company] || 0}문제
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 문제 목록 */}
                        {selectedCompany && (
                            <div style={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                padding: '24px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                    {selectedCompany} 문제 목록
                                </h3>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                        로딩 중...
                                    </div>
                                ) : problems.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                        문제가 없습니다.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {problems.map(problem => (
                                            <div
                                                key={problem.id}
                                                onClick={() => handleProblemSelect(problem)}
                                                style={{
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e8eb',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    backgroundColor: '#fff'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                                    e.currentTarget.style.borderColor = '#3b82f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#fff';
                                                    e.currentTarget.style.borderColor = '#e5e8eb';
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                                            {problem.title || `문제 ${problem.problem_id}`}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                            난이도: {problem.level || problem.difficulty || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div style={{ color: '#3b82f6', fontSize: '18px' }}>
                                                        →
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                                    {selectedProblem.title || `문제 ${selectedProblem.problem_id}`}
                                </h2>
                                <button
                                    onClick={handleBackToList}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e8eb',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    ← 목록으로
                                </button>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                fontSize: '14px',
                                color: '#6b7280'
                            }}>
                                <span>회사: {selectedCompany}</span>
                                <span>•</span>
                                <span>난이도: {selectedProblem.level || selectedProblem.difficulty || 'N/A'}</span>
                            </div>
                            {selectedProblem.link && (
                                <div style={{ marginTop: '12px' }}>
                                    <a
                                        href={selectedProblem.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#3b82f6',
                                            textDecoration: 'none',
                                            fontSize: '14px'
                                        }}
                                    >
                                        백준 문제 보기 →
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
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
                                코드 작성
                            </h3>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '400px',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e8eb',
                                    fontFamily: 'Monaco, Courier, monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    resize: 'vertical'
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
                                    color: testResult.status === 'success' ? '#047857' : '#b91c1c'
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
