import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export default function JobDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const [job, setJob] = useState(location.state?.job);

    const [companyInfo, setCompanyInfo] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('job'); // 'job', 'company', 'interview'

    useEffect(() => {
        // job이 state로 전달되지 않았거나, job 객체에 상세 정보가 없으면 API로 가져오기
        if (!job && id) {
            fetchJobDetail();
        } else if (job && (!job.job_info && !job.conditions && !job.url)) {
            // job 객체는 있지만 상세 정보가 없는 경우 (저장된 자소서에서 온 경우)
            fetchJobDetail();
        } else if (job) {
            // job 데이터에 이미 회사 정보가 포함되어 있으면 사용
            if (job.industry || job.company_type || job.location) {
                setCompanyInfo(job);
            }
            fetchCompanyData(job.company);
        }
    }, [job, id]);

    const fetchJobDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/job/${id}`);
            const data = await response.json();
            if (data.success && data.job) {
                setJob(data.job);
                // job 데이터에 회사 정보가 포함되어 있으므로 setCompanyInfo 설정
                if (data.job.industry || data.job.company_type || data.job.location) {
                    setCompanyInfo(data.job);
                }
                fetchCompanyData(data.job.company);
            }
        } catch (error) {
            console.error('[JobDetail] Error fetching job:', error);
        }
    };

    const fetchCompanyData = async (companyName) => {
        try {
            setLoading(true);
            console.log('='.repeat(80));
            console.log('[JobDetail] 🔍 API 호출 시작');
            console.log('[JobDetail] API_BASE_URL:', API_BASE_URL);
            console.log('[JobDetail] Company Name:', `"${companyName}"`);
            console.log('[JobDetail] Company Name Length:', companyName.length);
            console.log('='.repeat(80));

            // 회사 정보 조회
            const companyUrl = `${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}`;
            console.log('\n[JobDetail] 📞 회사 정보 API 호출');
            console.log('[JobDetail] URL:', companyUrl);
            const companyRes = await fetch(companyUrl);
            console.log('[JobDetail] Status:', companyRes.status);

            if (!companyRes.ok) {
                console.error('[JobDetail] ❌ HTTP Error:', companyRes.status, companyRes.statusText);
            }

            const companyData = await companyRes.json();
            console.log('[JobDetail] Response:', JSON.stringify(companyData, null, 2));

            if (companyData.success && companyData.company) {
                console.log('[JobDetail] ✅ 회사 정보 설정 완료');
                setCompanyInfo(companyData.company);
            } else {
                console.warn('[JobDetail] ⚠️ 회사 정보 없음 - success:', companyData.success, 'company:', !!companyData.company);
            }

            // 회사 리뷰 조회
            const reviewsUrl = `${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}/reviews?limit=5`;
            console.log('[JobDetail] Reviews URL:', reviewsUrl);
            const reviewsRes = await fetch(reviewsUrl);
            console.log('[JobDetail] Reviews response status:', reviewsRes.status);
            const reviewsData = await reviewsRes.json();
            console.log('[JobDetail] Reviews data:', reviewsData);
            if (reviewsData.success && reviewsData.reviews) {
                setReviews(reviewsData.reviews);
            } else {
                console.log('[JobDetail] No reviews found');
            }

            // 면접 기출문제 조회 (모든 질문 가져오기)
            const questionsUrl = `${API_BASE_URL}/api/company/${encodeURIComponent(companyName)}/interview-questions?limit=1000`;
            console.log('\n[JobDetail] 📞 면접 기출문제 API 호출');
            console.log('[JobDetail] URL:', questionsUrl);
            const questionsRes = await fetch(questionsUrl);
            console.log('[JobDetail] Status:', questionsRes.status);

            if (!questionsRes.ok) {
                console.error('[JobDetail] ❌ HTTP Error:', questionsRes.status, questionsRes.statusText);
            }

            const questionsData = await questionsRes.json();
            console.log('[JobDetail] Response:', JSON.stringify(questionsData, null, 2));

            if (questionsData.success && questionsData.questions) {
                console.log('[JobDetail] ✅ 면접질문 설정 완료 -', questionsData.questions.length, '건');
                setInterviewQuestions(questionsData.questions);
            } else {
                console.warn('[JobDetail] ⚠️ 면접질문 없음 - success:', questionsData.success, 'questions:', questionsData.questions?.length || 0);
            }
        } catch (error) {
            console.error('[JobDetail] Error fetching company data:', error);
            console.error('[JobDetail] Error details:', error.message, error.stack);
        } finally {
            setLoading(false);
        }
    };

    if (!job) {
        return (
            <div style={{
                minHeight: 'calc(100vh - 60px)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '40px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '1.2rem', color: '#666' }}>채용공고를 찾을 수 없습니다.</p>
                    <button
                        onClick={() => navigate('/jobs')}
                        style={{
                            marginTop: '20px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '24px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>
                        채용공고로 돌아가기
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
            paddingBottom: '60px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* 뒤로가기 버튼 */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'white',
                        border: '2px solid rgba(102, 126, 234, 0.3)',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        marginBottom: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#667eea',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#667eea';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateX(-4px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#667eea';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>←</span>
                    <span>뒤로가기</span>
                </button>

                {/* 헤더 */}
                <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    borderRadius: '24px',
                    padding: '24px',
                    marginBottom: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* 장식 배경 요소 */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)',
                        borderRadius: '50%',
                        filter: 'blur(40px)'
                    }}></div>

                    {/* 등록/마감일시 */}
                    {job.registration_info && job.registration_info.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '16px',
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #f5f5f5 0%, #ebebeb 100%)',
                            borderRadius: '16px',
                            border: '1px solid #e0e0e0',
                            position: 'relative',
                            zIndex: 1
                        }}>
                            {job.registration_info.map((info, index) => (
                                <span key={index} style={{
                                    color: info.includes('D-') ? '#d32f2f' : '#555',
                                    fontSize: '1rem',
                                    fontWeight: info.includes('D-') ? '800' : '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {info.includes('D-') && <span style={{ fontSize: '1.2rem' }}>⏰</span>}
                                    {info}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* 회사명 + 제목 */}
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: '0' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px',
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%)',
                            borderRadius: '20px',
                            border: '2px solid rgba(102, 126, 234, 0.25)'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>🏢</span>
                            <span style={{
                                fontSize: '1.3rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>{job.company}</span>
                        </div>
                        <h1 style={{
                            fontSize: '2.2rem',
                            fontWeight: '800',
                            color: '#222',
                            marginBottom: '0',
                            lineHeight: '1.4'
                        }}>{job.title}</h1>
                    </div>
                </div>

                {/* 탭 네비게이션 */}
                <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                    borderRadius: '24px',
                    padding: '8px',
                    marginBottom: '16px',
                    boxShadow: '0 8px 30px rgba(102, 126, 234, 0.15), 0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    gap: '10px',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* 장식 배경 요소 */}
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.04) 100%)',
                        borderRadius: '50%',
                        filter: 'blur(30px)',
                        pointerEvents: 'none'
                    }}></div>

                    <button
                        onClick={() => setActiveTab('job')}
                        style={{
                            flex: 1,
                            background: activeTab === 'job'
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'white',
                            color: activeTab === 'job' ? 'white' : '#555',
                            border: activeTab === 'job' ? 'none' : '2px solid #e0e0e0',
                            padding: '14px 20px',
                            borderRadius: '18px',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: activeTab === 'job'
                                ? '0 6px 20px rgba(102, 126, 234, 0.5), 0 2px 8px rgba(0,0,0,0.1)'
                                : '0 2px 6px rgba(0,0,0,0.05)',
                            position: 'relative',
                            zIndex: 1,
                            transform: activeTab === 'job' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'job') {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'job') {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                            }
                        }}>
                        <span style={{
                            fontSize: '1.4rem',
                            filter: activeTab === 'job' ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                        }}>📋</span>
                        <span style={{ letterSpacing: '-0.5px' }}>채용공고</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('company')}
                        style={{
                            flex: 1,
                            background: activeTab === 'company'
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'white',
                            color: activeTab === 'company' ? 'white' : '#555',
                            border: activeTab === 'company' ? 'none' : '2px solid #e0e0e0',
                            padding: '14px 20px',
                            borderRadius: '18px',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: activeTab === 'company'
                                ? '0 6px 20px rgba(102, 126, 234, 0.5), 0 2px 8px rgba(0,0,0,0.1)'
                                : '0 2px 6px rgba(0,0,0,0.05)',
                            position: 'relative',
                            zIndex: 1,
                            transform: activeTab === 'company' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'company') {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'company') {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                            }
                        }}>
                        <span style={{
                            fontSize: '1.4rem',
                            filter: activeTab === 'company' ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                        }}>🏢</span>
                        <span style={{ letterSpacing: '-0.5px' }}>기업정보</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('interview')}
                        style={{
                            flex: 1,
                            background: activeTab === 'interview'
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'white',
                            color: activeTab === 'interview' ? 'white' : '#555',
                            border: activeTab === 'interview' ? 'none' : '2px solid #e0e0e0',
                            padding: '14px 20px',
                            borderRadius: '18px',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: activeTab === 'interview'
                                ? '0 6px 20px rgba(102, 126, 234, 0.5), 0 2px 8px rgba(0,0,0,0.1)'
                                : '0 2px 6px rgba(0,0,0,0.05)',
                            position: 'relative',
                            zIndex: 1,
                            transform: activeTab === 'interview' ? 'scale(1.02) translateY(-2px)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'interview') {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.15)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'interview') {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                            }
                        }}>
                        <span style={{
                            fontSize: '1.4rem',
                            filter: activeTab === 'interview' ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                        }}>💬</span>
                        <span style={{ letterSpacing: '-0.5px' }}>면접기출문제</span>
                    </button>
                </div>

                {/* 채용공고 탭 */}
                {activeTab === 'job' && (
                <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                    {/* 직무 정보 */}
                    {job.job_description && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '20px',
                                paddingBottom: '12px',
                                borderBottom: '3px solid',
                                borderImage: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%) 1'
                            }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '10px',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>📋</div>
                                <h3 style={{
                                    fontSize: '1.4rem',
                                    fontWeight: '800',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    margin: 0
                                }}>
                                    직무 정보
                                </h3>
                            </div>
                            <div style={{
                                fontSize: '1.05rem',
                                color: '#333',
                                lineHeight: '1.8',
                                background: 'white',
                                padding: '20px 24px',
                                borderRadius: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                border: '1px solid #e0e0e0',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {job.job_description}
                            </div>
                        </div>
                    )}

                    {/* 채용 조건 */}
                    {job.recruitment_conditions && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '16px',
                                paddingBottom: '12px',
                                borderBottom: '3px solid',
                                borderImage: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%) 1'
                            }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                                    borderRadius: '10px',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>✅</div>
                                <h3 style={{
                                    fontSize: '1.4rem',
                                    fontWeight: '800',
                                    background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    margin: 0
                                }}>
                                    채용 조건
                                </h3>
                            </div>
                            <div style={{
                                fontSize: '1.05rem',
                                color: '#333',
                                lineHeight: '1.8',
                                background: 'white',
                                padding: '20px 24px',
                                borderRadius: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                border: '1px solid #e0e0e0',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {job.recruitment_conditions}
                            </div>
                        </div>
                    )}

                    {/* 회사명 검색키 */}
                    {job.company_search_key && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '16px',
                                paddingBottom: '12px',
                                borderBottom: '3px solid',
                                borderImage: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%) 1'
                            }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
                                    borderRadius: '10px',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>🔍</div>
                                <h3 style={{
                                    fontSize: '1.4rem',
                                    fontWeight: '800',
                                    background: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    margin: 0
                                }}>
                                    회사명 검색키
                                </h3>
                            </div>
                            <p style={{
                                fontSize: '1.05rem',
                                color: '#333',
                                background: 'white',
                                padding: '20px 24px',
                                borderRadius: '16px',
                                fontWeight: '600',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                border: '1px solid #e0e0e0'
                            }}>
                                {job.company_search_key}
                            </p>
                        </div>
                    )}

                    {/* 원본 공고 링크 */}
                    {job.url && (
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => window.open(job.url, '_blank')}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '18px 40px',
                                    borderRadius: '30px',
                                    fontSize: '1.15rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                                }}>
                                <span style={{ fontSize: '1.3rem' }}>🔗</span>
                                원본 채용공고 보기
                                <span style={{ fontSize: '1.3rem' }}>→</span>
                            </button>
                        </div>
                    )}
                </div>
                )}

                {/* 기업정보 탭 */}
                {activeTab === 'company' && (
                <>
                {/* 로딩 중 */}
                {loading && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '60px 35px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                        <p style={{ fontSize: '1.2rem', color: '#666', fontWeight: '700' }}>
                            기업정보를 불러오는 중...
                        </p>
                    </div>
                )}

                {/* 기업정보 없음 메시지 */}
                {!companyInfo && !loading && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '60px 35px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '2px dashed #ddd',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
                        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '8px', fontWeight: '700' }}>
                            등록된 기업정보가 없습니다
                        </p>
                        <p style={{ fontSize: '1rem', color: '#999' }}>
                            {job.company}의 기업정보가 곧 업데이트될 예정입니다
                        </p>
                    </div>
                )}

                {/* 회사 정보 */}
                {companyInfo && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '24px',
                        marginTop: '0px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(102, 126, 234, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '28px',
                            paddingBottom: '16px',
                            borderBottom: '3px solid',
                            borderImage: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%) 1'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>🏢</div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0
                            }}>
                                회사 정보
                            </h3>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px'
                        }}>
                            {companyInfo.industry && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>🏭 산업</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.industry}</div>
                                </div>
                            )}
                            {(companyInfo.company_type || companyInfo.company_form) && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>🏛️ 기업형태</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.company_type || companyInfo.company_form}</div>
                                </div>
                            )}
                            {companyInfo.employee_count && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>👥 직원 수</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.employee_count}</div>
                                </div>
                            )}
                            {companyInfo.establishment_date && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>📅 설립일</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.establishment_date}</div>
                                </div>
                            )}
                            {companyInfo.ceo && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>👔 대표이사</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.ceo}</div>
                                </div>
                            )}
                            {companyInfo.location && (
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s',
                                    gridColumn: '1 / -1'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '6px', fontWeight: '600' }}>📍 주소</div>
                                    <div style={{ fontSize: '1.05rem', color: '#333', fontWeight: '600' }}>{companyInfo.location}</div>
                                </div>
                            )}
                            {companyInfo.revenue && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #2196f3',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#1565c0', marginBottom: '6px', fontWeight: '600' }}>💰 매출액</div>
                                    <div style={{ fontSize: '1.05rem', color: '#0d47a1', fontWeight: '700' }}>{companyInfo.revenue}</div>
                                </div>
                            )}
                            {companyInfo.credit_rating && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #ff9800',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#e65100', marginBottom: '6px', fontWeight: '600' }}>⭐ 신용등급</div>
                                    <div style={{ fontSize: '1.05rem', color: '#e65100', fontWeight: '700' }}>{companyInfo.credit_rating}</div>
                                </div>
                            )}
                            {companyInfo.starting_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #4caf50',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💵 초봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#1b5e20', fontWeight: '700' }}>{companyInfo.starting_salary}</div>
                                </div>
                            )}
                            {companyInfo.average_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #4caf50',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginBottom: '6px', fontWeight: '600' }}>💵 평균연봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#1b5e20', fontWeight: '700' }}>{companyInfo.average_salary}</div>
                                </div>
                            )}
                            {companyInfo.industry_average_salary && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid #e91e63',
                                    transition: 'all 0.2s',
                                    gridColumn: '1 / -1'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 30, 99, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                }}>
                                    <div style={{ fontSize: '0.85rem', color: '#ad1457', marginBottom: '6px', fontWeight: '600' }}>📊 업계 평균연봉</div>
                                    <div style={{ fontSize: '1.05rem', color: '#880e4f', fontWeight: '700' }}>{companyInfo.industry_average_salary}</div>
                                </div>
                            )}
                        </div>
                        {(companyInfo.tags && companyInfo.tags.length > 0) && (
                            <div style={{ marginTop: '24px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.9rem', color: '#667eea', marginBottom: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🏷️</span> 회사 태그
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {companyInfo.tags.map((tag, idx) => (
                                        <span key={idx} style={{
                                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                            color: '#1565c0',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            border: '1px solid #2196f3',
                                            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(companyInfo.recommendation_keywords && companyInfo.recommendation_keywords.length > 0) && (
                            <div style={{ marginTop: '16px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.9rem', color: '#7b1fa2', marginBottom: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>✨</span> 추천 키워드
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {companyInfo.recommendation_keywords.map((keyword, idx) => (
                                        <span key={idx} style={{
                                            background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                            color: '#6a1b9a',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            border: '1px solid #9c27b0',
                                            boxShadow: '0 2px 4px rgba(156, 39, 176, 0.2)'
                                        }}>
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 회사 리뷰 */}
                {reviews.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '24px',
                        marginTop: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(255, 193, 7, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '28px',
                            paddingBottom: '16px',
                            borderBottom: '3px solid',
                            borderImage: 'linear-gradient(90deg, #ffc107 0%, #ff9800 100%) 1'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>⭐</div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0
                            }}>
                                회사 리뷰
                            </h3>
                            <span style={{
                                background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                marginLeft: 'auto'
                            }}>
                                {reviews.length}건
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {reviews.map((review, index) => (
                                <div key={index} style={{
                                    background: 'white',
                                    padding: '24px',
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                    border: '2px solid transparent',
                                    transition: 'all 0.3s',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.2)';
                                    e.currentTarget.style.borderColor = '#ffc107';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '0',
                                        left: '0',
                                        width: '5px',
                                        height: '100%',
                                        background: 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)'
                                    }}></div>
                                    {review.rating && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            marginBottom: '12px',
                                            marginLeft: '10px'
                                        }}>
                                            <span style={{ fontSize: '1.3rem', fontWeight: '600' }}>
                                                {'⭐'.repeat(Math.round(parseFloat(review.rating)))}
                                            </span>
                                            <span style={{
                                                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                                color: '#f57c00',
                                                padding: '6px 14px',
                                                borderRadius: '16px',
                                                fontSize: '0.95rem',
                                                fontWeight: '700',
                                                border: '1px solid #ff9800'
                                            }}>{review.rating}점</span>
                                        </div>
                                    )}
                                    {review.position && (
                                        <div style={{
                                            fontSize: '0.95rem',
                                            color: '#666',
                                            marginBottom: '16px',
                                            marginLeft: '10px',
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#f5f5f5',
                                            padding: '6px 12px',
                                            borderRadius: '12px'
                                        }}>
                                            <span>👤</span> {review.position}
                                        </div>
                                    )}
                                    {review.pros && (
                                        <div style={{
                                            marginBottom: '12px',
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%)',
                                            borderRadius: '12px',
                                            border: '1px solid #4caf50',
                                            marginLeft: '10px'
                                        }}>
                                            <div style={{
                                                fontWeight: '700',
                                                color: '#2e7d32',
                                                marginBottom: '8px',
                                                fontSize: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>👍</span> 장점
                                            </div>
                                            <span style={{ color: '#333', fontSize: '1rem', lineHeight: '1.6' }}>{review.pros}</span>
                                        </div>
                                    )}
                                    {review.cons && (
                                        <div style={{
                                            padding: '16px',
                                            background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
                                            borderRadius: '12px',
                                            border: '1px solid #f44336',
                                            marginLeft: '10px'
                                        }}>
                                            <div style={{
                                                fontWeight: '700',
                                                color: '#c62828',
                                                marginBottom: '8px',
                                                fontSize: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>👎</span> 단점
                                            </div>
                                            <span style={{ color: '#333', fontSize: '1rem', lineHeight: '1.6' }}>{review.cons}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </>
                )}

                {/* 면접문제 탭 */}
                {activeTab === 'interview' && (
                <>
                {loading && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '60px 35px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                        <p style={{ fontSize: '1.2rem', color: '#666', fontWeight: '700' }}>
                            면접기출문제를 불러오는 중...
                        </p>
                    </div>
                )}
                {!loading && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(118, 75, 162, 0.1)'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '28px',
                            paddingBottom: '16px',
                            borderBottom: '3px solid',
                            borderImage: 'linear-gradient(90deg, #764ba2 0%, #667eea 100%) 1'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>💬</div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: 0
                            }}>
                                면접 기출문제
                            </h3>
                            <span style={{
                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                marginLeft: 'auto'
                            }}>
                                {interviewQuestions.length}건
                            </span>
                        </div>
                        {interviewQuestions.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {interviewQuestions.map((item, index) => (
                                    <div key={index} style={{
                                        background: 'white',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        border: '1px solid #e0e0e0',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(118, 75, 162, 0.15)';
                                        e.currentTarget.style.borderColor = '#764ba2';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                    }}>
                                        {/* 첫 줄: 번호 + 직무 + 시기 + 경력 */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '10px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{
                                                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                                                color: 'white',
                                                minWidth: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.9rem',
                                                fontWeight: '800',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>
                                            {item.position && (
                                                <span style={{
                                                    background: '#f3e5f5',
                                                    color: '#6a1b9a',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '700'
                                                }}>
                                                    📌 {item.position}
                                                </span>
                                            )}
                                            {item.period && (
                                                <span style={{
                                                    background: '#e3f2fd',
                                                    color: '#1976d2',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    📅 {item.period}
                                                </span>
                                            )}
                                            {item.experience && (
                                                <span style={{
                                                    background: '#fff3e0',
                                                    color: '#f57c00',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600'
                                                }}>
                                                    👤 {item.experience}
                                                </span>
                                            )}
                                        </div>
                                        {/* 질문 */}
                                        {item.question && (
                                            <div style={{
                                                fontSize: '1rem',
                                                color: '#333',
                                                lineHeight: '1.6',
                                                fontWeight: '500',
                                                padding: '12px',
                                                background: '#fafafa',
                                                borderRadius: '8px',
                                                borderLeft: '3px solid #764ba2'
                                            }}>
                                                <span style={{ fontWeight: '800', color: '#764ba2', fontSize: '1.1rem' }}>Q. </span>
                                                {item.question}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                background: 'white',
                                borderRadius: '16px',
                                border: '2px dashed #ddd'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💭</div>
                                <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
                                    아직 등록된 면접 기출문제가 없습니다
                                </p>
                                <p style={{ fontSize: '0.95rem', color: '#999' }}>
                                    {job.company}의 면접 질문이 곧 업데이트될 예정입니다
                                </p>
                            </div>
                        )}
                    </div>
                )}
                </>
                )}
            </div>
        </div>
    );
}
