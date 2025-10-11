import { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function ResumePage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        jobs: '',
        careers: '',
        regions: [],
        skills: '',
        expected_salary: ''
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
            setFormData({
                jobs: userProfile.preferred_jobs || '',
                careers: userProfile.experience || '',
                regions: userProfile.preferred_regions || [],
                skills: userProfile.skills ? userProfile.skills.join(', ') : '',
                expected_salary: userProfile.expected_salary || ''
            });
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormData({
            jobs: '',
            careers: '',
            regions: [],
            skills: '',
            expected_salary: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 희망지역 검증
        if (formData.regions.length === 0) {
            alert('희망지역을 1개 이상 선택해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('user_id', currentUser.id);
            formDataToSend.append('jobs', formData.jobs);
            formDataToSend.append('careers', formData.careers);
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
                careers: formData.careers,
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

                {userProfile && !isEditing ? (
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
                            background: '#e3f2fd',
                            borderRadius: '10px',
                            padding: '8px 12px',
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
                                    이력서 정보는 AI 채용공고 추천과 AI 면접질문 생성에 활용됩니다
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
                ) : (
                    <>
                        {/* 프로필 입력 폼 */}
                        <div style={{
                            background: userProfile
                                ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                                : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                            borderRadius: '15px',
                            padding: '20px',
                            textAlign: 'center',
                            marginBottom: '15px',
                            border: userProfile ? '2px dashed #2196f3' : '2px dashed #fb8c00'
                        }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                                {userProfile ? '✏️' : '📝'}
                            </div>
                            <p style={{
                                fontSize: '1.1rem',
                                color: userProfile ? '#1565c0' : '#e65100',
                                marginBottom: '5px',
                                fontWeight: '600'
                            }}>
                                {userProfile ? '프로필을 수정해주세요' : '프로필을 등록해주세요'}
                            </p>
                            <p style={{
                                fontSize: '0.85rem',
                                color: userProfile ? '#1976d2' : '#f57c00',
                                lineHeight: '1.5'
                            }}>
                                이력서 정보를 활용하여 AI 채용공고와 AI 면접질문을 추천해드립니다
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    희망직무 <span style={{ color: '#e74c3c' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="jobs"
                                    value={formData.jobs}
                                    onChange={handleInputChange}
                                    placeholder="예: 백엔드 개발자"
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '600', color: '#333' }}>
                                    경력 <span style={{ color: '#e74c3c' }}>*</span>
                                </label>
                                <select
                                    name="careers"
                                    value={formData.careers}
                                    onChange={handleInputChange}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                >
                                    <option value="">선택하세요</option>
                                    <option value="신입">신입</option>
                                    <option value="1-3년">1-3년</option>
                                    <option value="3-5년">3-5년</option>
                                    <option value="5년 이상">5년 이상</option>
                                </select>
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
                                </label>
                                <input
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleInputChange}
                                    placeholder="예: Java, Spring, MySQL (쉼표로 구분)"
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
            </div>
        </div>
    );
}
