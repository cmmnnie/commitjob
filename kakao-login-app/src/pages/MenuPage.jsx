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
            if (!userData.user) {
                setModalType('login');
                setTargetPath(path);
                setShowModal(true);
                return;
            }

            // 이력서 정보 확인
            const profileResponse = await fetch(`${CONFIG.BACKEND_URL}/api/user-profile/${userData.user.id}`, {
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
                    setModalType('resume');
                    setTargetPath(path);
                    setShowModal(true);
                    return;
                }
            }

            // 로그인 및 이력서 모두 확인되면 페이지 이동
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
        if (modalType === 'login') {
            navigate('/?view=login');
        } else if (modalType === 'resume') {
            navigate('/resume');
        }
        closeModal();
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
                            <div style={menuDescStyle}>GPT가 회원님의 이력서를 분석하여 맞춤형 자기소개서를 작성하고 피드백을 제공합니다.</div>
                        </div>
                    </a>

                    <a href="/resume" onClick={(e) => { e.preventDefault(); navigate('/resume'); }} style={{...menuItemStyle, cursor: 'pointer'}}>
                        <span style={menuIconStyle}>📋</span>
                        <div style={menuContentStyle}>
                            <div style={menuTitleStyle}>이력서 관리</div>
                            <div style={menuDescStyle}>이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드리고 AI 자소서 작성을 지원해드립니다.</div>
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
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>
                            {modalType === 'login' ? '🔒' : '📋'}
                        </div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            color: '#333',
                            marginBottom: '15px',
                            fontWeight: '700'
                        }}>
                            {modalType === 'login' ? '로그인이 필요합니다' : '이력서를 먼저 작성해주세요'}
                        </h2>
                        <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                            {modalType === 'login' ? (
                                <>
                                    AI {targetPath === '/ai-recommendation' ? '맞춤 채용공고 추천' :
                                        targetPath === '/ai-interview' ? '면접 준비' : '자기소개서 생성'} 서비스를 이용하려면<br/>
                                    로그인이 필요합니다.
                                </>
                            ) : (
                                <>
                                    AI {targetPath === '/ai-recommendation' ? '맞춤 채용공고 추천' :
                                        targetPath === '/ai-interview' ? '면접 준비' : '자기소개서 생성'} 서비스를 이용하려면<br/>
                                    이력서 정보가 필요합니다.
                                </>
                            )}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={closeModal}
                                style={{
                                    flex: 1,
                                    background: '#e2e8f0',
                                    color: '#333',
                                    border: 'none',
                                    padding: '15px 24px',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#cbd5e0';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                }}
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleModalAction}
                                style={{
                                    flex: 1,
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
                                }}
                            >
                                {modalType === 'login' ? '로그인하러 가기' : '이력서 작성하러 가기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
