import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import axios from 'axios';

export default function ResumePage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'experience', 'education', 'coverLetter', 'bookmarks', 'aiCoverLetters', 'aiJobs'
    const [activityStats, setActivityStats] = useState({
        bookmarks: 0,
        favoriteCompanies: 0,
        aiRecommendations: 0,
        aiInterviews: 0,
        aiCoverLetters: 0
    });
    const [bookmarkedJobs, setBookmarkedJobs] = useState([]);
    const [aiCoverLetters, setAiCoverLetters] = useState([]);
    const [savedAiJobs, setSavedAiJobs] = useState([]);
    const [selectedAiCoverLetter, setSelectedAiCoverLetter] = useState(null);
    const [formData, setFormData] = useState({
        jobs: '',
        careerType: '',  // '신입' 또는 '경력'
        careerYears: '',  // 경력 년수
        regions: [],
        skills: '',
        expected_salary: '0'  // 기본값 0
    });

    // 학력/자격/어학/수상 데이터
    const [educationList, setEducationList] = useState([]);
    const [certificatesList, setCertificatesList] = useState([]);
    const [languagesList, setLanguagesList] = useState([]);
    const [awardsList, setAwardsList] = useState([]);

    // 학력 편집 모드
    const [isEditingEducation, setIsEditingEducation] = useState(false);
    const [editingEducationIndex, setEditingEducationIndex] = useState(null);
    const [educationForm, setEducationForm] = useState({
        school: '',
        major: '',
        degree: '',
        status: '졸업',
        start_date: '',
        end_date: ''
    });

    // 자격증 편집 모드
    const [isEditingCertificate, setIsEditingCertificate] = useState(false);
    const [editingCertificateIndex, setEditingCertificateIndex] = useState(null);
    const [certificateForm, setCertificateForm] = useState({
        name: '',
        issuer: '',
        date: ''
    });

    // 어학 편집 모드
    const [isEditingLanguage, setIsEditingLanguage] = useState(false);
    const [editingLanguageIndex, setEditingLanguageIndex] = useState(null);
    const [languageForm, setLanguageForm] = useState({
        language: '',
        level: '',
        score: '',
        date: ''
    });

    // 수상 편집 모드
    const [isEditingAward, setIsEditingAward] = useState(false);
    const [editingAwardIndex, setEditingAwardIndex] = useState(null);
    const [awardForm, setAwardForm] = useState({
        name: '',
        issuer: '',
        date: ''
    });

    // 경력 데이터
    const [experienceList, setExperienceList] = useState([]);

    // 경력 편집 모드
    const [isEditingExperience, setIsEditingExperience] = useState(false);
    const [editingExperienceIndex, setEditingExperienceIndex] = useState(null);
    const [experienceForm, setExperienceForm] = useState({
        company: '',
        location: '',
        start_date: '',
        end_date: '',
        is_current: false,
        position: '',
        rank: '',
        job_title: '',
        department: '',
        achievements: ''
    });

    // 자기소개서 데이터
    const [coverLetterList, setCoverLetterList] = useState([]);

    // 자기소개서 편집 모드
    const [isEditingCoverLetter, setIsEditingCoverLetter] = useState(false);
    const [editingCoverLetterIndex, setEditingCoverLetterIndex] = useState(null);
    const [coverLetterForm, setCoverLetterForm] = useState({
        question: '',
        content: ''
    });

    // 자기소개서 문항 목록
    const coverLetterQuestions = [
        '자기소개',
        '지원동기',
        '입사후 포부',
        '팀워크 경험',
        '직무 경험',
        '인간관계 갈등 해결 사례',
        '성격의 장단점'
    ];

    useEffect(() => {
        checkLoginAndLoadProfile();
    }, []);

    // 탭 변경 핸들러 - 탭 전환시 항상 조회 모드로
    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        setIsEditing(false); // 탭 전환시 편집 모드 해제
        setIsEditingEducation(false); // 학력 편집 모드도 해제
        setIsEditingCertificate(false); // 자격증 편집 모드도 해제
        setIsEditingLanguage(false); // 어학 편집 모드도 해제
        setIsEditingAward(false); // 수상 편집 모드도 해제
        setIsEditingExperience(false); // 경력 편집 모드도 해제
        setIsEditingCoverLetter(false); // 자기소개서 편집 모드도 해제
    };

    // 저장된 AI 추천공고 가져오기
    const fetchSavedAiJobs = async () => {
        try {
            const token = localStorage.getItem('app_session');
            const response = await fetch(`${CONFIG.BACKEND_URL}/api/saved-recommended-jobs`, {
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
                    const jobs = data.jobs || [];
                    setSavedAiJobs(jobs);

                    // activityStats의 aiRecommendations 업데이트
                    setActivityStats(prev => ({
                        ...prev,
                        aiRecommendations: jobs.length
                    }));

                    console.log('[AI채용] 저장된 추천공고:', jobs.length, '건');
                }
            }
        } catch (error) {
            console.error('[AI채용] 저장된 추천공고 조회 실패:', error);
        }
    };

    // 학력 추가 버튼 클릭
    const handleAddEducation = () => {
        setEducationForm({
            school: '',
            major: '',
            degree: '',
            status: '졸업',
            start_date: '',
            end_date: ''
        });
        setEditingEducationIndex(null);
        setIsEditingEducation(true);
    };

    // 학력 수정 버튼 클릭
    const handleEditEducation = (index) => {
        setEducationForm(educationList[index]);
        setEditingEducationIndex(index);
        setIsEditingEducation(true);
    };

    // 학력 삭제
    const handleDeleteEducation = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = educationList.filter((_, i) => i !== index);
        setEducationList(newList);

        // 백엔드에 저장
        await saveEducationToBackend(newList);
    };

    // 학력 저장
    const handleSaveEducation = async () => {
        if (!educationForm.school || !educationForm.major) {
            alert('학교명과 전공은 필수 입력 항목입니다.');
            return;
        }

        let newList;
        if (editingEducationIndex !== null) {
            // 수정
            newList = educationList.map((edu, i) =>
                i === editingEducationIndex ? educationForm : edu
            );
        } else {
            // 추가
            newList = [...educationList, educationForm];
        }

        setEducationList(newList);
        setIsEditingEducation(false);

        // 백엔드에 저장
        await saveEducationToBackend(newList);
    };

    // 학력 취소
    const handleCancelEducation = () => {
        setIsEditingEducation(false);
        setEditingEducationIndex(null);
    };

    // 백엔드에 학력 데이터 저장
    const saveEducationToBackend = async (eduList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('education', JSON.stringify(eduList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('학력 정보가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('학력 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[EDUCATION] 저장 오류:', error);
            alert('학력 정보 저장 중 오류가 발생했습니다.');
        }
    };

    // 자격증 추가 버튼 클릭
    const handleAddCertificate = () => {
        setCertificateForm({
            name: '',
            issuer: '',
            date: ''
        });
        setEditingCertificateIndex(null);
        setIsEditingCertificate(true);
    };

    // 자격증 수정 버튼 클릭
    const handleEditCertificate = (index) => {
        setCertificateForm(certificatesList[index]);
        setEditingCertificateIndex(index);
        setIsEditingCertificate(true);
    };

    // 자격증 삭제
    const handleDeleteCertificate = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = certificatesList.filter((_, i) => i !== index);
        setCertificatesList(newList);

        // 백엔드에 저장
        await saveCertificateToBackend(newList);
    };

    // 자격증 저장
    const handleSaveCertificate = async () => {
        if (!certificateForm.name) {
            alert('자격증명은 필수 입력 항목입니다.');
            return;
        }

        let newList;
        if (editingCertificateIndex !== null) {
            // 수정
            newList = certificatesList.map((cert, i) =>
                i === editingCertificateIndex ? certificateForm : cert
            );
        } else {
            // 추가
            newList = [...certificatesList, certificateForm];
        }

        setCertificatesList(newList);
        setIsEditingCertificate(false);

        // 백엔드에 저장
        await saveCertificateToBackend(newList);
    };

    // 자격증 취소
    const handleCancelCertificate = () => {
        setIsEditingCertificate(false);
        setEditingCertificateIndex(null);
    };

    // 백엔드에 자격증 데이터 저장
    const saveCertificateToBackend = async (certList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('certificates', JSON.stringify(certList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('자격증 정보가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('자격증 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[CERTIFICATE] 저장 오류:', error);
            alert('자격증 정보 저장 중 오류가 발생했습니다.');
        }
    };

    // 어학 추가 버튼 클릭
    const handleAddLanguage = () => {
        setLanguageForm({
            language: '',
            level: '',
            score: '',
            date: ''
        });
        setEditingLanguageIndex(null);
        setIsEditingLanguage(true);
    };

    // 어학 수정 버튼 클릭
    const handleEditLanguage = (index) => {
        setLanguageForm(languagesList[index]);
        setEditingLanguageIndex(index);
        setIsEditingLanguage(true);
    };

    // 어학 삭제
    const handleDeleteLanguage = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = languagesList.filter((_, i) => i !== index);
        setLanguagesList(newList);

        // 백엔드에 저장
        await saveLanguageToBackend(newList);
    };

    // 어학 저장
    const handleSaveLanguage = async () => {
        if (!languageForm.language) {
            alert('언어는 필수 입력 항목입니다.');
            return;
        }

        let newList;
        if (editingLanguageIndex !== null) {
            // 수정
            newList = languagesList.map((lang, i) =>
                i === editingLanguageIndex ? languageForm : lang
            );
        } else {
            // 추가
            newList = [...languagesList, languageForm];
        }

        setLanguagesList(newList);
        setIsEditingLanguage(false);

        // 백엔드에 저장
        await saveLanguageToBackend(newList);
    };

    // 어학 취소
    const handleCancelLanguage = () => {
        setIsEditingLanguage(false);
        setEditingLanguageIndex(null);
    };

    // 백엔드에 어학 데이터 저장
    const saveLanguageToBackend = async (langList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('languages', JSON.stringify(langList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('어학 정보가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('어학 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[LANGUAGE] 저장 오류:', error);
            alert('어학 정보 저장 중 오류가 발생했습니다.');
        }
    };

    // 수상 추가 버튼 클릭
    const handleAddAward = () => {
        setAwardForm({
            name: '',
            issuer: '',
            date: ''
        });
        setEditingAwardIndex(null);
        setIsEditingAward(true);
    };

    // 수상 수정 버튼 클릭
    const handleEditAward = (index) => {
        setAwardForm(awardsList[index]);
        setEditingAwardIndex(index);
        setIsEditingAward(true);
    };

    // 수상 삭제
    const handleDeleteAward = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = awardsList.filter((_, i) => i !== index);
        setAwardsList(newList);

        // 백엔드에 저장
        await saveAwardToBackend(newList);
    };

    // 수상 저장
    const handleSaveAward = async () => {
        if (!awardForm.name) {
            alert('수상명은 필수 입력 항목입니다.');
            return;
        }

        let newList;
        if (editingAwardIndex !== null) {
            // 수정
            newList = awardsList.map((award, i) =>
                i === editingAwardIndex ? awardForm : award
            );
        } else {
            // 추가
            newList = [...awardsList, awardForm];
        }

        setAwardsList(newList);
        setIsEditingAward(false);

        // 백엔드에 저장
        await saveAwardToBackend(newList);
    };

    // 수상 취소
    const handleCancelAward = () => {
        setIsEditingAward(false);
        setEditingAwardIndex(null);
    };

    // 백엔드에 수상 데이터 저장
    const saveAwardToBackend = async (awardList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('awards', JSON.stringify(awardList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('수상 정보가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('수상 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[AWARD] 저장 오류:', error);
            alert('수상 정보 저장 중 오류가 발생했습니다.');
        }
    };

    // 경력 추가 버튼 클릭
    const handleAddExperience = () => {
        setExperienceForm({
            company: '',
            location: '',
            start_date: '',
            end_date: '',
            is_current: false,
            position: '',
            rank: '',
            job_title: '',
            department: '',
            achievements: ''
        });
        setEditingExperienceIndex(null);
        setIsEditingExperience(true);
    };

    // 경력 수정 버튼 클릭
    const handleEditExperience = (index) => {
        setExperienceForm(experienceList[index]);
        setEditingExperienceIndex(index);
        setIsEditingExperience(true);
    };

    // 경력 삭제
    const handleDeleteExperience = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = experienceList.filter((_, i) => i !== index);
        setExperienceList(newList);

        // 백엔드에 저장
        await saveExperienceToBackend(newList);
    };

    // 경력 저장
    const handleSaveExperience = async () => {
        if (!experienceForm.company) {
            alert('회사명은 필수 입력 항목입니다.');
            return;
        }

        let newList;
        if (editingExperienceIndex !== null) {
            // 수정
            newList = experienceList.map((exp, i) =>
                i === editingExperienceIndex ? experienceForm : exp
            );
        } else {
            // 추가
            newList = [...experienceList, experienceForm];
        }

        setExperienceList(newList);
        setIsEditingExperience(false);

        // 백엔드에 저장
        await saveExperienceToBackend(newList);
    };

    // 경력 취소
    const handleCancelExperience = () => {
        setIsEditingExperience(false);
        setEditingExperienceIndex(null);
    };

    // 백엔드에 경력 데이터 저장
    const saveExperienceToBackend = async (experienceList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('experiences', JSON.stringify(experienceList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('경력 정보가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('경력 정보 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[EXPERIENCE] 저장 오류:', error);
            alert('경력 정보 저장 중 오류가 발생했습니다.');
        }
    };

    // 자기소개서 추가 버튼 클릭
    const handleAddCoverLetter = () => {
        setCoverLetterForm({
            question: '',
            content: ''
        });
        setEditingCoverLetterIndex(null);
        setIsEditingCoverLetter(true);
    };

    // 자기소개서 수정 버튼 클릭
    const handleEditCoverLetter = (index) => {
        setCoverLetterForm(coverLetterList[index]);
        setEditingCoverLetterIndex(index);
        setIsEditingCoverLetter(true);
    };

    // 자기소개서 삭제
    const handleDeleteCoverLetter = async (index) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const newList = coverLetterList.filter((_, i) => i !== index);
        setCoverLetterList(newList);

        // 백엔드에 저장
        await saveCoverLetterToBackend(newList);
    };

    // 자기소개서 저장
    const handleSaveCoverLetter = async () => {
        if (!coverLetterForm.question) {
            alert('문항을 선택해주세요.');
            return;
        }
        if (!coverLetterForm.content) {
            alert('내용을 입력해주세요.');
            return;
        }

        let newList;
        if (editingCoverLetterIndex !== null) {
            // 수정
            newList = coverLetterList.map((item, i) =>
                i === editingCoverLetterIndex ? coverLetterForm : item
            );
        } else {
            // 추가
            newList = [...coverLetterList, coverLetterForm];
        }

        setCoverLetterList(newList);
        setIsEditingCoverLetter(false);

        // 백엔드에 저장
        await saveCoverLetterToBackend(newList);
    };

    // 자기소개서 취소
    const handleCancelCoverLetter = () => {
        setIsEditingCoverLetter(false);
        setEditingCoverLetterIndex(null);
    };

    // 백엔드에 자기소개서 데이터 저장
    const saveCoverLetterToBackend = async (coverLetterList) => {
        try {
            const formData = new FormData();
            formData.append('user_id', currentUser.id);
            formData.append('cover_letters', JSON.stringify(coverLetterList));

            const response = await fetch(`${CONFIG.BACKEND_URL}/api/profile`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                alert('자기소개서가 저장되었습니다!');
                await loadUserProfile(currentUser.id);
            } else {
                alert('자기소개서 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('[COVER_LETTER] 저장 오류:', error);
            alert('자기소개서 저장 중 오류가 발생했습니다.');
        }
    };

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
                    await loadActivityStats(data.user.id);
                }
            }
        } catch (error) {
            console.error('[RESUME] 로그인 상태 확인 오류:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadActivityStats = async (userId) => {
        try {
            const token = localStorage.getItem('app_session');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // 북마크 개수 및 목록 가져오기
            const bookmarksRes = await axios.get(`${CONFIG.BACKEND_URL}/api/bookmarks`, {
                withCredentials: true,
                headers
            });

            // 북마크 목록 저장
            if (bookmarksRes.data.bookmarks) {
                setBookmarkedJobs(bookmarksRes.data.bookmarks);
            }

            // AI 자소서 목록 가져오기
            let aiCoverLetterCount = 0;
            try {
                const aiCoverLettersRes = await fetch(`${CONFIG.BACKEND_URL}/api/cover-letters/${userId}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (aiCoverLettersRes.ok) {
                    const aiData = await aiCoverLettersRes.json();
                    if (aiData.success && aiData.cover_letters) {
                        setAiCoverLetters(aiData.cover_letters);
                        aiCoverLetterCount = aiData.cover_letters.length;
                    }
                }
            } catch (err) {
                console.error('[RESUME] AI 자소서 로드 오류:', err);
            }

            // AI 추천공고 개수 가져오기
            let aiRecommendationsCount = 0;
            try {
                const aiJobsRes = await fetch(`${CONFIG.BACKEND_URL}/api/saved-recommended-jobs`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (aiJobsRes.ok) {
                    const aiJobsData = await aiJobsRes.json();
                    if (aiJobsData.success && aiJobsData.jobs) {
                        aiRecommendationsCount = aiJobsData.jobs.length;
                    }
                }
            } catch (err) {
                console.error('[RESUME] AI 추천공고 개수 로드 오류:', err);
            }

            setActivityStats({
                bookmarks: bookmarksRes.data.total || 0,
                favoriteCompanies: 0, // TODO: API 추가 시
                aiRecommendations: aiRecommendationsCount,
                aiInterviews: 0, // TODO: API 추가 시
                aiCoverLetters: aiCoverLetterCount
            });
        } catch (error) {
            console.error('[RESUME] 활동 통계 로드 오류:', error);
        }
    };

    // AI 자소서 불러오기
    const loadAiCoverLetter = async (id) => {
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
                setSelectedAiCoverLetter(data.cover_letter);
            }
        } catch (error) {
            console.error('[RESUME] AI 자소서 불러오기 오류:', error);
            alert('자소서를 불러오는 중 오류가 발생했습니다.');
        }
    };

    // AI 자소서 삭제
    const deleteAiCoverLetter = async (id) => {
        if (!confirm('정말 이 자소서를 삭제하시겠습니까?')) {
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

            const data = await response.json();
            if (data.success) {
                alert('자소서가 삭제되었습니다.');
                // 목록 새로고침
                loadActivityStats(currentUser.id);
                // 선택된 자소서가 삭제된 경우 닫기
                if (selectedAiCoverLetter && selectedAiCoverLetter.id === id) {
                    setSelectedAiCoverLetter(null);
                }
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('[RESUME] AI 자소서 삭제 오류:', error);
            alert('자소서를 삭제하는 중 오류가 발생했습니다.');
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

                // 학력/자격/어학/수상 데이터 로드
                if (data.profile) {
                    try {
                        if (data.profile.education) {
                            const eduData = typeof data.profile.education === 'string'
                                ? JSON.parse(data.profile.education)
                                : data.profile.education;
                            setEducationList(Array.isArray(eduData) ? eduData : []);
                        }
                        if (data.profile.certificates) {
                            const certData = typeof data.profile.certificates === 'string'
                                ? JSON.parse(data.profile.certificates)
                                : data.profile.certificates;
                            setCertificatesList(Array.isArray(certData) ? certData : []);
                        }
                        if (data.profile.languages) {
                            const langData = typeof data.profile.languages === 'string'
                                ? JSON.parse(data.profile.languages)
                                : data.profile.languages;
                            setLanguagesList(Array.isArray(langData) ? langData : []);
                        }
                        if (data.profile.awards) {
                            const awardsData = typeof data.profile.awards === 'string'
                                ? JSON.parse(data.profile.awards)
                                : data.profile.awards;
                            setAwardsList(Array.isArray(awardsData) ? awardsData : []);
                        }
                        if (data.profile.experiences) {
                            const expData = typeof data.profile.experiences === 'string'
                                ? JSON.parse(data.profile.experiences)
                                : data.profile.experiences;
                            setExperienceList(Array.isArray(expData) ? expData : []);
                        }
                        if (data.profile.cover_letters) {
                            const coverLetterData = typeof data.profile.cover_letters === 'string'
                                ? JSON.parse(data.profile.cover_letters)
                                : data.profile.cover_letters;
                            const letters = Array.isArray(coverLetterData) ? coverLetterData : [];
                            setCoverLetterList(letters);
                            // 자소서 개수 업데이트
                            setActivityStats(prev => ({
                                ...prev,
                                aiCoverLetters: letters.length
                            }));
                        }
                    } catch (parseError) {
                        console.error('[RESUME] 학력/자격/어학/수상/경력/자기소개서 데이터 파싱 오류:', parseError);
                    }
                }
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
                    maxWidth: '800px',
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
            padding: '40px 20px',
            paddingBottom: '100px',
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
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* 헤더 - 사용자 정보 및 활동 통계 */}
                <div style={{
                    display: 'flex',
                    gap: '30px',
                    marginBottom: '20px',
                    paddingBottom: '20px',
                    borderBottom: '2px solid #f0f0f0'
                }}>
                    {/* 왼쪽: 프로필 사진 + 이름 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        flex: '0 0 auto'
                    }}>
                        {currentUser.picture && (
                            <img
                                src={currentUser.picture}
                                alt={currentUser.name}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    border: '3px solid #667eea',
                                    objectFit: 'cover'
                                }}
                            />
                        )}
                        <h1 style={{
                            fontSize: '1.5rem',
                            color: '#333',
                            margin: 0,
                            fontWeight: '700',
                            fontFamily: "'Quicksand', sans-serif",
                            whiteSpace: 'nowrap'
                        }}>{maskName(currentUser.name)}님</h1>
                    </div>

                    {/* 오른쪽: 활동 통계 카드 */}
                    <div style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '12px'
                    }}>
                        {/* 관심공고 */}
                        <div
                            onClick={() => handleTabChange('bookmarks')}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '15px',
                                borderRadius: '12px',
                                color: 'white',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <div style={{
                                fontSize: '1.1rem',
                                marginBottom: '6px',
                                opacity: 0.9,
                                fontWeight: '700'
                            }}>관심공고</div>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>{activityStats.bookmarks}</div>
                        </div>

                        {/* 관심회사 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            padding: '15px',
                            borderRadius: '12px',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.1rem',
                                marginBottom: '6px',
                                opacity: 0.9,
                                fontWeight: '700'
                            }}>관심회사</div>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>{activityStats.favoriteCompanies}</div>
                        </div>

                        {/* AI채용 */}
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTabChange('aiJobs');
                                fetchSavedAiJobs();
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                padding: '15px',
                                borderRadius: '12px',
                                color: 'white',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                userSelect: 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 172, 254, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                fontSize: '1.1rem',
                                marginBottom: '6px',
                                opacity: 0.9,
                                fontWeight: '700',
                                pointerEvents: 'none'
                            }}>AI채용</div>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                            }}>{activityStats.aiRecommendations}</div>
                        </div>

                        {/* AI면접 */}
                        <div style={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            padding: '15px',
                            borderRadius: '12px',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.1rem',
                                marginBottom: '6px',
                                opacity: 0.9,
                                fontWeight: '700'
                            }}>AI면접</div>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>{activityStats.aiInterviews}</div>
                        </div>

                        {/* AI자소서 */}
                        <div
                            onClick={() => handleTabChange('aiCoverLetters')}
                            style={{
                                background: 'linear-gradient(135deg, #ffb366 0%, #ff9944 100%)',
                                padding: '15px',
                                borderRadius: '12px',
                                color: 'white',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 179, 102, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <div style={{
                                fontSize: '1.1rem',
                                marginBottom: '6px',
                                opacity: 0.9,
                                fontWeight: '700'
                            }}>AI자소서</div>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>{activityStats.aiCoverLetters}</div>
                        </div>
                    </div>
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
                        onClick={() => handleTabChange('basic')}
                        style={{
                            flex: 1,
                            padding: '16px 20px',
                            background: 'white',
                            color: '#666',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: '0',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        기본정보
                    </button>
                    <button
                        onClick={() => handleTabChange('experience')}
                        style={{
                            flex: 1,
                            padding: '16px 20px',
                            background: 'white',
                            color: '#666',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: '0',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        경력
                    </button>
                    <button
                        onClick={() => handleTabChange('education')}
                        style={{
                            flex: 1,
                            padding: '16px 20px',
                            background: 'white',
                            color: '#666',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: '0',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        학력/자격/어학/수상
                    </button>
                    <button
                        onClick={() => handleTabChange('coverLetter')}
                        style={{
                            flex: 1,
                            padding: '16px 20px',
                            background: 'white',
                            color: '#666',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: '0',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        자기소개서
                    </button>
                </div>

                {/* 탭 콘텐츠 표시 */}
                {activeTab === 'coverLetter' ? (
                    <>
                        {/* 자기소개서 탭 */}
                        {activeTab === 'coverLetter' && (
                            <>
                                {!isEditingCoverLetter && (
                                    <div style={{
                                        marginBottom: '20px'
                                    }}>
                                        <button
                                            onClick={handleAddCoverLetter}
                                            style={{
                                                width: '100%',
                                                padding: '16px',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontSize: '1rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            + 자기소개서 추가
                                        </button>
                                    </div>
                                )}

                                {isEditingCoverLetter ? (
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '30px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                    }}>
                                        <h3 style={{
                                            fontSize: '1.3rem',
                                            fontWeight: '700',
                                            color: '#333',
                                            marginBottom: '25px',
                                            paddingBottom: '15px',
                                            borderBottom: '2px solid #667eea'
                                        }}>
                                            {editingCoverLetterIndex !== null ? '자기소개서 수정' : '자기소개서 추가'}
                                        </h3>

                                        <div style={{
                                            marginBottom: '20px'
                                        }}>
                                            <label style={{
                                                display: 'block',
                                                marginBottom: '8px',
                                                fontWeight: '600',
                                                color: '#495057',
                                                fontSize: '0.95rem'
                                            }}>
                                                문항 선택 <span style={{ color: '#e74c3c' }}>*</span>
                                            </label>
                                            <select
                                                value={coverLetterForm.question}
                                                onChange={(e) => setCoverLetterForm({ ...coverLetterForm, question: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '2px solid #dee2e6',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    fontWeight: '500',
                                                    color: '#495057',
                                                    backgroundColor: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">문항을 선택하세요</option>
                                                {coverLetterQuestions.map((q, index) => (
                                                    <option key={index} value={q}>{q}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{
                                            marginBottom: '25px'
                                        }}>
                                            <label style={{
                                                display: 'block',
                                                marginBottom: '8px',
                                                fontWeight: '600',
                                                color: '#495057',
                                                fontSize: '0.95rem'
                                            }}>
                                                내용 <span style={{ color: '#e74c3c' }}>*</span>
                                            </label>
                                            <textarea
                                                value={coverLetterForm.content}
                                                onChange={(e) => setCoverLetterForm({ ...coverLetterForm, content: e.target.value })}
                                                placeholder="자기소개서 내용을 입력하세요"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '250px',
                                                    padding: '15px',
                                                    border: '2px solid #dee2e6',
                                                    borderRadius: '8px',
                                                    fontSize: '1rem',
                                                    lineHeight: '1.6',
                                                    resize: 'vertical',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            gap: '10px',
                                            justifyContent: 'flex-end'
                                        }}>
                                            <button
                                                onClick={handleCancelCoverLetter}
                                                style={{
                                                    padding: '12px 24px',
                                                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.95rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={handleSaveCoverLetter}
                                                style={{
                                                    padding: '12px 24px',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.95rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                                                }}
                                            >
                                                저장
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                    }}>
                                        {coverLetterList.length > 0 ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '15px'
                                            }}>
                                                {/* 문항별로 정렬 (같은 문항끼리 모아서 표시) */}
                                                {coverLetterList
                                                    .map((item, originalIndex) => ({ ...item, originalIndex }))
                                                    .sort((a, b) => {
                                                        const questionIndexA = coverLetterQuestions.indexOf(a.question);
                                                        const questionIndexB = coverLetterQuestions.indexOf(b.question);
                                                        return questionIndexA - questionIndexB;
                                                    })
                                                    .map(({ originalIndex, ...item }) => (
                                                    <div
                                                        key={originalIndex}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                                            borderRadius: '10px',
                                                            padding: '20px',
                                                            border: '2px solid #dee2e6'
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'flex-start',
                                                            marginBottom: '12px'
                                                        }}>
                                                            <div style={{
                                                                flex: 1
                                                            }}>
                                                                <h4 style={{
                                                                    fontSize: '1.1rem',
                                                                    fontWeight: '700',
                                                                    color: '#495057',
                                                                    marginBottom: '10px'
                                                                }}>
                                                                    {item.question}
                                                                </h4>
                                                                <p style={{
                                                                    fontSize: '0.95rem',
                                                                    color: '#6c757d',
                                                                    lineHeight: '1.6',
                                                                    whiteSpace: 'pre-wrap',
                                                                    marginBottom: 0
                                                                }}>
                                                                    {item.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            gap: '8px',
                                                            justifyContent: 'flex-end'
                                                        }}>
                                                            <button
                                                                onClick={() => handleEditCoverLetter(originalIndex)}
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                                }}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCoverLetter(originalIndex)}
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                                }}
                                                            >
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '40px 20px',
                                                textAlign: 'center',
                                                color: '#999',
                                                fontSize: '0.9rem'
                                            }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
                                                등록된 자기소개서가 없습니다
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (userProfile && !isEditing) ? (
                    <>
                        {/* 관심공고 탭 */}
                        {activeTab === 'bookmarks' && (
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '30px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '25px',
                                    paddingBottom: '15px',
                                    borderBottom: '2px solid #667eea',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⭐</span>
                                    관심공고 현황 ({activityStats.bookmarks}건)
                                </h3>

                                {bookmarkedJobs.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        color: '#999'
                                    }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📋</div>
                                        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>아직 북마크한 공고가 없습니다</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>관심있는 공고를 북마크해보세요!</p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px'
                                    }}>
                                        {bookmarkedJobs.map((bookmark, index) => (
                                            <div
                                                key={bookmark.id}
                                                onClick={() => navigate(`/jobs/detail/${bookmark.job_id}`, { state: { job: bookmark } })}
                                                style={{
                                                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    border: '2px solid transparent'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                                                    e.currentTarget.style.borderColor = '#667eea';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.borderColor = 'transparent';
                                                }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '12px'
                                                }}>
                                                    <h4 style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: '700',
                                                        color: '#333',
                                                        margin: 0,
                                                        flex: 1
                                                    }}>
                                                        {bookmark.title || '제목 없음'}
                                                    </h4>
                                                    <span style={{
                                                        fontSize: '1.5rem'
                                                    }}>⭐</span>
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '0.9rem',
                                                        color: '#555'
                                                    }}>
                                                        <span style={{ fontWeight: '600' }}>🏢</span>
                                                        <span>{bookmark.company || '-'}</span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '0.9rem',
                                                        color: '#555'
                                                    }}>
                                                        <span style={{ fontWeight: '600' }}>📍</span>
                                                        <span>{bookmark.location || '-'}</span>
                                                    </div>
                                                    {bookmark.deadline && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '0.9rem',
                                                            color: '#555'
                                                        }}>
                                                            <span style={{ fontWeight: '600' }}>📅</span>
                                                            <span>{bookmark.deadline}</span>
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        fontSize: '0.8rem',
                                                        color: '#999',
                                                        marginTop: '8px'
                                                    }}>
                                                        북마크 일시: {new Date(bookmark.created_at).toLocaleDateString('ko-KR')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AI자소서 탭 */}
                        {activeTab === 'aiCoverLetters' && (
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '30px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '25px',
                                    paddingBottom: '15px',
                                    borderBottom: '2px solid #ffb366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>✍️</span>
                                    AI자소서 현황 ({activityStats.aiCoverLetters}건)
                                </h3>

                                {aiCoverLetters.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        color: '#999'
                                    }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🤖</div>
                                        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>아직 저장된 AI 자기소개서가 없습니다</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>AI 자소서 작성 페이지에서 AI가 작성한 자소서를 저장해보세요!</p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}>
                                        {aiCoverLetters.map((coverLetter, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    background: 'linear-gradient(135deg, #fff9f0 0%, #ffe8d4 100%)',
                                                    borderRadius: '12px',
                                                    padding: '25px',
                                                    border: '2px solid #ffb366',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 179, 102, 0.2)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}>
                                                {/* 제목과 버튼 */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '12px'
                                                }}>
                                                    <h4 style={{
                                                        fontSize: '1.1rem',
                                                        fontWeight: '700',
                                                        color: '#ff8833',
                                                        margin: 0,
                                                        flex: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}>
                                                        <span>🤖</span>
                                                        {coverLetter.title || '제목 없음'}
                                                    </h4>
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '8px'
                                                    }}>
                                                        <button
                                                            onClick={() => loadAiCoverLetter(coverLetter.id)}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #ffb366 0%, #ff9944 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '8px 16px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 6px rgba(255, 179, 102, 0.3)',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 179, 102, 0.4)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 179, 102, 0.3)';
                                                            }}>
                                                            📄 불러오기
                                                        </button>
                                                        <button
                                                            onClick={() => deleteAiCoverLetter(coverLetter.id)}
                                                            style={{
                                                                background: '#ff4444',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '8px 16px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 6px rgba(255, 68, 68, 0.3)',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 68, 68, 0.4)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 68, 68, 0.3)';
                                                            }}>
                                                            🗑️ 삭제
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 회사명과 채용공고 제목 */}
                                                {(coverLetter.company || coverLetter.job_title) && (
                                                    <div
                                                        onClick={(e) => {
                                                            if (coverLetter.job_id) {
                                                                e.stopPropagation();
                                                                navigate(`/jobs/detail/${coverLetter.job_id}`);
                                                            }
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px',
                                                            marginBottom: '12px',
                                                            paddingBottom: '12px',
                                                            borderBottom: '1px solid #ffe8d4',
                                                            cursor: coverLetter.job_id ? 'pointer' : 'default',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (coverLetter.job_id) {
                                                                e.currentTarget.style.background = 'rgba(255, 179, 102, 0.1)';
                                                                e.currentTarget.style.marginLeft = '-10px';
                                                                e.currentTarget.style.marginRight = '-10px';
                                                                e.currentTarget.style.paddingLeft = '10px';
                                                                e.currentTarget.style.paddingRight = '10px';
                                                                e.currentTarget.style.borderRadius = '6px';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (coverLetter.job_id) {
                                                                e.currentTarget.style.background = 'transparent';
                                                                e.currentTarget.style.marginLeft = '0';
                                                                e.currentTarget.style.marginRight = '0';
                                                                e.currentTarget.style.paddingLeft = '0';
                                                                e.currentTarget.style.paddingRight = '0';
                                                                e.currentTarget.style.borderRadius = '0';
                                                            }
                                                        }}
                                                    >
                                                        {coverLetter.company && (
                                                            <div style={{
                                                                fontSize: '0.9rem',
                                                                color: '#666',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                <span style={{ fontWeight: '600' }}>🏢</span>
                                                                <span>{coverLetter.company}</span>
                                                            </div>
                                                        )}
                                                        {coverLetter.job_title && (
                                                            <div style={{
                                                                fontSize: '0.9rem',
                                                                color: '#666',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                <span style={{ fontWeight: '600' }}>💼</span>
                                                                <span>{coverLetter.job_title}</span>
                                                                {coverLetter.job_id && (
                                                                    <span style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#ff8833',
                                                                        marginLeft: '4px'
                                                                    }}>
                                                                        👉 상세보기
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 저장일시 */}
                                                {coverLetter.created_at && (() => {
                                                    // UTC 시간을 한국시간(UTC+9)으로 변환
                                                    const utcDate = new Date(coverLetter.created_at);
                                                    const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
                                                    const year = kstDate.getFullYear();
                                                    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
                                                    const day = String(kstDate.getDate()).padStart(2, '0');
                                                    const hours = String(kstDate.getHours()).padStart(2, '0');
                                                    const minutes = String(kstDate.getMinutes()).padStart(2, '0');
                                                    const timeText = `${year}-${month}-${day} ${hours}:${minutes}`;

                                                    return (
                                                        <div style={{
                                                            fontSize: '0.8rem',
                                                            color: '#999',
                                                            textAlign: 'right'
                                                        }}>
                                                            저장일시: {timeText}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* AI 자소서 모달 */}
                                {selectedAiCoverLetter && (
                                    <div
                                        style={{
                                            position: 'fixed',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            zIndex: 9999,
                                            padding: '20px'
                                        }}
                                        onClick={() => setSelectedAiCoverLetter(null)}
                                    >
                                        <div
                                            style={{
                                                background: 'white',
                                                borderRadius: '16px',
                                                padding: '35px',
                                                maxWidth: '800px',
                                                width: '100%',
                                                maxHeight: '90vh',
                                                overflowY: 'auto',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                                border: '3px solid #ffb366',
                                                position: 'relative'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* 닫기 버튼 */}
                                            <button
                                                onClick={() => setSelectedAiCoverLetter(null)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '15px',
                                                    right: '15px',
                                                    background: '#f5f5f5',
                                                    color: '#666',
                                                    border: 'none',
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    fontSize: '1.2rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#e0e0e0';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#f5f5f5';
                                                }}
                                            >
                                                ✕
                                            </button>

                                            {/* 제목 */}
                                            <h3 style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: '#ff8833',
                                                margin: '0 0 20px 0',
                                                paddingRight: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                borderBottom: '2px solid #ffb366',
                                                paddingBottom: '15px'
                                            }}>
                                                <span>🤖</span>
                                                {selectedAiCoverLetter.title || '제목 없음'}
                                            </h3>

                                            {/* 회사명 및 직무 정보 */}
                                            {(selectedAiCoverLetter.company || selectedAiCoverLetter.job_title) && (
                                                <div
                                                    onClick={() => {
                                                        if (selectedAiCoverLetter.job_id) {
                                                            navigate(`/jobs/detail/${selectedAiCoverLetter.job_id}`);
                                                        }
                                                    }}
                                                    style={{
                                                        marginBottom: '25px',
                                                        cursor: selectedAiCoverLetter.job_id ? 'pointer' : 'default',
                                                        padding: '15px',
                                                        borderRadius: '10px',
                                                        border: selectedAiCoverLetter.job_id ? '2px solid #ffe8d4' : 'none',
                                                        background: selectedAiCoverLetter.job_id ? 'linear-gradient(135deg, #fff9f0 0%, #ffe8d4 100%)' : 'transparent',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (selectedAiCoverLetter.job_id) {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 179, 102, 0.3)';
                                                            e.currentTarget.style.borderColor = '#ffb366';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedAiCoverLetter.job_id) {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                            e.currentTarget.style.borderColor = '#ffe8d4';
                                                        }
                                                    }}
                                                >
                                                    {selectedAiCoverLetter.company && (
                                                        <div style={{
                                                            fontSize: '1rem',
                                                            color: '#555',
                                                            marginBottom: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}>
                                                            <span style={{ fontWeight: '700', color: '#ff8833' }}>🏢 회사:</span>
                                                            <span>{selectedAiCoverLetter.company}</span>
                                                        </div>
                                                    )}

                                                    {selectedAiCoverLetter.job_title && (
                                                        <div style={{
                                                            fontSize: '1rem',
                                                            color: '#555',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}>
                                                            <span style={{ fontWeight: '700', color: '#ff8833' }}>💼 직무:</span>
                                                            <span>{selectedAiCoverLetter.job_title}</span>
                                                            {selectedAiCoverLetter.job_id && (
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    color: '#ff8833',
                                                                    marginLeft: '8px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    👉 상세보기
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 자소서 내용 */}
                                            <div style={{
                                                fontSize: '1.05rem',
                                                color: '#333',
                                                lineHeight: '1.9',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                background: 'linear-gradient(135deg, #fff9f0 0%, #ffe8d4 100%)',
                                                padding: '30px',
                                                borderRadius: '10px',
                                                border: '1px solid #ffe8d4',
                                                marginBottom: '20px'
                                            }}>
                                                {selectedAiCoverLetter.content || '내용 없음'}
                                            </div>

                                            {/* 저장일시 */}
                                            {selectedAiCoverLetter.created_at && (() => {
                                                // UTC 시간을 한국시간(UTC+9)으로 변환
                                                const utcDate = new Date(selectedAiCoverLetter.created_at);
                                                const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
                                                const year = kstDate.getFullYear();
                                                const month = String(kstDate.getMonth() + 1).padStart(2, '0');
                                                const day = String(kstDate.getDate()).padStart(2, '0');
                                                const hours = String(kstDate.getHours()).padStart(2, '0');
                                                const minutes = String(kstDate.getMinutes()).padStart(2, '0');
                                                const timeText = `${year}-${month}-${day} ${hours}:${minutes}`;

                                                return (
                                                    <div style={{
                                                        fontSize: '0.9rem',
                                                        color: '#999',
                                                        textAlign: 'right',
                                                        paddingTop: '15px',
                                                        borderTop: '1px solid #f0f0f0'
                                                    }}>
                                                        저장일시: {timeText}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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

                        {/* AI 추천 채용공고 탭 */}
                        {activeTab === 'aiJobs' && (
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '30px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                <h3 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '25px',
                                    paddingBottom: '15px',
                                    borderBottom: '2px solid #667eea',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>🤖</span>
                                    저장한 AI 추천 채용공고 ({savedAiJobs.length}건)
                                </h3>

                                {savedAiJobs.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        color: '#999'
                                    }}>
                                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📋</div>
                                        <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px' }}>
                                            저장된 AI 추천 공고가 없습니다
                                        </p>
                                        <p style={{ fontSize: '0.95rem', color: '#aaa', lineHeight: '1.6' }}>
                                            AI채용추천 페이지에서<br/>
                                            "추천공고 저장하기" 버튼을 눌러<br/>
                                            AI가 추천한 공고를 저장해보세요
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px'
                                    }}>
                                        {savedAiJobs.map((job, index) => (
                                            <div
                                                key={job.id || index}
                                                onClick={() => navigate(`/job/${job.job_id}`, {
                                                    state: {
                                                        job: {
                                                            id: job.job_id,
                                                            title: job.title,
                                                            company: job.company
                                                        }
                                                    }
                                                })}
                                                style={{
                                                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    border: '2px solid #e9ecef',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
                                                    e.currentTarget.style.borderColor = '#667eea';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.borderColor = '#e9ecef';
                                                }}
                                            >
                                                {/* 저장일시 뱃지 */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '15px',
                                                    right: '15px',
                                                    fontSize: '0.75rem',
                                                    color: '#999',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    <span>🕐</span>
                                                    {new Date(job.saved_at).toLocaleDateString('ko-KR', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })}
                                                </div>

                                                {/* 회사명 */}
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    marginBottom: '10px',
                                                    padding: '6px 12px',
                                                    background: 'rgba(102, 126, 234, 0.1)',
                                                    borderRadius: '20px'
                                                }}>
                                                    <span style={{ fontSize: '0.9rem' }}>🏢</span>
                                                    <span style={{
                                                        fontSize: '0.95rem',
                                                        color: '#667eea',
                                                        fontWeight: '700'
                                                    }}>
                                                        {job.company}
                                                    </span>
                                                </div>

                                                {/* 공고 제목 */}
                                                <h4 style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: '700',
                                                    color: '#333',
                                                    marginBottom: '12px',
                                                    lineHeight: '1.5',
                                                    paddingRight: '80px'
                                                }}>
                                                    {job.title}
                                                </h4>

                                                {/* 등록/마감 정보 */}
                                                {job.registration_info && (
                                                    <div style={{
                                                        display: 'flex',
                                                        gap: '8px',
                                                        flexWrap: 'wrap',
                                                        marginTop: '12px'
                                                    }}>
                                                        {JSON.parse(job.registration_info).map((info, idx) => (
                                                            <span key={idx} style={{
                                                                fontSize: '0.85rem',
                                                                color: info.includes('D-') ? '#e74c3c' : '#666',
                                                                fontWeight: info.includes('D-') ? '700' : '500',
                                                                background: info.includes('D-') ? '#ffe5e5' : '#f8f9fa',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px'
                                                            }}>
                                                                {info}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 경력 탭 - 조회 모드 */}
                        {activeTab === 'experience' && (
                            <>
                                <div style={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    {/* 헤더 - 수정/추가 중이 아닐 때만 표시 */}
                                    {!isEditingExperience && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>💼</span>
                                                <h3 style={{
                                                    fontSize: '1.05rem',
                                                    color: '#333',
                                                    fontWeight: '600',
                                                    margin: 0
                                                }}>경력</h3>
                                            </div>
                                            <button
                                                onClick={handleAddExperience}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                                }}
                                            >
                                                추가
                                            </button>
                                        </div>
                                    )}

                                    {/* 편집 중일 때 헤더 */}
                                    {isEditingExperience && (
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
                                            }}>{editingExperienceIndex !== null ? '경력 수정' : '경력 추가'}</h3>
                                        </div>
                                    )}

                                    {/* 경력 입력 폼 */}
                                    {isEditingExperience && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #2196f3'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    회사명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.company}
                                                    onChange={(e) => setExperienceForm({...experienceForm, company: e.target.value})}
                                                    placeholder="예: (주)삼성전자"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    근무지역
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.location}
                                                    onChange={(e) => setExperienceForm({...experienceForm, location: e.target.value})}
                                                    placeholder="예: 서울 강남구"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        입사일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={experienceForm.start_date}
                                                        onChange={(e) => setExperienceForm({...experienceForm, start_date: e.target.value})}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        퇴사일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={experienceForm.end_date}
                                                        onChange={(e) => setExperienceForm({...experienceForm, end_date: e.target.value})}
                                                        disabled={experienceForm.is_current}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem',
                                                            backgroundColor: experienceForm.is_current ? '#f5f5f5' : 'white'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#333', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={experienceForm.is_current}
                                                        onChange={(e) => setExperienceForm({
                                                            ...experienceForm,
                                                            is_current: e.target.checked,
                                                            end_date: e.target.checked ? '' : experienceForm.end_date
                                                        })}
                                                        style={{ marginRight: '6px' }}
                                                    />
                                                    재직중
                                                </label>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직무
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.position}
                                                        onChange={(e) => setExperienceForm({...experienceForm, position: e.target.value})}
                                                        placeholder="예: 백엔드 개발"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직급
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.rank}
                                                        onChange={(e) => setExperienceForm({...experienceForm, rank: e.target.value})}
                                                        placeholder="예: 대리"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직책
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.job_title}
                                                        onChange={(e) => setExperienceForm({...experienceForm, job_title: e.target.value})}
                                                        placeholder="예: 팀장"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    근무부서
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.department}
                                                    onChange={(e) => setExperienceForm({...experienceForm, department: e.target.value})}
                                                    placeholder="예: IT개발팀"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    주요 성과
                                                </label>
                                                <textarea
                                                    value={experienceForm.achievements}
                                                    onChange={(e) => setExperienceForm({...experienceForm, achievements: e.target.value})}
                                                    placeholder="주요 업무 및 성과를 입력하세요"
                                                    rows={4}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem',
                                                        resize: 'vertical'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelExperience}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveExperience}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 경력 목록 - 편집 중이 아닐 때만 표시 */}
                                    {!isEditingExperience && (
                                        experienceList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[...experienceList].sort((a, b) => {
                                                // 재직중인 경우 가장 위로
                                                if (a.is_current && !b.is_current) return -1;
                                                if (!a.is_current && b.is_current) return 1;
                                                // start_date 기준 내림차순 (최신이 위)
                                                const dateA = a.start_date || '';
                                                const dateB = b.start_date || '';
                                                return dateB.localeCompare(dateA);
                                            }).map((exp, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {exp.company}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2px' }}>
                                                            {exp.position && `${exp.position}`}
                                                            {exp.rank && ` | ${exp.rank}`}
                                                            {exp.job_title && ` | ${exp.job_title}`}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2px' }}>
                                                            {exp.department && `${exp.department}`}
                                                            {exp.location && ` | ${exp.location}`}
                                                        </div>
                                                        {exp.start_date && (
                                                            <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '4px' }}>
                                                                {exp.start_date} ~ {exp.is_current ? '재직중' : (exp.end_date || '현재')}
                                                            </div>
                                                        )}
                                                        {exp.achievements && (
                                                            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                                                {exp.achievements}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditExperience(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteExperience(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 경력이 없습니다
                                        </div>
                                    )
                                    )}
                                </div>
                            </>
                        )}

                        {/* 학력/자격/수상 탭 */}
                        {activeTab === 'education' && (
                            <>
                                {/* 학력 섹션 */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🎓</span>
                                            <h3 style={{
                                                fontSize: '1.05rem',
                                                color: '#333',
                                                fontWeight: '600',
                                                margin: 0
                                            }}>학력</h3>
                                        </div>
                                        <button
                                            onClick={handleAddEducation}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                            }}
                                        >
                                            추가
                                        </button>
                                    </div>

                                    {/* 학력 입력 폼 */}
                                    {isEditingEducation && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #2196f3'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    학교명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={educationForm.school}
                                                    onChange={(e) => setEducationForm({...educationForm, school: e.target.value})}
                                                    placeholder="예: 서울대학교"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    전공 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={educationForm.major}
                                                    onChange={(e) => setEducationForm({...educationForm, major: e.target.value})}
                                                    placeholder="예: 컴퓨터공학과"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        학위
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={educationForm.degree}
                                                        onChange={(e) => setEducationForm({...educationForm, degree: e.target.value})}
                                                        placeholder="예: 학사"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        상태
                                                    </label>
                                                    <select
                                                        value={educationForm.status}
                                                        onChange={(e) => setEducationForm({...educationForm, status: e.target.value})}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        <option value="졸업">졸업</option>
                                                        <option value="재학중">재학중</option>
                                                        <option value="휴학">휴학</option>
                                                        <option value="수료">수료</option>
                                                        <option value="중퇴">중퇴</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        입학일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={educationForm.start_date}
                                                        onChange={(e) => setEducationForm({...educationForm, start_date: e.target.value})}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        졸업일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={educationForm.end_date}
                                                        onChange={(e) => setEducationForm({...educationForm, end_date: e.target.value})}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelEducation}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveEducation}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 학력 목록 */}
                                    {educationList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {educationList.map((edu, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {edu.school}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                            {edu.major} | {edu.degree} | {edu.status}
                                                        </div>
                                                        {edu.start_date && (
                                                            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                                                                {edu.start_date} ~ {edu.end_date || '현재'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditEducation(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEducation(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 학력이 없습니다
                                        </div>
                                    )}
                                </div>

                                {/* 자격증 섹션 */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>📜</span>
                                            <h3 style={{
                                                fontSize: '1.05rem',
                                                color: '#333',
                                                fontWeight: '600',
                                                margin: 0
                                            }}>자격증</h3>
                                        </div>
                                        <button
                                            onClick={handleAddCertificate}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                            }}
                                        >
                                            추가
                                        </button>
                                    </div>

                                    {/* 자격증 입력 폼 */}
                                    {isEditingCertificate && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #9c27b0'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    자격증명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={certificateForm.name}
                                                    onChange={(e) => setCertificateForm({...certificateForm, name: e.target.value})}
                                                    placeholder="예: 정보처리기사"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    발행기관
                                                </label>
                                                <input
                                                    type="text"
                                                    value={certificateForm.issuer}
                                                    onChange={(e) => setCertificateForm({...certificateForm, issuer: e.target.value})}
                                                    placeholder="예: 한국산업인력공단"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    취득일
                                                </label>
                                                <input
                                                    type="month"
                                                    value={certificateForm.date}
                                                    onChange={(e) => setCertificateForm({...certificateForm, date: e.target.value})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelCertificate}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveCertificate}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 자격증 목록 */}
                                    {certificatesList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {certificatesList.map((cert, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {cert.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                            {cert.issuer} {cert.date && `| ${cert.date}`}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditCertificate(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCertificate(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 자격증이 없습니다
                                        </div>
                                    )}
                                </div>

                                {/* 어학 섹션 */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🌐</span>
                                            <h3 style={{
                                                fontSize: '1.05rem',
                                                color: '#333',
                                                fontWeight: '600',
                                                margin: 0
                                            }}>어학</h3>
                                        </div>
                                        <button
                                            onClick={handleAddLanguage}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                            }}
                                        >
                                            추가
                                        </button>
                                    </div>

                                    {/* 어학 입력 폼 */}
                                    {isEditingLanguage && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #4caf50'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    언어 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={languageForm.language}
                                                    onChange={(e) => setLanguageForm({...languageForm, language: e.target.value})}
                                                    placeholder="예: 영어"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        수준
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={languageForm.level}
                                                        onChange={(e) => setLanguageForm({...languageForm, level: e.target.value})}
                                                        placeholder="예: 고급"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        점수
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={languageForm.score}
                                                        onChange={(e) => setLanguageForm({...languageForm, score: e.target.value})}
                                                        placeholder="예: 990"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    취득일
                                                </label>
                                                <input
                                                    type="month"
                                                    value={languageForm.date}
                                                    onChange={(e) => setLanguageForm({...languageForm, date: e.target.value})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelLanguage}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveLanguage}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 어학 목록 */}
                                    {languagesList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {languagesList.map((lang, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {lang.language}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                            {lang.level}
                                                            {lang.score && ` | ${lang.score}점`}
                                                            {lang.date && ` | ${lang.date}`}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditLanguage(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLanguage(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 어학 정보가 없습니다
                                        </div>
                                    )}
                                </div>

                                {/* 수상 섹션 */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🏆</span>
                                            <h3 style={{
                                                fontSize: '1.05rem',
                                                color: '#333',
                                                fontWeight: '600',
                                                margin: 0
                                            }}>수상</h3>
                                        </div>
                                        <button
                                            onClick={handleAddAward}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                            }}
                                        >
                                            추가
                                        </button>
                                    </div>

                                    {/* 수상 입력 폼 */}
                                    {isEditingAward && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #ff9800'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    수상명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={awardForm.name}
                                                    onChange={(e) => setAwardForm({...awardForm, name: e.target.value})}
                                                    placeholder="예: 최우수상"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    발행기관
                                                </label>
                                                <input
                                                    type="text"
                                                    value={awardForm.issuer}
                                                    onChange={(e) => setAwardForm({...awardForm, issuer: e.target.value})}
                                                    placeholder="예: 한국산업협회"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    수상일
                                                </label>
                                                <input
                                                    type="month"
                                                    value={awardForm.date}
                                                    onChange={(e) => setAwardForm({...awardForm, date: e.target.value})}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelAward}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveAward}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 수상 목록 */}
                                    {awardsList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {awardsList.map((award, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {award.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                            {award.issuer} {award.date && `| ${award.date}`}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditAward(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAward(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 수상 경력이 없습니다
                                        </div>
                                    )}
                                </div>
                            </>
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
                            <>
                                <div style={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: '15px',
                                    padding: '18px',
                                    marginBottom: '12px'
                                }}>
                                    {/* 헤더 - 수정/추가 중이 아닐 때만 표시 */}
                                    {!isEditingExperience && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>💼</span>
                                                <h3 style={{
                                                    fontSize: '1.05rem',
                                                    color: '#333',
                                                    fontWeight: '600',
                                                    margin: 0
                                                }}>경력</h3>
                                            </div>
                                            <button
                                                onClick={handleAddExperience}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(93, 109, 126, 0.4)'
                                                }}
                                            >
                                                추가
                                            </button>
                                        </div>
                                    )}

                                    {/* 편집 중일 때 헤더 */}
                                    {isEditingExperience && (
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
                                            }}>{editingExperienceIndex !== null ? '경력 수정' : '경력 추가'}</h3>
                                        </div>
                                    )}

                                    {/* 경력 입력 폼 */}
                                    {isEditingExperience && (
                                        <div style={{
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '10px',
                                            marginBottom: '12px',
                                            border: '2px solid #2196f3'
                                        }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    회사명 *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.company}
                                                    onChange={(e) => setExperienceForm({...experienceForm, company: e.target.value})}
                                                    placeholder="예: (주)삼성전자"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    근무지역
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.location}
                                                    onChange={(e) => setExperienceForm({...experienceForm, location: e.target.value})}
                                                    placeholder="예: 서울 강남구"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        입사일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={experienceForm.start_date}
                                                        onChange={(e) => setExperienceForm({...experienceForm, start_date: e.target.value})}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        퇴사일
                                                    </label>
                                                    <input
                                                        type="month"
                                                        value={experienceForm.end_date}
                                                        onChange={(e) => setExperienceForm({...experienceForm, end_date: e.target.value})}
                                                        disabled={experienceForm.is_current}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem',
                                                            backgroundColor: experienceForm.is_current ? '#f5f5f5' : 'white'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#333', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={experienceForm.is_current}
                                                        onChange={(e) => setExperienceForm({
                                                            ...experienceForm,
                                                            is_current: e.target.checked,
                                                            end_date: e.target.checked ? '' : experienceForm.end_date
                                                        })}
                                                        style={{ marginRight: '6px' }}
                                                    />
                                                    재직중
                                                </label>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직무
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.position}
                                                        onChange={(e) => setExperienceForm({...experienceForm, position: e.target.value})}
                                                        placeholder="예: 백엔드 개발"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직급
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.rank}
                                                        onChange={(e) => setExperienceForm({...experienceForm, rank: e.target.value})}
                                                        placeholder="예: 대리"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                        직책
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={experienceForm.job_title}
                                                        onChange={(e) => setExperienceForm({...experienceForm, job_title: e.target.value})}
                                                        placeholder="예: 팀장"
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #ddd',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    근무부서
                                                </label>
                                                <input
                                                    type="text"
                                                    value={experienceForm.department}
                                                    onChange={(e) => setExperienceForm({...experienceForm, department: e.target.value})}
                                                    placeholder="예: IT개발팀"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: '#333' }}>
                                                    주요 성과
                                                </label>
                                                <textarea
                                                    value={experienceForm.achievements}
                                                    onChange={(e) => setExperienceForm({...experienceForm, achievements: e.target.value})}
                                                    placeholder="주요 업무 및 성과를 입력하세요"
                                                    rows={4}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem',
                                                        resize: 'vertical'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={handleCancelExperience}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#e0e0e0',
                                                        color: '#666',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSaveExperience}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(149, 165, 166, 0.3)'
                                                    }}
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 경력 목록 - 편집 중이 아닐 때만 표시 */}
                                    {!isEditingExperience && (
                                        experienceList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[...experienceList].sort((a, b) => {
                                                // 재직중인 경우 가장 위로
                                                if (a.is_current && !b.is_current) return -1;
                                                if (!a.is_current && b.is_current) return 1;
                                                // start_date 기준 내림차순 (최신이 위)
                                                const dateA = a.start_date || '';
                                                const dateB = b.start_date || '';
                                                return dateB.localeCompare(dateA);
                                            }).map((exp, index) => (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.7)',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                                            {exp.company}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2px' }}>
                                                            {exp.position && `${exp.position}`}
                                                            {exp.rank && ` | ${exp.rank}`}
                                                            {exp.job_title && ` | ${exp.job_title}`}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2px' }}>
                                                            {exp.department && `${exp.department}`}
                                                            {exp.location && ` | ${exp.location}`}
                                                        </div>
                                                        {exp.start_date && (
                                                            <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '4px' }}>
                                                                {exp.start_date} ~ {exp.is_current ? '재직중' : (exp.end_date || '현재')}
                                                            </div>
                                                        )}
                                                        {exp.achievements && (
                                                            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                                                {exp.achievements}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                                                        <button
                                                            onClick={() => handleEditExperience(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #7f8c8d 0%, #5d6d7e 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(93, 109, 126, 0.4)'
                                                            }}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteExperience(index)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 1px 4px rgba(255, 105, 180, 0.4)'
                                                            }}
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: '20px',
                                            textAlign: 'center',
                                            color: '#999',
                                            fontSize: '0.9rem'
                                        }}>
                                            등록된 경력이 없습니다
                                        </div>
                                        )
                                    )}
                                </div>
                            </>
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
                    </>
                )}
            </div>
        </div>
    );
}
