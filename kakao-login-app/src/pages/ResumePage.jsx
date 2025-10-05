import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function ResumePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkLoginAndLoadProfile();
    }, []);

    const checkLoginAndLoadProfile = async () => {
        try {
            setIsLoading(true);

            const token = localStorage.getItem('app_session');
            if (!token) {
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.API.USER_INFO}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setCurrentUser(data.user);
                    await loadUserProfile(data.user.id);
                }
            }
        } catch (error) {
            console.error('[RESUME] 로그인 상태 확인 오류:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserProfile = async (userId) => {
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile?user_id=${userId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUserProfile(data);
            } else if (response.status === 404) {
                console.log('[RESUME] 프로필 없음');
                setUserProfile(null);
            }
        } catch (error) {
            console.error('[RESUME] 프로필 조회 오류:', error);
        }
    };

    if (isLoading) {
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
                <div style={{ color: 'white', fontSize: '1.1rem' }}>로딩 중...</div>
            </div>
        );
    }

    if (!currentUser) {
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
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔒</div>
                    <h2 style={{ color: '#667eea', marginBottom: '10px' }}>로그인이 필요합니다</h2>
                    <p style={{ color: '#666' }}>이력서를 확인하려면 로그인해주세요</p>
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
                background: 'white',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
                    <h1 style={{
                        fontSize: '1.6rem',
                        color: '#667eea',
                        marginBottom: '8px',
                        fontWeight: '700'
                    }}>내 이력서</h1>
                </div>

                {userProfile ? (
                    <>
                        <div style={{
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            borderRadius: '15px',
                            padding: '20px',
                            marginBottom: '15px'
                        }}>
                            <h3 style={{
                                fontSize: '1.1rem',
                                color: '#333',
                                marginBottom: '12px',
                                fontWeight: '600'
                            }}>기본 정보</h3>

                            <div style={{ marginBottom: '10px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '90px',
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>희망직무:</span>
                                <span style={{ color: '#333', fontSize: '0.9rem' }}>
                                    {userProfile.jobs || '-'}
                                </span>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '90px',
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>경력:</span>
                                <span style={{ color: '#333', fontSize: '0.9rem' }}>
                                    {userProfile.careers || '-'}
                                </span>
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '90px',
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}>희망지역:</span>
                                <span style={{ color: '#333', fontSize: '0.9rem' }}>
                                    {userProfile.regions || '-'}
                                </span>
                            </div>
                        </div>

                        {userProfile.skills && userProfile.skills.length > 0 && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '15px'
                            }}>
                                <h3 style={{
                                    fontSize: '1rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '600'
                                }}>기술 스택</h3>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    {userProfile.skills.map((skill, index) => (
                                        <span key={index} style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            padding: '4px 10px',
                                            borderRadius: '15px',
                                            fontSize: '0.8rem',
                                            fontWeight: '500'
                                        }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {userProfile.resume_path && (
                            <div style={{
                                background: '#e8f5e9',
                                borderRadius: '10px',
                                padding: '15px',
                                marginBottom: '15px',
                                border: '1px solid #a5d6a7'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.2rem' }}>📎</span>
                                    <span style={{
                                        color: '#2e7d32',
                                        fontSize: '0.9rem',
                                        fontWeight: '500'
                                    }}>
                                        이력서 파일 등록됨
                                    </span>
                                </div>
                            </div>
                        )}

                        <div style={{
                            fontSize: '0.8rem',
                            color: '#999',
                            textAlign: 'center',
                            marginTop: '15px'
                        }}>
                            {userProfile.updated_at && (
                                <p>마지막 수정: {new Date(userProfile.updated_at).toLocaleString('ko-KR')}</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                        borderRadius: '15px',
                        padding: '25px',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '1rem',
                            color: '#333',
                            marginBottom: '10px',
                            fontWeight: '600'
                        }}>
                            📝 등록된 이력서가 없습니다
                        </p>
                        <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5' }}>
                            이력서 등록 기능이 준비 중입니다
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
