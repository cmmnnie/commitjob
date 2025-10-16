import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function AICoverLetterPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [jobPostings, setJobPostings] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [coverLetter, setCoverLetter] = useState(null);
    const [isCoverLetterLoading, setIsCoverLetterLoading] = useState(false);

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('app_session');
            if (!token) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }

            const userResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }

            const userData = await userResponse.json();
            if (userData.user) {
                setCurrentUser(userData.user);
            } else {
                setError('사용자 정보를 불러올 수 없습니다.');
            }
        } catch (err) {
            console.error('[AI자소서] 오류:', err);
            setError('사용자 정보를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 회사명 입력 시 채용공고 조회
    const fetchJobPostings = async (company) => {
        if (!company.trim()) {
            setJobPostings([]);
            setSelectedJobId('');
            return;
        }

        setIsLoadingJobs(true);
        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(
                `${CONFIG.BACKEND_URL}/api/jobs-by-company?company=${encodeURIComponent(company.trim())}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.jobs) {
                    setJobPostings(data.jobs);
                    setSelectedJobId(''); // 초기화
                } else {
                    setJobPostings([]);
                }
            } else {
                setJobPostings([]);
            }
        } catch (err) {
            console.error('[채용공고 조회] 오류:', err);
            setJobPostings([]);
        } finally {
            setIsLoadingJobs(false);
        }
    };

    const generateCoverLetter = async () => {
        if (!companyName.trim()) {
            alert('회사명을 입력해주세요.');
            return;
        }

        setIsCoverLetterLoading(true);
        setCoverLetter(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letter`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    company: companyName.trim(),
                    job_id: selectedJobId || null
                })
            });

            if (!response.ok) {
                throw new Error('자기소개서 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.coverLetter) {
                setCoverLetter(data.coverLetter);
            } else {
                alert('자기소개서를 생성할 수 없습니다.');
            }
        } catch (err) {
            console.error('[자기소개서 생성] 오류:', err);
            alert('자기소개서 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsCoverLetterLoading(false);
        }
    };

    const handleLogin = () => {
        navigate('/?view=login');
    };

    const handleCopy = () => {
        if (coverLetter) {
            navigator.clipboard.writeText(coverLetter);
            alert('자기소개서가 클립보드에 복사되었습니다!');
        }
    };

    if (isLoading && !currentUser) {
        return (
            <div style={{
                padding: '20px',
                paddingBottom: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minHeight: 'calc(100vh - 60px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    textAlign: 'center'
                }}>
                    <div className="spinner" style={{
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #667eea',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: '#666', fontSize: '1rem' }}>로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error === '로그인이 필요합니다.') {
        return (
            <div style={{
                padding: '20px',
                paddingBottom: '80px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minHeight: 'calc(100vh - 60px)'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '40px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    maxWidth: '500px',
                    margin: '0 auto',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: '#333',
                        marginBottom: '15px',
                        fontWeight: '700'
                    }}>로그인이 필요합니다</h2>
                    <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                        AI 자기소개서 생성 서비스를 이용하려면<br/>
                        로그인이 필요합니다.
                    </p>
                    <button
                        onClick={handleLogin}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '15px 24px',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}>
                        로그인하러 가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '20px',
            paddingBottom: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: 'calc(100vh - 60px)'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto'
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            fontSize: '2.2rem',
                            padding: '8px',
                            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                            borderRadius: '12px',
                            flexShrink: '0'
                        }}>📝</div>
                        <div style={{ flex: '1' }}>
                            <h1 style={{
                                fontSize: '1.6rem',
                                color: '#667eea',
                                marginBottom: '2px',
                                fontWeight: '700',
                                letterSpacing: '-0.5px'
                            }}>AI 자기소개서 작성</h1>
                            <p style={{
                                color: '#1a202c',
                                fontSize: '0.95rem',
                                margin: '0',
                                fontWeight: '700',
                                letterSpacing: '-0.3px',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                GPT가 회원님의 이력서를 분석하여 맞춤형 자기소개서 작성
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI 기능 프로세스 도식화 */}
                <div style={{
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    borderRadius: '20px',
                    padding: '30px',
                    marginBottom: '30px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.8rem' }}>🤖</span>
                        <span>AI 자기소개서 작성 프로세스</span>
                    </h3>

                    {/* 3단계 플로우차트 */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {/* Step 1 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #667eea',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                            }}>
                                STEP 1
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>🏢</span>
                                    <span>지원 정보 입력</span>
                                </h4>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flexWrap: 'wrap',
                                    fontSize: '0.95rem',
                                    color: '#555',
                                    lineHeight: '1.8'
                                }}>
                                    <span style={{
                                        background: '#e3f2fd',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#1976d2'
                                    }}>회사명 입력</span>
                                    <span style={{ fontSize: '1.2rem', color: '#999' }}>+</span>
                                    <span style={{
                                        background: '#f3e5f5',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        color: '#7b1fa2'
                                    }}>채용공고 선택 (선택사항)</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow down */}
                        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#667eea', margin: '-5px 0' }}>⬇️</div>

                        {/* Step 2 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #f093fb',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(240, 147, 251, 0.4)'
                            }}>
                                STEP 2
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>📋</span>
                                    <span>이력서 분석</span>
                                </h4>
                                <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                    회원님의 이력서 정보를 조회하여 GPT가 분석합니다
                                </p>
                            </div>
                        </div>

                        {/* Arrow down */}
                        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#667eea', margin: '-5px 0' }}>⬇️</div>

                        {/* Step 3 */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            border: '2px solid #43e97b',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-15px',
                                left: '20px',
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: 'white',
                                padding: '8px 20px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 12px rgba(67, 233, 123, 0.4)'
                            }}>
                                STEP 3
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>✨</span>
                                    <span>맞춤형 자기소개서 생성</span>
                                </h4>
                                <p style={{ fontSize: '0.95rem', color: '#555', margin: 0, fontWeight: '700' }}>
                                    GPT가 회사, 직무, 회원님의 경력을 분석하여 맞춤형 자기소개서를 작성합니다
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 입력 폼 섹션 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontWeight: '600',
                            color: '#2d3748',
                            fontSize: '0.95rem'
                        }}>
                            회사명 <span style={{ color: '#e53e3e' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => {
                                setCompanyName(e.target.value);
                                // 회사명 입력 시 채용공고 조회
                                fetchJobPostings(e.target.value);
                            }}
                            placeholder="예: 네이버, 카카오, 삼성전자, 쿠팡"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontWeight: '600',
                            color: '#2d3748',
                            fontSize: '0.95rem'
                        }}>
                            채용공고 선택 (선택사항)
                        </label>
                        {isLoadingJobs ? (
                            <div style={{
                                padding: '12px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                color: '#666',
                                textAlign: 'center'
                            }}>
                                채용공고 조회 중...
                            </div>
                        ) : (
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                disabled={!companyName.trim() || jobPostings.length === 0}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s',
                                    backgroundColor: (!companyName.trim() || jobPostings.length === 0) ? '#f7fafc' : 'white',
                                    cursor: (!companyName.trim() || jobPostings.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                                onFocus={(e) => {
                                    if (companyName.trim() && jobPostings.length > 0) {
                                        e.currentTarget.style.borderColor = '#667eea';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                                    }
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <option value="">선택 안함 (회사명만 사용)</option>
                                {jobPostings.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.title} {job.category ? `- ${job.category}` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        {companyName.trim() && jobPostings.length === 0 && !isLoadingJobs && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '0.85rem',
                                color: '#718096',
                                fontStyle: 'italic'
                            }}>
                                해당 회사의 채용공고를 찾을 수 없습니다. 회사명만으로 자기소개서를 생성할 수 있습니다.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={generateCoverLetter}
                        disabled={isCoverLetterLoading}
                        style={{
                            width: '100%',
                            background: isCoverLetterLoading
                                ? '#cbd5e0'
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '13px 20px',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isCoverLetterLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isCoverLetterLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isCoverLetterLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isCoverLetterLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            }
                        }}>
                        {isCoverLetterLoading ? '자기소개서 생성 중...' : '자기소개서 생성하기'}
                    </button>
                </div>

                {/* 자기소개서 결과 */}
                {coverLetter && (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                color: '#2d3748',
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                margin: 0
                            }}>
                                <span style={{ color: '#667eea' }}>✨ AI 자기소개서</span>
                            </h3>
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                }}>
                                📋 복사하기
                            </button>
                        </div>
                        <div style={{
                            background: '#f7fafc',
                            borderRadius: '12px',
                            padding: '24px',
                            fontSize: '1rem',
                            color: '#2d3748',
                            lineHeight: '1.8',
                            whiteSpace: 'pre-wrap',
                            border: '2px solid #e2e8f0'
                        }}>
                            {coverLetter}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
