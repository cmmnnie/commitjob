import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app');

export default function CodingTestPage() {
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [problems, setProblems] = useState([]);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [problemDetail, setProblemDetail] = useState(null);
    const [code, setCode] = useState('// 여기에 코드를 작성하세요\n');
    const [loading, setLoading] = useState(false);

    // 페이지 로드 시 회사 목록 조회
    useEffect(() => {
        fetchCompanies();
    }, []);

    // 회사 목록 조회
    const fetchCompanies = async () => {
        try {
            setLoading(true);

            // 목업 데이터 (Railway 빌드 실패 대비)
            const mockData = [
                { company: 'LG', count: 34 },
                { company: '삼성', count: 45 },
                { company: '카카오', count: 14 },
                { company: '현대', count: 46 }
            ];

            try {
                const response = await axios.get(`${API_BASE_URL}/api/coding/companies`, { timeout: 3000 });
                if (response.data.success) {
                    setCompanies(response.data.companies);
                    console.log('[CodingTest] API 회사 목록:', response.data.companies);
                    return;
                }
            } catch (apiError) {
                console.warn('[CodingTest] API 실패, 목업 사용:', apiError.message);
            }

            // API 실패 시 목업 데이터 사용
            setCompanies(mockData);
            console.log('[CodingTest] 목업 데이터 사용');
        } catch (error) {
            console.error('[CodingTest] 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 회사 선택 시 해당 회사의 문제 목록 조회
    const handleCompanySelect = async (company) => {
        try {
            setLoading(true);
            setSelectedCompany(company);
            setSelectedProblem(null);
            setProblemDetail(null);

            const response = await axios.get(
                `${API_BASE_URL}/api/coding/problems?company=${encodeURIComponent(company)}`
            );

            if (response.data.success) {
                setProblems(response.data.problems);
                console.log('[CodingTest] 문제 목록:', response.data.problems.length, '개');
            }
        } catch (error) {
            console.error('[CodingTest] 문제 목록 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 문제 선택 시 상세 정보 조회
    const handleProblemSelect = async (problem) => {
        try {
            setLoading(true);
            setSelectedProblem(problem);
            setProblemDetail(null);
            setCode('// 여기에 코드를 작성하세요\n');

            const response = await axios.get(
                `${API_BASE_URL}/api/coding/problem/${problem.problem_number}`
            );

            if (response.data.success) {
                setProblemDetail(response.data.detail);
                console.log('[CodingTest] 문제 상세:', response.data.detail);
            }
        } catch (error) {
            console.error('[CodingTest] 문제 상세 조회 오류:', error);
            alert('문제 상세 정보를 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 목록으로 돌아가기
    const handleBackToList = () => {
        setSelectedProblem(null);
        setProblemDetail(null);
        setCode('// 여기에 코드를 작성하세요\n');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            paddingBottom: '80px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    marginBottom: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ fontSize: '4rem' }}>🖥️</div>
                        <div>
                            <h1 style={{
                                fontSize: '2.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                margin: 0
                            }}>
                                AI 코딩 Test
                            </h1>
                            <p style={{ fontSize: '1.1rem', color: '#666', margin: '10px 0 0 0' }}>
                                기업별 코딩 테스트 문제를 풀어보세요
                            </p>
                        </div>
                    </div>
                </div>

                {!selectedProblem ? (
                    <>
                        {/* 회사 선택 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '30px',
                            marginBottom: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px' }}>
                                회사 선택
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {companies.map(comp => (
                                    <button
                                        key={comp.company}
                                        onClick={() => handleCompanySelect(comp.company)}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '15px',
                                            border: selectedCompany === comp.company ? '3px solid #667eea' : '2px solid #e5e8eb',
                                            background: selectedCompany === comp.company ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            fontWeight: '600',
                                            fontSize: '1.1rem'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedCompany !== comp.company) {
                                                e.currentTarget.style.borderColor = '#667eea';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedCompany !== comp.company) {
                                                e.currentTarget.style.borderColor = '#e5e8eb';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🏢</div>
                                        <div style={{ color: '#333' }}>{comp.company}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                                            {comp.count}개 문제
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 문제 목록 */}
                        {selectedCompany && (
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '30px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '20px' }}>
                                    {selectedCompany} 문제 목록
                                </h2>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        로딩 중...
                                    </div>
                                ) : problems.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        문제가 없습니다.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {problems.map(problem => (
                                            <div
                                                key={problem.problem_number}
                                                onClick={() => handleProblemSelect(problem)}
                                                style={{
                                                    padding: '20px',
                                                    borderRadius: '12px',
                                                    border: '2px solid #e5e8eb',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = '#667eea';
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #667eea08 0%, #764ba208 100%)';
                                                    e.currentTarget.style.transform = 'translateX(5px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = '#e5e8eb';
                                                    e.currentTarget.style.background = 'white';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }}
                                            >
                                                <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>
                                                    {problem.problem_title || `문제 ${problem.problem_number}`}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                                    난이도: {problem.level || 'N/A'} | 번호: {problem.problem_number}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* 문제 상세 및 코드 에디터 */
                    <>
                        {/* 문제 상세 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '30px',
                            marginBottom: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>
                                    {selectedProblem.problem_title || `문제 ${selectedProblem.problem_number}`}
                                </h2>
                                <button
                                    onClick={handleBackToList}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#667eea',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    ← 목록
                                </button>
                            </div>

                            {problemDetail && (
                                <div style={{ lineHeight: '1.8' }}>
                                    <div style={{ whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
                                        {problemDetail.problem_description}
                                    </div>

                                    {problemDetail.input_description && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h4 style={{ color: '#667eea' }}>입력</h4>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#666' }}>
                                                {problemDetail.input_description}
                                            </div>
                                        </div>
                                    )}

                                    {problemDetail.output_description && (
                                        <div style={{ marginTop: '20px' }}>
                                            <h4 style={{ color: '#667eea' }}>출력</h4>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#666' }}>
                                                {problemDetail.output_description}
                                            </div>
                                        </div>
                                    )}

                                    {problemDetail.sample_input_1 && (
                                        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div>
                                                <h4 style={{ color: '#667eea' }}>예제 입력</h4>
                                                <pre style={{
                                                    padding: '15px',
                                                    background: '#f5f5f5',
                                                    borderRadius: '8px',
                                                    overflow: 'auto'
                                                }}>
                                                    {problemDetail.sample_input_1}
                                                </pre>
                                            </div>
                                            <div>
                                                <h4 style={{ color: '#667eea' }}>예제 출력</h4>
                                                <pre style={{
                                                    padding: '15px',
                                                    background: '#f5f5f5',
                                                    borderRadius: '8px',
                                                    overflow: 'auto'
                                                }}>
                                                    {problemDetail.sample_output_1}
                                                </pre>
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
                                                    display: 'inline-block',
                                                    padding: '10px 20px',
                                                    background: '#667eea',
                                                    color: 'white',
                                                    textDecoration: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                백준에서 문제 보기 →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 코드 에디터 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '30px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '15px' }}>
                                💻 코드 작성
                            </h3>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '400px',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    border: '2px solid #e5e8eb',
                                    fontFamily: 'Monaco, Consolas, monospace',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    background: '#1e1e1e',
                                    color: '#d4d4d4'
                                }}
                                placeholder="여기에 코드를 작성하세요..."
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
