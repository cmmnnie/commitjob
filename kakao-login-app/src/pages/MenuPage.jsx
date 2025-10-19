import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

export default function MenuPage() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'login' or 'resume'
    const [targetPath, setTargetPath] = useState('');
    const menuItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '20px',
        background: 'white',
        borderRadius: '15px',
        marginBottom: '15px',
        textDecoration: 'none',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
    };

    const menuIconStyle = {
        fontSize: '3rem',
        flexShrink: 0,
        width: '60px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const menuContentStyle = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    };

    const menuTitleStyle = {
        fontSize: '1.2rem',
        fontWeight: '700',
        color: '#333',
        lineHeight: '1.3'
    };

    const menuDescStyle = {
        fontSize: '0.95rem',
        color: '#666',
        lineHeight: '1.5',
        fontWeight: '600'
    };

    const handleAIMenuClick = async (e, path) => {
        e.preventDefault();

        // 로그인 확인
        const token = localStorage.getItem('app_session');
        if (!token) {
            setModalType('login');
            setTargetPath(path);
            setShowModal(true);
            return;
        }

        try {
            // 사용자 정보 조회
            const userResponse = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                setModalType('login');
                setTargetPath(path);
                setShowModal(true);
                return;
            }

            const userData = await userResponse.json();
            const user = userData.user;

            if (!user) {
                setModalType('login');
                setTargetPath(path);
                setShowModal(true);
                return;
            }

            // user_profiles 테이블에서 이력서 정보 확인
            const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${user.id}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });


            if (!profileResponse.ok) {
                setModalType('resume');
                setTargetPath(path);
                setShowModal(true);
                return;
            }

            const profileData = await profileResponse.json();

            // 이력서 필수 정보가 없는 경우
            if (!profileData.profile ||
                (!profileData.profile.preferred_jobs &&
                 !profileData.profile.experience &&
                 (!profileData.profile.skills || profileData.profile.skills.length === 0))) {
                setModalType('resume');
                setTargetPath(path);
                setShowModal(true);
                return;
            }

            // 이력서가 있으면 해당 페이지로 이동
            navigate(path);
        } catch (err) {
            console.error('[메뉴] 확인 오류:', err);
            navigate(path); // 오류 발생 시에도 페이지로 이동 (각 페이지에서 재확인)
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setModalType('');
        setTargetPath('');
    };

    const handleModalAction = () => {
        closeModal();
        if (modalType === 'login') {
            // 로그인이 필요한 경우 로그인 페이지로
            navigate('/?view=login');
        } else {
            // 이력서가 필요한 경우 이력서 페이지로
            navigate('/resume');
        }
    };

    return (
        <div style={{
            padding: '20px',
            paddingBottom: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: 'calc(100vh - 60px)'
        }}>
            <div style={{
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    color: 'white',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    textAlign: 'center'
                }}>전체 메뉴</h1>

                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '15px',
                        opacity: 0.9
                    }}>메인 기능</h2>

                    <a href="/ai-recommendation" onClick={(e) => handleAIMenuClick(e, '/ai-recommendation')} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>🤖</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 채용 추천</div>
                            <div style={menuDescStyle}>GPT가 회원님 이력서와 CommitJob 채용공고를 매칭하여 매칭률 높은 채용공고를 추천해드립니다.</div>
                        </div>
                    </a>

                    <a href="/ai-interview" onClick={(e) => handleAIMenuClick(e, '/ai-interview')} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>🎤</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 면접 준비</div>
                            <div style={menuDescStyle}>GPT가 맞춤형 면접 질문, 모범 답변, 입력한 답변에 대한 피드백을 해드립니다.</div>
                        </div>
                    </a>

                    <a href="/jobs" onClick={(e) => { e.preventDefault(); navigate('/jobs'); }} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>💼</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>채용공고</div>
                            <div style={menuDescStyle}>최신 빅데이터/AI, IT개발 채용공고를 확인하고 지원하세요.</div>
                        </div>
                    </a>

                    <a href="/ai-cover-letter" onClick={(e) => handleAIMenuClick(e, '/ai-cover-letter')} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>📝</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>AI 자소서 관리</div>
                            <div style={menuDescStyle}>GPT가 회원님의 이력서와 지원하는 회사와 채용공고를 분석하여 맞춤형 자기소개서 작성을 지원해드립니다.</div>
                        </div>
                    </a>

                    <a href="/resume" onClick={(e) => { e.preventDefault(); navigate('/resume'); }} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>📋</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>이력서 관리</div>
                            <div style={menuDescStyle}>이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드리고 AI 자소서 작성을 지원해드립니다.</div>
                        </div>
                    </a>

                    <a href="/coding-test" onClick={(e) => { e.preventDefault(); navigate('/coding-test'); }} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>💻</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>코딩 테스트</div>
                            <div style={menuDescStyle}>기업별 코딩 테스트 문제를 풀어보고 실력을 향상시킬 수 있습니다. 회사를 선택하면 해당 기업의 기출 문제들을 확인하고 직접 코드를 작성할 수 있습니다.</div>
                        </div>
                    </a>
                </div>
            </div>

            {/* 모달 */}
            {showModal && (
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
                        padding: '40px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        {modalType === 'login' ? (
                            /* 로그인 필요 모달 */
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔐</div>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    color: '#333',
                                    marginBottom: '20px',
                                    fontWeight: '700',
                                    lineHeight: '1.5'
                                }}>
                                    로그인이 필요합니다.
                                </h2>
                                <p style={{
                                    color: '#666',
                                    marginBottom: '30px',
                                    lineHeight: '1.6',
                                    fontSize: '1rem'
                                }}>
                                    AI 채용 추천, AI 면접, AI 자소서는<br/>
                                    로그인 후 이용하실 수 있습니다.
                                </p>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    justifyContent: 'center'
                                }}>
                                    <button
                                        onClick={closeModal}
                                        style={{
                                            flex: 1,
                                            background: '#e0e0e0',
                                            color: '#666',
                                            border: 'none',
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#d0d0d0';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#e0e0e0';
                                        }}
                                    >
                                        닫기
                                    </button>
                                    <button
                                        onClick={handleModalAction}
                                        style={{
                                            flex: 1.5,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '700',
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
                                        }}
                                    >
                                        로그인하기
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* 이력서 필요 모달 */
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📋</div>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    color: '#333',
                                    marginBottom: '20px',
                                    fontWeight: '700',
                                    lineHeight: '1.5'
                                }}>
                                    AI 채용 추천, AI 면접,<br/>
                                    AI 자소서는<br/>
                                    이력서 작성 후<br/>
                                    이용 가능하십니다.
                                </h2>
                                <p style={{
                                    color: '#666',
                                    marginBottom: '30px',
                                    lineHeight: '1.6',
                                    fontSize: '1rem'
                                }}>
                                    이력서를 작성하시면 맞춤형 AI 서비스를<br/>
                                    이용하실 수 있습니다.
                                </p>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    justifyContent: 'center'
                                }}>
                                    <button
                                        onClick={closeModal}
                                        style={{
                                            flex: 1,
                                            background: '#e0e0e0',
                                            color: '#666',
                                            border: 'none',
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#d0d0d0';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#e0e0e0';
                                        }}
                                    >
                                        닫기
                                    </button>
                                    <button
                                        onClick={handleModalAction}
                                        style={{
                                            flex: 1.5,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '14px 20px',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            fontWeight: '700',
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
                                        }}
                                    >
                                        이력서 작성하기
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
