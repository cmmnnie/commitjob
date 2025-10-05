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
                console.log('='.repeat(60));
                console.log('[RESUME] ✅ JOIN 조회 성공!');
                console.log('[RESUME] 📊 users 테이블 데이터:', {
                    id: data.user?.id,
                    name: data.user?.name,
                    email: data.user?.email,
                    provider: data.user?.provider
                });
                console.log('[RESUME] 📊 user_profiles 테이블 데이터:', {
                    user_id: data.profile?.user_id,
                    jobs: data.profile?.jobs,
                    careers: data.profile?.careers,
                    regions: data.profile?.regions,
                    skills: data.profile?.skills,
                    expected_salary: data.profile?.expected_salary
                });
                console.log('[RESUME] 🔗 JOIN 확인:', {
                    'users.id': data.user?.id,
                    'user_profiles.user_id': data.profile?.user_id,
                    'JOIN 성공': data.user?.id === data.profile?.user_id
                });
                console.log('='.repeat(60));

                // 새로운 API 응답 구조: { user: {...}, profile: {...} }
                if (data.user) {
                    setCurrentUser(data.user); // user 정보 업데이트
                }
                setUserProfile(data.profile); // profile 정보 설정
            } else if (response.status === 404) {
                console.log('[RESUME] ❌ 사용자 또는 프로필 없음');
                setUserProfile(null);
            }
        } catch (error) {
            console.error('[RESUME] 프로필 조회 오류:', error);
        }
    };

    const formatSalary = (salary) => {
        if (!salary) return '-';
        return `${Number(salary).toLocaleString('ko-KR')}만원`;
    };

    const maskName = (name) => {
        if (!name || name === '-') return name;
        if (name.length === 1) return name;
        if (name.length === 2) {
            return name[0] + '*';
        } else if (name.length >= 3) {
            const middle = '*'.repeat(name.length - 2);
            return name[0] + middle + name[name.length - 1];
        }
        return name;
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
                <div className="spinner"></div>
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
                {/* 헤더 - 사용자 정보 */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    paddingBottom: '15px',
                    borderBottom: '2px solid #f0f0f0'
                }}>
                    {currentUser.picture && (
                        <div style={{ marginBottom: '10px' }}>
                            <img
                                src={currentUser.picture}
                                alt={currentUser.name}
                                style={{
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '50%',
                                    border: '3px solid #667eea',
                                    objectFit: 'cover'
                                }}
                            />
                        </div>
                    )}
                    <h1 style={{
                        fontSize: '1.4rem',
                        color: '#333',
                        marginBottom: '5px',
                        fontWeight: '700',
                        fontFamily: "'Quicksand', sans-serif"
                    }}>{maskName(currentUser.name)}님의 이력서</h1>
                </div>

                {userProfile ? (
                    <>
                        {/* 기본 정보 섹션 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            borderRadius: '15px',
                            padding: '18px',
                            marginBottom: '12px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>💼</span>
                                <h3 style={{
                                    fontSize: '1.05rem',
                                    color: '#333',
                                    fontWeight: '600',
                                    margin: 0
                                }}>기본 정보</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{
                                    display: 'flex',
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{
                                        width: '90px',
                                        color: '#666',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        flexShrink: 0
                                    }}>희망직무</span>
                                    <span style={{
                                        color: '#333',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }}>
                                        {userProfile.jobs || '-'}
                                    </span>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{
                                        width: '90px',
                                        color: '#666',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        flexShrink: 0
                                    }}>경력</span>
                                    <span style={{
                                        color: '#333',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }}>
                                        {userProfile.careers || '-'}
                                    </span>
                                </div>

                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{
                                        width: '90px',
                                        color: '#666',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        marginBottom: userProfile.regions && userProfile.regions.length > 0 ? '6px' : '0'
                                    }}>희망지역</div>
                                    {userProfile.regions && userProfile.regions.length > 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '5px'
                                        }}>
                                            {userProfile.regions.map((region, index) => (
                                                <span key={index} style={{
                                                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                                    color: 'white',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500',
                                                    boxShadow: '0 2px 4px rgba(79, 172, 254, 0.3)'
                                                }}>
                                                    📍 {region}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{
                                            color: '#333',
                                            fontSize: '0.85rem',
                                            fontWeight: '500'
                                        }}>-</span>
                                    )}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{
                                        width: '90px',
                                        color: '#666',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        flexShrink: 0
                                    }}>희망연봉</span>
                                    <span style={{
                                        color: '#333',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }}>
                                        {formatSalary(userProfile.expected_salary)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 기술 스택 섹션 */}
                        <div style={{
                            background: '#f8f9fa',
                            borderRadius: '12px',
                            padding: '15px',
                            marginBottom: '12px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: userProfile.skills && userProfile.skills.length > 0 ? '10px' : '0'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                                <h3 style={{
                                    fontSize: '1rem',
                                    color: '#333',
                                    fontWeight: '600',
                                    margin: 0
                                }}>보유 기술</h3>
                            </div>
                            {userProfile.skills && userProfile.skills.length > 0 ? (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    {userProfile.skills.map((skill, index) => (
                                        <span key={index} style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            padding: '5px 12px',
                                            borderRadius: '15px',
                                            fontSize: '0.8rem',
                                            fontWeight: '500',
                                            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            💻 {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span style={{
                                    color: '#333',
                                    fontSize: '0.85rem',
                                    fontWeight: '500'
                                }}>-</span>
                            )}
                        </div>

                        {/* 이력서 파일 섹션 */}
                        <div style={{
                            background: userProfile.resume_path ? '#e8f5e9' : '#fff3e0',
                            borderRadius: '12px',
                            padding: '15px',
                            marginBottom: '12px',
                            border: `1px solid ${userProfile.resume_path ? '#a5d6a7' : '#ffcc80'}`
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>
                                    {userProfile.resume_path ? '📎' : '📝'}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        color: userProfile.resume_path ? '#2e7d32' : '#f57c00',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        marginBottom: '2px'
                                    }}>
                                        {userProfile.resume_path ? '이력서 파일 등록됨' : '이력서 파일 미등록'}
                                    </div>
                                    {!userProfile.resume_path && (
                                        <div style={{
                                            color: '#f57c00',
                                            fontSize: '0.75rem'
                                        }}>
                                            이력서를 등록하면 더 정확한 추천을 받을 수 있습니다
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 정보 수정 안내 */}
                        <div style={{
                            background: '#e3f2fd',
                            borderRadius: '10px',
                            padding: '12px',
                            marginBottom: '12px',
                            border: '1px solid #90caf9'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1rem' }}>💡</span>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.8rem',
                                    color: '#1565c0',
                                    lineHeight: '1.4'
                                }}>
                                    프로필 정보는 AI 추천과 면접 질문 생성에 활용됩니다
                                </p>
                            </div>
                        </div>

                    </>
                ) : (
                    <>
                        {/* 프로필 미등록 상태 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                            borderRadius: '15px',
                            padding: '25px',
                            textAlign: 'center',
                            marginBottom: '15px',
                            border: '2px dashed #fb8c00'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📝</div>
                            <p style={{
                                fontSize: '1.1rem',
                                color: '#e65100',
                                marginBottom: '8px',
                                fontWeight: '600'
                            }}>
                                프로필 정보가 등록되지 않았습니다
                            </p>
                            <p style={{
                                fontSize: '0.85rem',
                                color: '#f57c00',
                                lineHeight: '1.5',
                                marginBottom: '15px'
                            }}>
                                프로필을 등록하면 AI가 {currentUser.name}님께<br />
                                맞춤형 채용공고와 면접 질문을 추천해드립니다
                            </p>
                        </div>

                        <div style={{
                            background: '#f8f9fa',
                            borderRadius: '12px',
                            padding: '18px',
                            marginBottom: '12px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>📋</span>
                                <h3 style={{
                                    fontSize: '1rem',
                                    color: '#333',
                                    fontWeight: '600',
                                    margin: 0
                                }}>등록 가능한 정보</h3>
                            </div>
                            <ul style={{
                                paddingLeft: '25px',
                                lineHeight: '1.8',
                                margin: 0,
                                color: '#666',
                                fontSize: '0.85rem'
                            }}>
                                <li><strong>희망직무</strong>: 백엔드/프론트엔드/풀스택 등</li>
                                <li><strong>경력</strong>: 신입, 1-3년, 3년 이상 등</li>
                                <li><strong>희망지역</strong>: 서울, 경기, 부산 등</li>
                                <li><strong>기술스택</strong>: Java, React, Python 등</li>
                                <li><strong>희망연봉</strong>: 연봉 정보 (만원 단위)</li>
                                <li><strong>이력서 파일</strong>: PDF 형식 이력서</li>
                            </ul>
                        </div>

                        <div style={{
                            background: '#e3f2fd',
                            borderRadius: '10px',
                            padding: '12px',
                            border: '1px solid #90caf9'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1rem' }}>💡</span>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.8rem',
                                    color: '#1565c0',
                                    lineHeight: '1.4'
                                }}>
                                    프로필 등록 기능은 준비 중입니다. 곧 이용하실 수 있습니다!
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
