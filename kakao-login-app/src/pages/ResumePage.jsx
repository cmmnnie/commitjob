import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function ResumePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'experience', 'education', 'coverLetter'
    const [formData, setFormData] = useState({
        jobs: '',
        careerType: '',  // '신입' 또는 '경력'
        careerYears: '',  // 경력 년수
        regions: [],
        skills: '',
        expected_salary: '0'  // 기본값 0
    });

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
                    preferred_jobs: data.profile?.preferred_jobs,
                    experience: data.profile?.experience,
                    preferred_regions: data.profile?.preferred_regions,
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRegionChange = (region) => {
        setFormData(prev => {
            const currentRegions = prev.regions;
            if (currentRegions.includes(region)) {
                // 이미 선택된 지역이면 제거
                return {
                    ...prev,
                    regions: currentRegions.filter(r => r !== region)
                };
            } else {
                // 선택되지 않은 지역이면 추가
                return {
                    ...prev,
                    regions: [...currentRegions, region]
                };
            }
        });
    };

    const handleEditClick = () => {
        if (userProfile) {
            // 경력 데이터 파싱
            const experience = userProfile.experience || '';
            let careerType = '';
            let careerYears = '';

            if (experience === '신입') {
                careerType = '신입';
            } else if (experience) {
                careerType = '경력';
                // "3년", "5년" 등에서 숫자만 추출
                const match = experience.match(/\d+/);
                careerYears = match ? match[0] : '';
            }

            setFormData({
                jobs: userProfile.preferred_jobs || '',
                careerType,
                careerYears,
                regions: userProfile.preferred_regions || [],
                skills: userProfile.skills ? userProfile.skills.join(', ') : '',
                expected_salary: String(parseInt(userProfile.expected_salary) || 0)  // 정수로 변환
            });
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            jobs: '',
            careerType: '',
            careerYears: '',
            regions: [],
            skills: '',
            expected_salary: '0'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 희망지역 검증
        if (formData.regions.length === 0) {
            alert('희망지역을 1개 이상 선택해주세요.');
            return;
        }

        // 경력 검증
        if (!formData.careerType) {
            alert('신입 또는 경력을 선택해주세요.');
            return;
        }

        if (formData.careerType === '경력' && !formData.careerYears) {
            alert('경력 년수를 입력해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            // 경력 데이터 조합
            const careerValue = formData.careerType === '신입'
                ? '신입'
                : `${formData.careerYears}년`;

            const formDataToSend = new FormData();
            formDataToSend.append('user_id', currentUser.id);
            formDataToSend.append('jobs', formData.jobs);
            formDataToSend.append('careers', careerValue);
            formDataToSend.append('regions', JSON.stringify(formData.regions));
            formDataToSend.append('skills', formData.skills);
            formDataToSend.append('expected_salary', formData.expected_salary);

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formDataToSend
            });

            console.log('[RESUME] 프로필 저장 요청:', {
                user_id: currentUser.id,
                jobs: formData.jobs,
                careers: careerValue,
                regions: formData.regions,
                skills: formData.skills,
                expected_salary: formData.expected_salary
            });

            console.log('[RESUME] 응답 상태:', response.status);

            if (response.ok) {
                alert('프로필이 저장되었습니다!');
                await loadUserProfile(currentUser.id);
                setIsEditing(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('[RESUME] 프로필 저장 실패:', {
                    status: response.status,
                    error: errorData
                });
                alert(`프로필 저장에 실패했습니다. (${response.status})\n${errorData.error?.message || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('[RESUME] 프로필 저장 오류:', error);
            alert('프로필 저장 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
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
            {/* 숫자 입력 필드의 스피너 버튼 숨기기 */}
            <style>{`
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

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

                {/* 탭 네비게이션 */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px',
                    borderBottom: '2px solid #f0f0f0',
                    paddingBottom: '0'
                }}>
                    <button
                        onClick={() => setActiveTab('basic')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            background: activeTab === 'basic' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'basic' ? 'white' : '#666',
                            border: 'none',
                            borderBottom: activeTab === 'basic' ? 'none' : '2px solid transparent',
                            borderRadius: activeTab === 'basic' ? '8px 8px 0 0' : '0',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        기본정보
                    </button>
                    <button
                        onClick={() => setActiveTab('experience')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            background: activeTab === 'experience' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'experience' ? 'white' : '#666',
                            border: 'none',
                            borderBottom: activeTab === 'experience' ? 'none' : '2px solid transparent',
                            borderRadius: activeTab === 'experience' ? '8px 8px 0 0' : '0',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        경력
                    </button>
                    <button
                        onClick={() => setActiveTab('education')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            background: activeTab === 'education' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'education' ? 'white' : '#666',
                            border: 'none',
                            borderBottom: activeTab === 'education' ? 'none' : '2px solid transparent',
                            borderRadius: activeTab === 'education' ? '8px 8px 0 0' : '0',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        학력/자격/수상
                    </button>
                    <button
                        onClick={() => setActiveTab('coverLetter')}
                        style={{
                            flex: 1,
                            padding: '12px 8px',
                            background: activeTab === 'coverLetter' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                            color: activeTab === 'coverLetter' ? 'white' : '#666',
                            border: 'none',
                            borderBottom: activeTab === 'coverLetter' ? 'none' : '2px solid transparent',
                            borderRadius: activeTab === 'coverLetter' ? '8px 8px 0 0' : '0',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        자기소개서
                    </button>
                </div>

                {userProfile && !isEditing ? (
                    <>
                        {/* 기본정보 탭 */}
                        {activeTab === 'basic' && (
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
                                        {userProfile.preferred_jobs || '-'}
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
                                        {userProfile.experience || '-'}
                                    </span>
                                </div>

                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{
                                            width: '90px',
                                            color: '#666',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            flexShrink: 0
                                        }}>선호지역</span>
                                        {userProfile.preferred_regions && userProfile.preferred_regions.length > 0 ? (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '6px'
                                            }}>
                                                {userProfile.preferred_regions.map((region, index) => (
                                                    <span key={index} style={{
                                                        background: '#e3f2fd',
                                                        color: '#1976d2',
                                                        padding: '4px 12px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '500',
                                                        border: '1px solid #90caf9',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        ✓ {region}
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
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                                <h3 style={{
                                    fontSize: '1rem',
                                    color: '#333',
                                    fontWeight: '600',
                                    margin: 0,
                                    width: '90px',
                                    flexShrink: 0
                                }}>기술스택</h3>
                                {userProfile.skills && userProfile.skills.length > 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px'
                                    }}>
                                        {userProfile.skills.map((skill, index) => (
                                            <span key={index} style={{
                                                background: '#f3e5f5',
                                                color: '#7b1fa2',
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500',
                                                border: '1px solid #ce93d8',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                ✓ {skill}
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
                        </div>

                        {/* 정보 수정 안내 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            marginBottom: '12px',
                            border: '2px solid #2196f3',
                            boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>💡</span>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.9rem',
                                    color: '#0d47a1',
                                    lineHeight: '1.5',
                                    fontWeight: '700',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    letterSpacing: '-0.2px'
                                }}>
                                    이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드리고 AI 자소서 작성을 지원해드립니다
                                </p>
                            </div>
                        </div>

                        {/* 수정 버튼 */}
                        <button
                            onClick={handleEditClick}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            ✏️ 프로필 수정
                        </button>
                            </>
                        )}

                        {/* 경력 탭 */}
                        {activeTab === 'experience' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💼</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>경력 정보</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    상세한 경력 정보를 입력하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}

                        {/* 학력/자격/수상 탭 */}
                        {activeTab === 'education' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎓</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>학력 / 자격 / 수상</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    학력, 자격증, 수상 경력을 입력하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}

                        {/* 자기소개서 탭 */}
                        {activeTab === 'coverLetter' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>자기소개서</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    자기소개서를 작성하고 관리하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}

                    </>
                ) : (
                    <>
                        {/* 기본정보 탭 - 편집 모드 */}
                        {activeTab === 'basic' && (
                            <>
                                {/* 프로필 입력 폼 */}
                                <div style={{
                                    background: userProfile
                                        ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                                        : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    marginBottom: '15px',
                                    border: userProfile ? '2px dashed #2196f3' : '2px dashed #fb8c00'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                        <span style={{ fontSize: '1.4rem' }}>
                                            {userProfile ? '✏️' : '📝'}
                                        </span>
                                        <p style={{
                                            fontSize: '1.05rem',
                                            color: userProfile ? '#1565c0' : '#e65100',
                                            margin: 0,
                                            fontWeight: '600'
                                        }}>
                                            {userProfile ? '프로필을 수정해주세요' : '이력서를 작성해주세요'}
                                        </p>
                                    </div>
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: userProfile ? '#0d47a1' : '#e65100',
                                        lineHeight: '1.3',
                                        margin: 0,
                                        paddingLeft: '32px',
                                        fontWeight: '700',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}>
                                        이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드립니다
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    희망직무 <span style={{ color: '#e74c3c' }}>*</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '400', marginLeft: '5px' }}>
                                        (복수개 입력시 쉼표로 구분)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="jobs"
                                    value={formData.jobs}
                                    onChange={handleInputChange}
                                    placeholder="예: 백엔드 개발자, 프론트엔드 개발자"
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    경력 <span style={{ color: '#e74c3c' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="careerType"
                                            value="신입"
                                            checked={formData.careerType === '신입'}
                                            onChange={handleInputChange}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.9rem' }}>신입</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="careerType"
                                            value="경력"
                                            checked={formData.careerType === '경력'}
                                            onChange={handleInputChange}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.9rem' }}>경력</span>
                                    </label>
                                </div>
                                {formData.careerType === '경력' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            name="careerYears"
                                            value={formData.careerYears}
                                            onChange={handleInputChange}
                                            placeholder="년수 입력"
                                            min="1"
                                            max="50"
                                            style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                        />
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>년</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    희망지역 <span style={{ color: '#e74c3c' }}>*</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '400', marginLeft: '5px' }}>
                                        (복수 선택 가능)
                                    </span>
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                    padding: '10px',
                                    background: '#f9f9f9',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd'
                                }}>
                                    {['서울', '경기', '인천', '대구', '대전', '세종', '부산', '강원', '울산', '광주', '경남/경북', '전남/전북', '충남/충북', '제주'].map((region) => (
                                        <label
                                            key={region}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                cursor: 'pointer',
                                                padding: '6px',
                                                borderRadius: '6px',
                                                background: formData.regions.includes(region) ? '#e3f2fd' : 'white',
                                                border: formData.regions.includes(region) ? '1px solid #2196f3' : '1px solid #e0e0e0',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.regions.includes(region)}
                                                onChange={() => handleRegionChange(region)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                fontSize: '0.85rem',
                                                color: formData.regions.includes(region) ? '#1976d2' : '#333',
                                                fontWeight: formData.regions.includes(region) ? '600' : '400'
                                            }}>
                                                {region}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    기술스택 <span style={{ color: '#e74c3c' }}>*</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '400', marginLeft: '5px' }}>
                                        (복수개 입력시 쉼표로 구분)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleInputChange}
                                    placeholder="예: Java, Spring, MySQL"
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    희망연봉 (만원) <span style={{ color: '#e74c3c' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    name="expected_salary"
                                    value={formData.expected_salary}
                                    onChange={handleInputChange}
                                    placeholder="예: 3000"
                                    min="0"
                                    step="1"
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {userProfile ? '수정 완료' : '프로필 저장'}
                                </button>
                                {userProfile && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: '#f0f0f0',
                                            color: '#666',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        </form>
                            </>
                        )}

                        {/* 경력 탭 - 편집 모드 */}
                        {activeTab === 'experience' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💼</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>경력 정보</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    상세한 경력 정보를 입력하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}

                        {/* 학력/자격/수상 탭 - 편집 모드 */}
                        {activeTab === 'education' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎓</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>학력 / 자격 / 수상</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    학력, 자격증, 수상 경력을 입력하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}

                        {/* 자기소개서 탭 - 편집 모드 */}
                        {activeTab === 'coverLetter' && (
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                minHeight: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    color: '#333',
                                    marginBottom: '10px',
                                    fontWeight: '700'
                                }}>자기소개서</h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.6'
                                }}>
                                    자기소개서를 작성하고 관리하는 기능은<br/>곧 추가될 예정입니다.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
