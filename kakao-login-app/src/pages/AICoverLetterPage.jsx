import { useState, useEffect, useRef } from 'react';
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
    const debounceTimer = useRef(null);
    const [coverLetter, setCoverLetter] = useState(null);
    const [isCoverLetterLoading, setIsCoverLetterLoading] = useState(false);
    const [userCoverLetter, setUserCoverLetter] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [isRevisedCoverLetterLoading, setIsRevisedCoverLetterLoading] = useState(false);
    const [selectedJobForView, setSelectedJobForView] = useState(null);
    const [isJobPopupOpen, setIsJobPopupOpen] = useState(false);

    // 자소서 저장/불러오기 관련 state
    const [savedCoverLetters, setSavedCoverLetters] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [selectedCoverLetterId, setSelectedCoverLetterId] = useState(null);

    useEffect(() => {
        checkLogin();
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadSavedCoverLetters();
        }
    }, [currentUser]);

    // 컴포넌트 언마운트 시 타이머 정리
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
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

                // 이력서 정보 확인
                try {
                    const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${userData.user.id}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        // 이력서 필수 정보가 없는 경우
                        if (!profileData.profile ||
                            (!profileData.profile.preferred_jobs &&
                             !profileData.profile.experience &&
                             (!profileData.profile.skills || profileData.profile.skills.length === 0))) {
                            setError('이력서를 먼저 작성해주세요.');
                        }
                    }
                } catch (profileErr) {
                    console.warn('[AI자소서] 이력서 확인 실패:', profileErr);
                }
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

            // 선택한 채용공고가 있으면 해당 채용공고의 회사명 사용, 없으면 입력한 회사명 사용
            let finalCompany = companyName.trim();
            if (selectedJobId) {
                const selectedJob = jobPostings.find(job => job.id.toString() === selectedJobId);
                if (selectedJob && selectedJob.company) {
                    finalCompany = selectedJob.company;
                }
            }

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letter`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    company: finalCompany,
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

    const getFeedback = async () => {
        if (!userCoverLetter.trim()) {
            alert('자기소개서 내용을 입력해주세요.');
            return;
        }

        setIsFeedbackLoading(true);
        setFeedback(null);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letter-feedback`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    company: companyName.trim(),
                    cover_letter: userCoverLetter.trim()
                })
            });

            if (!response.ok) {
                throw new Error('피드백 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.feedback) {
                setFeedback(data.feedback);
            } else {
                alert('피드백을 생성할 수 없습니다.');
            }
        } catch (err) {
            console.error('[피드백 생성] 오류:', err);
            alert('피드백 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsFeedbackLoading(false);
        }
    };

    const openJobPopup = (job) => {
        setSelectedJobForView(job);
        setIsJobPopupOpen(true);
    };

    const closeJobPopup = () => {
        setIsJobPopupOpen(false);
        setSelectedJobForView(null);
    };

    const generateRevisedCoverLetter = async () => {
        if (!userCoverLetter.trim() || !feedback) {
            alert('자기소개서 내용과 피드백이 필요합니다.');
            return;
        }

        setIsRevisedCoverLetterLoading(true);

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letter-revised`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser?.id,
                    company: companyName.trim(),
                    cover_letter: userCoverLetter.trim(),
                    feedback: feedback
                })
            });

            if (!response.ok) {
                throw new Error('수정된 자소서 생성에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success && data.revisedCoverLetter) {
                setUserCoverLetter(data.revisedCoverLetter);
                setFeedback(null); // 피드백 초기화하여 버튼을 "AI 피드백 받기"로 변경
                alert('개선된 자소서가 자기소개서 입력란에 입력되었습니다.\n\n새로운 자기소개서에 대해 "AI 피드백 받기" 버튼을 다시 클릭하실 수 있습니다.');
            } else {
                alert('수정된 자소서를 생성할 수 없습니다.');
            }
        } catch (err) {
            console.error('[수정된 자소서 생성] 오류:', err);
            alert('수정된 자소서 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsRevisedCoverLetterLoading(false);
        }
    };

    // 저장된 자소서 목록 불러오기
    const loadSavedCoverLetters = async () => {
        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letters/${currentUser.id}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSavedCoverLetters(data.cover_letters);
                }
            }
        } catch (err) {
            console.error('[자소서 목록 조회] 오류:', err);
        }
    };

    // 자소서 저장
    const saveCoverLetter = async () => {
        if (!userCoverLetter.trim()) {
            alert('저장할 자소서 내용이 없습니다.');
            return;
        }

        if (!saveTitle.trim()) {
            alert('제목을 입력해주세요.');
            return;
        }

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letters/save`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    company: companyName.trim() || null,
                    job_id: selectedJobId || null,
                    title: saveTitle.trim(),
                    content: userCoverLetter.trim()
                })
            });

            if (!response.ok) {
                throw new Error('자소서 저장에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success) {
                alert('자소서가 저장되었습니다!');
                setShowSaveModal(false);
                setSaveTitle('');
                loadSavedCoverLetters(); // 목록 새로고침
            }
        } catch (err) {
            console.error('[자소서 저장] 오류:', err);
            alert('자소서 저장에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 저장된 자소서 불러오기
    const loadCoverLetter = async (id) => {
        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letters/detail/${id}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('자소서 불러오기에 실패했습니다.');
            }

            const data = await response.json();

            if (data.success && data.cover_letter) {
                const coverLetter = data.cover_letter;

                // 자소서 내용 설정
                setUserCoverLetter(coverLetter.content);

                // AI 생성 자소서 숨기기
                setCoverLetter(null);

                // 회사명 설정
                const company = coverLetter.company || '';
                setCompanyName(company);

                // 채용공고가 있으면 해당 채용공고만 jobPostings에 설정
                if (coverLetter.job_id && coverLetter.job_title) {
                    const jobData = {
                        id: coverLetter.job_id,
                        title: coverLetter.job_title,
                        company: coverLetter.company,
                        category: coverLetter.job_category,
                        job_info: coverLetter.job_info,
                        conditions: coverLetter.conditions,
                        registration_info: coverLetter.registration_info,
                        url: coverLetter.job_url
                    };

                    // 선택된 채용공고 정보만 배열에 넣기
                    setJobPostings([jobData]);
                    setSelectedJobId(coverLetter.job_id.toString());
                    setIsLoadingJobs(false); // 로딩 상태 false로 설정

                } else {
                    // 채용공고가 없으면 빈 배열
                    setJobPostings([]);
                    setSelectedJobId('');
                    setIsLoadingJobs(false); // 로딩 상태 false로 설정
                }

                setSelectedCoverLetterId(id);
                setShowLoadModal(false);
                alert('자소서를 불러왔습니다!');
            }
        } catch (err) {
            console.error('[자소서 불러오기] 오류:', err);
            alert('자소서 불러오기에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 자소서 삭제
    const deleteCoverLetter = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letters/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('자소서 삭제에 실패했습니다.');
            }

            const data = await response.json();
            if (data.success) {
                alert('자소서가 삭제되었습니다.');
                loadSavedCoverLetters(); // 목록 새로고침
                if (selectedCoverLetterId === id) {
                    setSelectedCoverLetterId(null);
                }
            }
        } catch (err) {
            console.error('[자소서 삭제] 오류:', err);
            alert('자소서 삭제에 실패했습니다. 다시 시도해주세요.');
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

    if (error === '이력서를 먼저 작성해주세요.') {
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
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📋</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        color: '#333',
                        marginBottom: '15px',
                        fontWeight: '700'
                    }}>이력서를 먼저 작성해주세요</h2>
                    <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                        AI 자기소개서 생성 서비스를 이용하려면<br/>
                        이력서 정보가 필요합니다.
                    </p>
                    <button
                        onClick={() => navigate('/resume')}
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
                        이력서 작성하러 가기
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
                                GPT가 회원님의 이력서와 지원하는 회사와 채용공고를 분석하여 맞춤형 자기소개서 작성을 지원해드립니다.
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
                                const value = e.target.value;
                                setCompanyName(value);

                                // 이전 타이머 취소
                                if (debounceTimer.current) {
                                    clearTimeout(debounceTimer.current);
                                }

                                // 500ms 후에 채용공고 조회
                                debounceTimer.current = setTimeout(() => {
                                    fetchJobPostings(value);
                                }, 500);
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
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#2d3748',
                            fontSize: '0.95rem'
                        }}>
                            {companyName.trim() ? `[${companyName.trim()}] 채용공고` : '채용공고 선택 (선택사항)'}
                        </label>
                        {isLoadingJobs ? (
                            <div style={{
                                padding: '16px 14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                color: '#666',
                                textAlign: 'center',
                                background: '#f7fafc'
                            }}>
                                📋 채용공고 조회 중...
                            </div>
                        ) : jobPostings.length > 0 ? (
                            <div>
                                {/* 선택 안함 옵션 - 항상 표시 */}
                                {!selectedJobId && (
                                    <div
                                        onClick={() => setSelectedJobId('')}
                                        style={{
                                            padding: '14px',
                                            border: selectedJobId === '' ? '2px solid #667eea' : '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '0.95rem',
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            background: selectedJobId === '' ? '#f0f4ff' : 'white',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedJobId !== '') {
                                                e.currentTarget.style.background = '#f7fafc';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedJobId !== '') {
                                                e.currentTarget.style.background = 'white';
                                            }
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontWeight: selectedJobId === '' ? '600' : '500'
                                        }}>
                                            <input
                                                type="radio"
                                                checked={selectedJobId === ''}
                                                onChange={() => {}}
                                                style={{ cursor: 'pointer', pointerEvents: 'none' }}
                                            />
                                            <span style={{ color: '#2d3748' }}>선택 안함 (회사명만 사용)</span>
                                        </div>
                                    </div>
                                )}

                                {/* 채용공고가 선택된 경우: 선택된 항목만 표시 */}
                                {selectedJobId && selectedJobId !== '' ? (
                                    <div>
                                        {jobPostings
                                            .filter(job => job.id.toString() === selectedJobId)
                                            .map((job) => (
                                                <div
                                                    key={job.id}
                                                    style={{
                                                        padding: '14px',
                                                        border: '2px solid #667eea',
                                                        borderRadius: '10px',
                                                        fontSize: '0.95rem',
                                                        background: '#f0f4ff',
                                                        transition: 'all 0.2s',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setSelectedJobId('')}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            flex: 1
                                                        }}>
                                                            <input
                                                                type="radio"
                                                                checked={true}
                                                                readOnly
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{
                                                                    color: '#2d3748',
                                                                    fontWeight: '600',
                                                                    marginBottom: '2px'
                                                                }}>
                                                                    [{job.company}] {job.title}
                                                                </div>
                                                                {job.category && (
                                                                    <div style={{
                                                                        fontSize: '0.85rem',
                                                                        color: '#718096'
                                                                    }}>
                                                                        {job.category}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openJobPopup(job);
                                                            }}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '8px 16px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(66, 153, 225, 0.4)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            📄 상세보기
                                                        </button>
                                                    </div>
                                                    <div style={{
                                                        marginTop: '8px',
                                                        fontSize: '0.85rem',
                                                        color: '#667eea',
                                                        textAlign: 'center',
                                                        fontWeight: '600'
                                                    }}>
                                                        ↑ 클릭하여 다른 공고 선택하기
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    /* 채용공고 목록 - 아무것도 선택되지 않은 경우 */
                                    <div style={{
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '10px',
                                        padding: '8px'
                                    }}>
                                        {jobPostings.map((job) => (
                                            <div
                                                key={job.id}
                                                style={{
                                                    padding: '12px',
                                                    border: selectedJobId === job.id.toString() ? '2px solid #667eea' : '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    fontSize: '0.95rem',
                                                    marginBottom: '8px',
                                                    background: selectedJobId === job.id.toString() ? '#f0f4ff' : 'white',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => {
                                                    // 상세보기 버튼 클릭이 아닌 경우에만 선택
                                                    const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
                                                    if (!isButton) {
                                                        // 디바운스 타이머 취소 (리스트 다시 로딩 방지)
                                                        if (debounceTimer.current) {
                                                            clearTimeout(debounceTimer.current);
                                                        }
                                                        setSelectedJobId(job.id.toString());
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedJobId !== job.id.toString()) {
                                                        e.currentTarget.style.background = '#f7fafc';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedJobId !== job.id.toString()) {
                                                        e.currentTarget.style.background = 'white';
                                                    }
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        flex: 1
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        checked={selectedJobId === job.id.toString()}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            // 디바운스 타이머 취소 (리스트 다시 로딩 방지)
                                                            if (debounceTimer.current) {
                                                                clearTimeout(debounceTimer.current);
                                                            }
                                                            setSelectedJobId(job.id.toString());
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            color: '#2d3748',
                                                            fontWeight: selectedJobId === job.id.toString() ? '600' : '500',
                                                            marginBottom: '2px'
                                                        }}>
                                                            [{job.company}] {job.title}
                                                        </div>
                                                        {job.category && (
                                                            <div style={{
                                                                fontSize: '0.85rem',
                                                                color: '#718096'
                                                            }}>
                                                                {job.category}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openJobPopup(job);
                                                    }}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(66, 153, 225, 0.4)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    📄 상세보기
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            companyName.trim() && (
                                <div style={{
                                    padding: '16px',
                                    border: '2px solid #feebc8',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    color: '#744210',
                                    background: '#fffaf0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⚠️</span>
                                    <span>해당 회사의 채용공고를 찾을 수 없습니다.</span>
                                </div>
                            )
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
                        {isCoverLetterLoading ? 'AI 자소서 생성 중...' : 'AI 자소서 생성'}
                    </button>
                </div>

                {/* 자기소개서 결과 */}
                {coverLetter && (
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        marginBottom: '20px',
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

                {/* 자소서 작성 및 피드백 섹션 */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '30px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
                }}>
                    <h3 style={{
                        color: '#2d3748',
                        fontSize: '1.3rem',
                        fontWeight: '700',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>✍️</span>
                        <span>자소서 작성 및 피드백</span>
                    </h3>

                    <div style={{ marginBottom: '18px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#2d3748',
                            fontSize: '0.95rem'
                        }}>
                            자기소개서 내용
                        </label>
                        <textarea
                            value={userCoverLetter}
                            onChange={(e) => setUserCoverLetter(e.target.value)}
                            placeholder="작성하신 자기소개서를 입력하세요. AI가 피드백을 제공합니다."
                            style={{
                                width: '100%',
                                minHeight: '200px',
                                padding: '14px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                                lineHeight: '1.6',
                                resize: 'vertical'
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

                        {/* 저장/불러오기 버튼 */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '10px'
                        }}>
                            <button
                                onClick={() => setShowSaveModal(true)}
                                disabled={!userCoverLetter.trim()}
                                style={{
                                    flex: 1,
                                    background: userCoverLetter.trim() ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : '#cbd5e0',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: userCoverLetter.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (userCoverLetter.trim()) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 172, 254, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                💾 저장하기
                            </button>
                            <button
                                onClick={() => setShowLoadModal(true)}
                                disabled={savedCoverLetters.length === 0}
                                style={{
                                    flex: 1,
                                    background: savedCoverLetters.length > 0 ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : '#cbd5e0',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: savedCoverLetters.length > 0 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (savedCoverLetters.length > 0) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(250, 112, 154, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                📂 불러오기 ({savedCoverLetters.length})
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={getFeedback}
                        disabled={isFeedbackLoading}
                        style={{
                            width: '100%',
                            background: isFeedbackLoading
                                ? '#cbd5e0'
                                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '13px 20px',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isFeedbackLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isFeedbackLoading ? 'none' : '0 4px 12px rgba(240, 147, 251, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isFeedbackLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(240, 147, 251, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isFeedbackLoading) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(240, 147, 251, 0.3)';
                            }
                        }}>
                        {isFeedbackLoading ? 'AI 피드백 생성 중...' : 'AI 피드백 받기'}
                    </button>

                    {/* 피드백 결과 */}
                    {feedback && (
                        <div style={{
                            marginTop: '24px',
                            background: '#f0f9ff',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '2px solid #bfdbfe'
                        }}>
                            <h4 style={{
                                color: '#1e40af',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>💡</span>
                                <span>AI 피드백</span>
                            </h4>
                            <div style={{
                                fontSize: '0.95rem',
                                color: '#1e3a8a',
                                lineHeight: '1.8',
                                whiteSpace: 'pre-wrap',
                                marginBottom: '16px'
                            }}>
                                {feedback}
                            </div>
                            <button
                                onClick={generateRevisedCoverLetter}
                                disabled={isRevisedCoverLetterLoading}
                                style={{
                                    width: '100%',
                                    background: isRevisedCoverLetterLoading
                                        ? '#cbd5e0'
                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '13px 20px',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: isRevisedCoverLetterLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isRevisedCoverLetterLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isRevisedCoverLetterLoading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isRevisedCoverLetterLoading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                    }
                                }}>
                                {isRevisedCoverLetterLoading ? 'AI 피드백 반영한 자소서 생성 중...' : 'AI 피드백 반영한 자소서 생성'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 채용공고 상세보기 팝업 */}
            {isJobPopupOpen && selectedJobForView && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '10px'
                    }}
                    onClick={closeJobPopup}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 팝업 헤더 */}
                        <div style={{
                            padding: '24px',
                            borderBottom: '2px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '16px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{
                                    color: '#2d3748',
                                    fontSize: '1.4rem',
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                    lineHeight: '1.4'
                                }}>
                                    {selectedJobForView.title}
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    fontSize: '0.9rem',
                                    color: '#718096'
                                }}>
                                    <span style={{
                                        background: '#e6fffa',
                                        color: '#047857',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontWeight: '600'
                                    }}>
                                        {selectedJobForView.company}
                                    </span>
                                    {selectedJobForView.category && (
                                        <span style={{
                                            background: '#f0f4ff',
                                            color: '#4c51bf',
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontWeight: '600'
                                        }}>
                                            {selectedJobForView.category}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={closeJobPopup}
                                style={{
                                    background: '#f7fafc',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '36px',
                                    height: '36px',
                                    cursor: 'pointer',
                                    fontSize: '1.3rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f7fafc';
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 팝업 내용 */}
                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            {/* 채용 정보 */}
                            {selectedJobForView.job_info && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{
                                        color: '#2d3748',
                                        fontSize: '1.1rem',
                                        fontWeight: '700',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>📋</span>
                                        <span>채용 정보</span>
                                    </h3>
                                    <div style={{
                                        background: '#f7fafc',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        fontSize: '0.95rem',
                                        color: '#2d3748',
                                        lineHeight: '1.8',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {selectedJobForView.job_info}
                                    </div>
                                </div>
                            )}

                            {/* 지원 조건 */}
                            {selectedJobForView.conditions && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{
                                        color: '#2d3748',
                                        fontSize: '1.1rem',
                                        fontWeight: '700',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>✅</span>
                                        <span>지원 조건</span>
                                    </h3>
                                    <div style={{
                                        background: '#fffaf0',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        fontSize: '0.95rem',
                                        color: '#2d3748',
                                        lineHeight: '1.8',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {selectedJobForView.conditions}
                                    </div>
                                </div>
                            )}

                            {/* 등록 정보 */}
                            {selectedJobForView.registration_info && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{
                                        color: '#2d3748',
                                        fontSize: '1.1rem',
                                        fontWeight: '700',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>📝</span>
                                        <span>등록 정보</span>
                                    </h3>
                                    <div style={{
                                        background: '#f0f9ff',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        fontSize: '0.95rem',
                                        color: '#2d3748',
                                        lineHeight: '1.8',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {selectedJobForView.registration_info}
                                    </div>
                                </div>
                            )}

                            {/* 채용 공고 URL */}
                            {selectedJobForView.url && (
                                <div style={{ marginBottom: '16px' }}>
                                    <h3 style={{
                                        color: '#2d3748',
                                        fontSize: '1.1rem',
                                        fontWeight: '700',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>🔗</span>
                                        <span>채용 공고 링크</span>
                                    </h3>
                                    <a
                                        href={selectedJobForView.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-block',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
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
                                        }}
                                    >
                                        🌐 원본 공고 보러가기
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 저장 모달 */}
            {showSaveModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}>
                        <h2 style={{ marginBottom: '20px', fontSize: '1.5rem', color: '#333' }}>자소서 저장</h2>
                        <input
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={saveTitle}
                            onChange={(e) => setSaveTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                marginBottom: '20px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setShowSaveModal(false);
                                    setSaveTitle('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#e2e8f0',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={saveCoverLetter}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 불러오기 모달 */}
            {showLoadModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '0',
                        maxWidth: '700px',
                        width: '100%',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* 헤더 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '25px 30px',
                            borderRadius: '24px 24px 0 0'
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.6rem',
                                color: 'white',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                📚 저장된 자소서
                                <span style={{
                                    background: 'rgba(255, 255, 255, 0.25)',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>
                                    {savedCoverLetters.length}개
                                </span>
                            </h2>
                        </div>

                        {/* 리스트 영역 */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '20px 30px'
                        }}>
                            {savedCoverLetters.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px 20px',
                                    color: '#94a3b8'
                                }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📝</div>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>
                                        저장된 자소서가 없습니다
                                    </p>
                                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        작성한 자소서를 저장해보세요
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {savedCoverLetters.map((letter, index) => {
                                        // UTC 시간을 한국시간(UTC+9)으로 변환
                                        const utcDate = new Date(letter.created_at);
                                        const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
                                        const year = kstDate.getFullYear();
                                        const month = String(kstDate.getMonth() + 1).padStart(2, '0');
                                        const day = String(kstDate.getDate()).padStart(2, '0');
                                        const hours = String(kstDate.getHours()).padStart(2, '0');
                                        const minutes = String(kstDate.getMinutes()).padStart(2, '0');
                                        const timeText = `${year}-${month}-${day} ${hours}:${minutes}`;

                                        return (
                                            <div
                                                key={letter.id}
                                                style={{
                                                    padding: '20px',
                                                    border: selectedCoverLetterId === letter.id
                                                        ? '2px solid #667eea'
                                                        : '2px solid #e2e8f0',
                                                    borderRadius: '16px',
                                                    background: selectedCoverLetterId === letter.id
                                                        ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)'
                                                        : 'white',
                                                    transition: 'all 0.3s ease',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedCoverLetterId !== letter.id) {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                {/* 순번 뱃지 */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    left: '12px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                                                }}>
                                                    {index + 1}
                                                </div>

                                                <div style={{ paddingLeft: '36px' }}>
                                                    {/* 제목 */}
                                                    <h3 style={{
                                                        margin: '0 0 10px 0',
                                                        fontSize: '1.15rem',
                                                        color: '#1e293b',
                                                        fontWeight: '700',
                                                        lineHeight: '1.4',
                                                        paddingRight: '120px'
                                                    }}>
                                                        {letter.title}
                                                    </h3>

                                                    {/* 회사명 및 채용공고 */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginBottom: '10px',
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        {letter.company && (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '6px 12px',
                                                                background: 'rgba(102, 126, 234, 0.1)',
                                                                borderRadius: '8px'
                                                            }}>
                                                                <span style={{ fontSize: '0.85rem' }}>🏢</span>
                                                                <span style={{
                                                                    fontSize: '0.9rem',
                                                                    color: '#667eea',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {letter.company}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {letter.job_title && (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '6px 12px',
                                                                background: 'rgba(139, 92, 246, 0.1)',
                                                                borderRadius: '8px'
                                                            }}>
                                                                <span style={{ fontSize: '0.85rem' }}>📋</span>
                                                                <span style={{
                                                                    fontSize: '0.9rem',
                                                                    color: '#8b5cf6',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {letter.job_title}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 저장일시 */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        color: '#94a3b8',
                                                        fontSize: '0.85rem',
                                                        marginTop: '8px'
                                                    }}>
                                                        <span>🕐</span>
                                                        <span style={{ fontWeight: '500' }}>
                                                            저장일시: {timeText}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 버튼 영역 */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '20px',
                                                    right: '20px',
                                                    display: 'flex',
                                                    gap: '8px'
                                                }}>
                                                    <button
                                                        onClick={() => loadCoverLetter(letter.id)}
                                                        style={{
                                                            padding: '10px 18px',
                                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                                        }}
                                                    >
                                                        📂 불러오기
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCoverLetter(letter.id)}
                                                        style={{
                                                            padding: '10px 14px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 하단 닫기 버튼 */}
                        <div style={{
                            padding: '20px 30px',
                            borderTop: '1px solid #e2e8f0',
                            background: '#f8fafc'
                        }}>
                            <button
                                onClick={() => setShowLoadModal(false)}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: 'white',
                                    color: '#64748b',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
