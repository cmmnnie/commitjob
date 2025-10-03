# API 엔드포인트 문서 (프론트엔드용)

> **Base URL**: `http://localhost:4001`
> **인증 방식**: JWT 토큰 (HttpOnly Cookie `app_session`)
> **모든 API 요청에 `credentials: 'include'` 필수**

---

##  목차

1. [소셜 로그인](#1-소셜-로그인)
2. [맞춤형 채용공고 추천](#2-맞춤형-채용공고-추천)
3. [맞춤형 면접 기능](#3-맞춤형-면접-기능)
4. [취업 정보 조회](#4-취업-정보-조회)
5. [사용자 프로필](#5-사용자-프로필)

---

## 1. 소셜 로그인

### 1.1 Google 로그인 시작

**Endpoint**: `GET /auth/google`

**설명**: Google OAuth 2.0 인증 페이지로 리디렉션합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| origin | string | ✅ | 프론트엔드 URL (예: `http://localhost:5173`) |

**Example Request**:
```javascript
// 브라우저 리디렉션
window.location.href = `http://localhost:4001/auth/google?origin=${encodeURIComponent(window.location.origin)}`;
```

**Flow**:
1. Google 인증 페이지로 리디렉션
2. 사용자 로그인 완료 후 `/auth/google/callback`로 자동 이동
3. JWT 쿠키 설정 후 `{origin}/auth/callback?ok=1`로 리디렉션

---

### 1.2 Google 콜백 (자동 처리)

**Endpoint**: `GET /auth/google/callback`

**설명**: Google에서 자동으로 호출하는 콜백 엔드포인트입니다. 프론트엔드에서 직접 호출하지 않습니다.

**Response**: 프론트엔드로 리디렉션
- 성공: `{origin}/auth/callback?ok=1`
- 실패: `{origin}/auth/callback?ok=0`

---

### 1.3 Kakao 로그인 시작 (방법 1: 직접 리디렉션)

**Endpoint**: `GET /auth/kakao`

**설명**: Kakao OAuth 2.0 인증 페이지로 리디렉션합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| origin | string | ✅ | 프론트엔드 URL |

**Example Request**:
```javascript
window.location.href = `http://localhost:4001/auth/kakao?origin=${encodeURIComponent(window.location.origin)}`;
```

---

### 1.4 Kakao 로그인 URL 받기 (방법 2: URL 받아서 리디렉션)

**Endpoint**: `GET /auth/kakao/login-url`

**설명**: Kakao 인증 URL을 JSON으로 반환합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| origin | string | ✅ | 프론트엔드 URL |

**Response**:
```json
{
  "url": "https://kauth.kakao.com/oauth/authorize?client_id=...&state=...",
  "state": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Request**:
```javascript
const response = await fetch(
  `http://localhost:4001/auth/kakao/login-url?origin=${encodeURIComponent(window.location.origin)}`
);
const data = await response.json();
window.location.href = data.url;
```

---

### 1.5 Kakao 콜백 (자동 처리)

**Endpoint**: `GET /auth/kakao/callback`

**설명**: Kakao에서 자동으로 호출하는 콜백 엔드포인트입니다.

**Response**: 프론트엔드로 리디렉션
- 성공: `{origin}/auth/callback?ok=1`
- 실패: `{origin}/auth/callback?ok=0`

---

### 1.6 현재 로그인 사용자 조회

**Endpoint**: `GET /api/me`

**설명**: JWT 쿠키를 통해 현재 로그인된 사용자 정보를 반환합니다.

**인증**: 필수 (Cookie: `app_session`)

**Response**:
```json
{
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "name": "홍길동",
    "picture": "https://lh3.googleusercontent.com/...",
    "provider": "google",
    "provider_key": "google:123456789",
    "created_at": "2024-10-01T12:00:00.000Z",
    "updated_at": "2024-10-01T12:00:00.000Z"
  }
}
```

**Error Response (401)**:
```json
{
  "user": null
}
```

**Example Request**:
```javascript
const response = await fetch('http://localhost:4001/api/me', {
  credentials: 'include', // 쿠키 전송
});

if (response.ok) {
  const { user } = await response.json();
  console.log('로그인됨:', user);
} else {
  console.log('로그인되지 않음');
}
```

---

### 1.7 로그아웃

**Endpoint**: `POST /api/logout`

**설명**: JWT 쿠키를 삭제하여 로그아웃합니다.

**인증**: 필수 (Cookie: `app_session`)

**Response**:
```json
{
  "ok": true
}
```

**Example Request**:
```javascript
await fetch('http://localhost:4001/api/logout', {
  method: 'POST',
  credentials: 'include',
});
// 로그인 페이지로 이동
navigate('/login');
```

---

## 2. 맞춤형 채용공고 추천

### 2.1 메인 채용공고 추천 (Catch + GPT)

**Endpoint**: `GET /api/main-recommendations`

**설명**: Catch 스크래퍼에서 실시간 채용공고를 수집하고, ChatGPT-4를 통해 사용자 맞춤형 추천을 생성합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |
| jobType | string | ❌ | 직무 유형 (기본값: `전체`) |

**Response**:
```json
{
  "success": true,
  "user_id": 1,
  "jobType": "전체",
  "recommendations": [
    {
      "job_id": "catch_job_1",
      "company": "한국타이어앤테크놀로지",
      "title": "[경력] IT 개발자",
      "location": "대전",
      "deadline": "2024.10.31",
      "experience": "경력 3~10년",
      "education": "학력무관",
      "employment_type": "정규직",
      "skills": ["Python", "Java", "AWS"],
      "job_description": "IT 시스템 개발 및 운영...",
      "url": "https://www.catch.co.kr/...",
      "match_score": 85,
      "match_reasons": [
        "사용자의 Python 스킬과 정확히 일치합니다",
        "경력 요구사항(3~10년)이 사용자 프로필과 부합합니다",
        "클라우드 경험을 활용할 수 있는 AWS 기술 스택이 포함되어 있습니다",
        "대전 지역은 사용자의 선호 지역 중 하나입니다",
        "정규직 채용으로 안정적인 커리어 발전이 가능합니다"
      ],
      "detailed_analysis": "이 포지션은 귀하의 프로필과 매우 잘 맞습니다. 특히 Python과 AWS 경험을 바로 활용할 수 있으며, 대기업 환경에서 안정적인 커리어를 쌓을 수 있는 좋은 기회입니다..."
    }
    // ... 4~9개의 추천 공고
  ],
  "total_jobs_collected": 20,
  "total_recommendations": 5,
  "timestamp": "2024-10-02T14:30:00.000Z"
}
```

**Example Request**:
```javascript
const response = await fetch(
  `http://localhost:4001/api/main-recommendations?user_id=1&jobType=전체`,
  { credentials: 'include' }
);
const data = await response.json();
console.log(`${data.total_recommendations}개의 맞춤형 추천 받음`);
```

**처리 시간**: 첫 요청 3-4분 (초기화 + 로그인 + 스크래핑 + GPT 분석), 이후 요청은 더 빠름

---

### 2.2 회사 추천 (입력 조건 기반)

**Endpoint**: `POST /api/company-recommendations`

**설명**: 사용자가 입력한 조건에 따라 회사를 추천합니다.

**Request Body**:
```json
{
  "user_id": 1,
  "additional_preferences": {
    "preferred_job": "프론트엔드 개발자",
    "company_size": "대기업",
    "industry": "IT/소프트웨어",
    "additional_skills": ["React", "TypeScript"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "user_id": 1,
  "recommendations": [
    {
      "name": "네이버",
      "description": "국내 최대 포털 및 IT 서비스 기업",
      "industry": "IT/소프트웨어",
      "size": "대기업",
      "location": "경기 성남",
      "position": "프론트엔드 개발자"
    }
    // ... 더 많은 추천
  ]
}
```

**Example Request**:
```javascript
const response = await fetch('http://localhost:4001/api/company-recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 1,
    additional_preferences: {
      preferred_job: "백엔드 개발자",
      company_size: "중견기업",
      industry: "핀테크"
    }
  })
});
```

---

### 2.3 사용자 추천 히스토리 조회

**Endpoint**: `GET /api/user-recommendation-history`

**설명**: 사용자의 과거 추천 기록을 조회합니다.

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |

**Response**:
```json
{
  "success": true,
  "user_id": 1,
  "history": [
    {
      "id": 1,
      "job_id": "catch_job_1",
      "company": "한국타이어앤테크놀로지",
      "position": "IT 개발자",
      "match_score": 85,
      "created_at": "2024-10-02T14:30:00.000Z"
    }
  ]
}
```

---

## 3. 맞춤형 면접 기능

### 3.1 면접 질문 생성

**Endpoint**: `POST /api/interview-questions`

**설명**: ChatGPT-4를 활용하여 회사와 포지션에 맞춤화된 면접 질문을 생성합니다. Catch 스크래퍼를 통해 회사 정보와 리뷰를 수집한 후 면접 질문을 생성합니다.

**Request Body**:
```json
{
  "user_id": 1,
  "job_id": "catch_job_1",
  "custom_company": "네이버",
  "custom_position": "프론트엔드 개발자",
  "user_profile": {
    "name": "홍길동",
    "skills": ["React", "TypeScript", "Node.js"],
    "experience": "경력 3년",
    "position": "프론트엔드 개발자"
  },
  "additional_preferences": {
    "preferred_job": "프론트엔드 개발자",
    "difficulty": "intermediate",
    "question_count": 8
  }
}
```

**Request Parameters 설명**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |
| job_id | string | ❌ | 채용공고 ID (DB에서 조회) |
| custom_company | string | ❌ | 직접 입력한 회사명 (job_id 없을 때 사용) |
| custom_position | string | ❌ | 직접 입력한 포지션 |
| user_profile | object | ❌ | 사용자 프로필 정보 |
| additional_preferences | object | ❌ | 추가 설정 (난이도, 질문 수 등) |

**Response**:
```json
{
  "success": true,
  "user_id": 1,
  "company": "네이버",
  "position": "프론트엔드 개발자",
  "questions": [
    {
      "id": 1,
      "question": "React에서 useEffect의 의존성 배열은 어떻게 작동하며, 빈 배열과 생략했을 때의 차이는 무엇인가요?",
      "category": "기술면접",
      "difficulty": "intermediate",
      "expected_answer_points": [
        "useEffect는 컴포넌트가 렌더링될 때마다 실행됩니다",
        "의존성 배열에 포함된 값이 변경될 때만 effect가 재실행됩니다",
        "빈 배열([])을 전달하면 컴포넌트가 마운트될 때 한 번만 실행됩니다",
        "생략하면 모든 렌더링마다 실행됩니다"
      ],
      "context": "네이버는 React를 주력 프론트엔드 기술 스택으로 사용하고 있으며, React Hooks에 대한 깊은 이해를 요구합니다."
    },
    {
      "id": 2,
      "question": "대규모 트래픽을 처리하는 네이버 서비스에서 프론트엔드 성능 최적화를 위해 어떤 전략을 사용하시겠습니까?",
      "category": "경험/상황면접",
      "difficulty": "advanced",
      "expected_answer_points": [
        "코드 스플리팅 (Code Splitting)을 통한 초기 로딩 시간 단축",
        "이미지 최적화 (WebP, lazy loading)",
        "캐싱 전략 (CDN, Service Worker)",
        "번들 사이즈 최적화 (Tree shaking, 동적 import)"
      ],
      "context": "네이버는 하루 수억 건의 요청을 처리하는 대규모 서비스입니다. 성능 최적화 경험이 중요합니다."
    }
    // ... 총 8개의 질문
  ],
  "company_info": {
    "name": "네이버",
    "description": "국내 최대 포털 및 IT 서비스 기업",
    "reviews": [
      {
        "rating": 4.5,
        "pros": "최신 기술 스택 사용, 좋은 복지",
        "cons": "높은 업무 강도"
      }
    ]
  },
  "total_questions": 8,
  "timestamp": "2024-10-02T15:00:00.000Z"
}
```

**Example Request**:
```javascript
const response = await fetch('http://localhost:4001/api/interview-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    user_id: 1,
    custom_company: "카카오",
    custom_position: "백엔드 개발자",
    user_profile: {
      skills: ["Java", "Spring Boot", "MySQL"],
      experience: "경력 2년"
    },
    additional_preferences: {
      difficulty: "mixed",
      question_count: 10
    }
  })
});

const data = await response.json();
console.log(`${data.total_questions}개의 맞춤형 면접 질문 생성 완료`);
```

**처리 시간**: 2-3분 (Catch 스크래퍼 회사 정보 수집 + GPT 질문 생성)

---

## 4. 취업 정보 조회

### 4.1 회사 정보 검색 (Catch)

**Endpoint**: `POST /api/search-company-info`

**설명**: Catch 스크래퍼를 통해 실시간으로 회사 정보와 리뷰를 수집합니다.

**Request Body**:
```json
{
  "company_name": "삼성전자"
}
```

**Response**:
```json
{
  "success": true,
  "company_name": "삼성전자",
  "company_info": {
    "name": "삼성전자",
    "description": "글로벌 전자기업",
    "industry": "전자/반도체",
    "size": "대기업",
    "location": "경기 수원",
    "website": "https://www.samsung.com",
    "reviews": [
      {
        "rating": 4.2,
        "pros": "글로벌 경험, 좋은 복지, 브랜드 가치",
        "cons": "높은 업무 강도, 수직적 문화",
        "reviewer_position": "엔지니어",
        "date": "2024-09"
      }
    ],
    "total_reviews": 1234
  }
}
```

---

### 4.2 자기소개서 샘플 조회

**Endpoint**: `POST /api/job-essays`

**설명**: 특정 회사/포지션에 대한 합격 자기소개서 샘플을 조회합니다.

**Request Body**:
```json
{
  "company_name": "네이버",
  "job_position": "프론트엔드 개발자"
}
```

**Response**:
```json
{
  "success": true,
  "company_name": "네이버",
  "job_position": "프론트엔드 개발자",
  "essays": [
    {
      "question": "지원 동기를 작성해주세요",
      "answer": "네이버의 검색 기술과 사용자 경험 혁신에 깊은 관심을 가지고 있습니다...",
      "year": 2024,
      "result": "합격"
    }
  ]
}
```

---

### 4.3 취업 꿀팁 조회

**Endpoint**: `POST /api/job-tips`

**설명**: 특정 회사/포지션의 면접 후기 및 취업 꿀팁을 조회합니다.

**Request Body**:
```json
{
  "company_name": "카카오",
  "job_position": "백엔드 개발자"
}
```

**Response**:
```json
{
  "success": true,
  "company_name": "카카오",
  "job_position": "백엔드 개발자",
  "tips": [
    {
      "category": "면접",
      "tip": "코딩 테스트는 알고리즘 문제 2~3개, 90분 제한. 효율성이 중요합니다.",
      "author": "합격자",
      "date": "2024-09"
    },
    {
      "category": "자소서",
      "tip": "카카오의 핵심 가치(사용자 중심, 혁신)를 자소서에 녹여내는 것이 중요합니다.",
      "author": "인사담당자",
      "date": "2024-08"
    }
  ]
}
```

---

### 4.4 종합 취업 정보 조회 (통합 API)

**Endpoint**: `POST /api/comprehensive-job-info`

**설명**: 회사 정보 + 자소서 샘플 + 꿀팁을 한 번에 조회합니다. (병렬 처리로 빠름)

**Request Body**:
```json
{
  "company_name": "라인",
  "job_position": "프론트엔드 개발자"
}
```

**Response**:
```json
{
  "success": true,
  "company_name": "라인",
  "job_position": ["프론트엔드 개발자"],
  "timestamp": "2024-10-02T15:30:00.000Z",
  "data": {
    "company_info": {
      "success": true,
      "company_name": "라인",
      "reviews": [...]
    },
    "job_essays": {
      "success": true,
      "essays": [...]
    },
    "job_tips": {
      "success": true,
      "tips": [...]
    }
  }
}
```

**Example Request**:
```javascript
const response = await fetch('http://localhost:4001/api/comprehensive-job-info', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    company_name: "토스",
    job_position: "백엔드 개발자"
  })
});

const data = await response.json();
console.log('회사 정보:', data.data.company_info);
console.log('자소서 샘플:', data.data.job_essays);
console.log('취업 꿀팁:', data.data.job_tips);
```

---

## 5. 사용자 프로필

### 5.1 사용자 프로필 상세 조회

**Endpoint**: `GET /api/userprofile`

**설명**: `/api/me`와 동일한 기능을 제공하는 별칭 엔드포인트입니다.

**인증**: 필수 (Cookie: `app_session`)

**Response**: `/api/me`와 동일

---

### 5.2 사용자 프로필 업데이트

**Endpoint**: `POST /api/profile`

**설명**: 사용자 프로필 정보를 업데이트합니다. 이력서 파일 업로드도 지원합니다.

**인증**: 필수 (Cookie: `app_session`)

**Content-Type**: `multipart/form-data`

**Request Body (Form Data)**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |
| skills | string | ❌ | 기술 스택 (JSON 배열 또는 쉼표 구분) |
| experience | string | ❌ | 경력 (예: "신입", "경력 3년") |
| preferred_regions | string | ❌ | 선호 지역 (JSON 배열 또는 쉼표 구분) |
| preferred_jobs | string | ❌ | 선호 직무 |
| expected_salary | integer | ❌ | 희망 연봉 (만원 단위) |
| resume | file | ❌ | 이력서 파일 (PDF, DOCX 등) |

**Response**:
```json
{
  "success": true,
  "message": "프로필이 업데이트되었습니다",
  "profile": {
    "user_id": 1,
    "skills": ["React", "TypeScript", "Node.js"],
    "experience": "경력 3년",
    "preferred_regions": ["서울", "경기"],
    "preferred_jobs": "프론트엔드 개발자",
    "expected_salary": 5000,
    "resume_filename": "resume_1_1696234567890.pdf"
  }
}
```

**Example Request**:
```javascript
const formData = new FormData();
formData.append('user_id', '1');
formData.append('skills', JSON.stringify(['React', 'TypeScript', 'Node.js']));
formData.append('experience', '경력 3년');
formData.append('preferred_regions', JSON.stringify(['서울', '경기']));
formData.append('preferred_jobs', '프론트엔드 개발자');
formData.append('expected_salary', '5000');
formData.append('resume', fileInput.files[0]);

const response = await fetch('http://localhost:4001/api/profile', {
  method: 'POST',
  credentials: 'include',
  body: formData
});
```

---

### 5.3 자기소개서 파일 업로드

**Endpoint**: `POST /api/cover-letter/upload`

**설명**: 자기소개서 파일을 업로드합니다.

**인증**: 필수 (Cookie: `app_session`)

**Content-Type**: `multipart/form-data`

**Request Body (Form Data)**:
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |
| cover_letter | file | ✅ | 자기소개서 파일 |

**Response**:
```json
{
  "success": true,
  "message": "자기소개서가 업로드되었습니다",
  "filename": "cover_letter_1_1696234567890.pdf",
  "path": "/uploads/cover_letters/cover_letter_1_1696234567890.pdf"
}
```

---

### 5.4 자기소개서 파일 다운로드

**Endpoint**: `GET /api/cover-letter/download/:filename`

**설명**: 업로드된 자기소개서 파일을 다운로드합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| filename | string | ✅ | 파일명 |

**Example Request**:
```javascript
window.location.href = 'http://localhost:4001/api/cover-letter/download/cover_letter_1_1696234567890.pdf';
```

---

### 5.5 자기소개서 목록 조회

**Endpoint**: `GET /api/cover-letter/list/:user_id`

**설명**: 특정 사용자의 모든 자기소개서 목록을 조회합니다.

**Path Parameters**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| user_id | integer | ✅ | 사용자 ID |

**Response**:
```json
{
  "success": true,
  "user_id": 1,
  "cover_letters": [
    {
      "filename": "cover_letter_1_1696234567890.pdf",
      "uploaded_at": "2024-10-02T15:30:00.000Z",
      "size": 102400
    }
  ]
}
```

---

## 6. 공통 사항

### 6.1 CORS 설정

프론트엔드에서 API 요청 시 반드시 `credentials: 'include'`를 포함해야 합니다.

```javascript
// ✅ 올바른 방법
fetch('http://localhost:4001/api/me', {
  credentials: 'include', // 쿠키 전송
});

// ❌ 잘못된 방법
fetch('http://localhost:4001/api/me'); // 쿠키 미전송, 인증 실패
```

### 6.2 에러 응답 형식

모든 API는 에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

**주요 에러 코드**:
| 코드 | 설명 |
|------|------|
| `MISSING_USER_ID` | 사용자 ID가 누락됨 |
| `MISSING_COMPANY_NAME` | 회사명이 누락됨 |
| `INVALID_STATE` | OAuth state 검증 실패 |
| `NO_SESSION` | 세션이 존재하지 않음 |
| `CATCH_SCRAPING_FAILED` | Catch 스크래핑 실패 |
| `GPT_RECOMMENDATION_FAILED` | GPT 추천 생성 실패 |

### 6.3 인증 흐름

1. 소셜 로그인 (`/auth/google` 또는 `/auth/kakao`)
2. 콜백 처리 (`/auth/callback?ok=1`)
3. JWT 쿠키 자동 설정 (`app_session`)
4. 이후 모든 API 요청에 쿠키 자동 전송 (`credentials: 'include'`)
5. 로그아웃 시 쿠키 삭제 (`/api/logout`)

### 6.4 환경별 Base URL

| 환경 | Base URL |
|------|----------|
| 개발 (로컬) | `http://localhost:4001` |
| 프로덕션 | TBD (배포 후 업데이트) |

---

## 7. 코딩테스트 문제 수집

> **주의**: 현재 백엔드 코드에서 코딩테스트 관련 엔드포인트가 명시적으로 발견되지 않았습니다.
> 이 기능이 구현 예정이거나 다른 이름으로 존재할 수 있습니다.

**예상 엔드포인트** (구현 필요 시):
- `GET /api/coding-problems` - 코딩테스트 문제 목록 조회
- `GET /api/coding-problems/:id` - 특정 문제 상세 조회
- `POST /api/coding-problems/submit` - 코딩테스트 문제 제출

이 부분은 백엔드 팀과 확인 후 업데이트 예정입니다.

---

## 📚 참고 문서

- **소셜 로그인 상세 가이드**: `/social-login-package/docs/SOCIAL_LOGIN_GUIDE.md`
- **Catch 연동 가이드**: `/catch-integration-package/INTEGRATION_REPORT.md`
- **API 예시 (React)**: `/social-login-package/docs/API_EXAMPLES.md`

---

**문서 버전**: 1.0
**최종 업데이트**: 2024-10-02
**작성자**: Backend Team
