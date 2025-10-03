# CommitJob Backend API 응답 데이터 명세서

## 🎯 1. 채용공고 추천 API

**Endpoint:** `GET /api/main-recommendations?user_id=1&jobType=전체`

**응답 데이터:**
```json
{
  "IT": [
    {
      "id": "job_1",
      "title": "백엔드 개발자",
      "company": "네이버",
      "location": ["서울"],
      "experience": "신입",
      "skills": ["Node.js", "Express", "MySQL", "AWS"],
      "salary": "3500-5000만원",
      "jobType": "IT",
      "match_reasons": ["경력 수준 적합 (+20점)"],
      "skill_matches": [],
      "powered_by": "ChatGPT-4 + Catch Data",
      "catch_data": {
        "average_salary": "6,800만원",
        "ceo": "대표이사",
        "company_form": "주식회사",
        "company_name": "네이버",
        "company_type": "대기업",
        "credit_rating": "AAA",
        "employee_count": "1000명 이상",
        "establishment_date": "1999.02.15",
        "industry": "IT/소프트웨어",
        "industry_average_salary": "5,200만원",
        "location": "서울특별시",
        "recommendation_keywords": ["기술력", "혁신", "글로벌"],
        "revenue": "1조원 이상",
        "reviews": [
          {
            "bad_points": "가끔 야근이 있고, 급여 수준이 업계 평균에 비해 아쉬운 편입니다.",
            "employee_info": ["정규직", "경력입사", "3년차"],
            "employee_status": "현직원",
            "good_points": "기술적 도전과 성장 기회가 많은 회사입니다. 동료들과의 협업도 좋고 워라밸도 괜찮습니다.",
            "likes": "156",
            "rating": "4.2",
            "review_date": "2024.09.20"
          }
        ],
        "starting_salary": "4,200만원",
        "tags": ["성장성", "안정성", "워라밸", "복리후생"]
      }
    }
  ],
  "빅데이터": [
    {
      "id": "job_3",
      "title": "빅데이터 엔지니어",
      "company": "삼성전자",
      "location": ["서울"],
      "experience": "경력 1-3년",
      "skills": ["Python", "Spark", "Hadoop", "SQL"],
      "salary": "4000-6000만원",
      "jobType": "빅데이터",
      "match_reasons": ["경력 수준 유사 (+10점)"],
      "skill_matches": [],
      "powered_by": "ChatGPT-4 + Catch Data"
    }
  ]
}
```

---

## 🎤 2. 면접 질문 생성 API

**Endpoint:** `GET /session/interview?user_id=1&job_id=job_1`

**응답 데이터:**
```json
{
  "success": true,
  "job_title": "백엔드 개발자",
  "company": "네이버",
  "questions": [
    {
      "id": 1,
      "question": "자기소개를 해주세요.",
      "category": "인성",
      "difficulty": "쉬움",
      "powered_by": "Fallback Algorithm"
    },
    {
      "id": 2,
      "question": "네이버에 지원한 이유는 무엇인가요?",
      "category": "지원동기",
      "difficulty": "쉬움",
      "powered_by": "Fallback Algorithm"
    }
  ],
  "total_questions": 2,
  "powered_by": "ChatGPT-4 + Catch Data",
  "generated_at": "2025-09-29T13:36:17.153Z"
}
```

---

## 🏢 3. 회사 정보 분석 API

**Endpoint:** `POST /api/company-info`

**요청 데이터:**
```json
{
  "company_name": "삼성전자"
}
```

**응답 데이터:**
```json
{
  "success": true,
  "company_name": "삼성전자",
  "data": {
    "success": true,
    "company_name": "삼성전자",
    "reviews": [
      {
        "id": 1,
        "rating": 4.2,
        "title": "성장할 수 있는 환경",
        "content": "기술적 도전과 성장 기회가 많은 회사입니다. 동료들과의 협업도 좋고 워라밸도 괜찮습니다.",
        "pros": "성장 기회, 좋은 동료, 워라밸",
        "cons": "가끔 야근, 급여 수준",
        "department": "개발",
        "position": "백엔드 개발자",
        "experience": "3년",
        "date": "2024-09-20"
      },
      {
        "id": 2,
        "rating": 3.8,
        "title": "안정적인 회사",
        "content": "대기업이라 복지는 좋지만 혁신적인 기술 도입은 느린 편입니다.",
        "pros": "안정성, 복지, 네임밸류",
        "cons": "보수적 문화, 느린 의사결정",
        "department": "기획",
        "position": "서비스 기획자",
        "experience": "5년",
        "date": "2024-09-15"
      }
    ],
    "summary": "요약을 생성할 수 없습니다.",
    "source": "catch.co.kr",
    "powered_by": "ChatGPT-4 + Catch Data"
  },
  "timestamp": "2025-09-29T13:49:03.905Z"
}
```

---

## 📊 4. 데모 데이터 설정 API

**Endpoint:** `POST /api/setup-demo-data`

**응답 데이터:**
```json
{
  "success": true,
  "message": "Demo data created successfully",
  "created": {
    "companies": 5,
    "jobs": 5,
    "users": 2
  }
}
```

---

## ⚠️ 오류 응답 예시

### 면접 질문 생성 실패
```json
{
  "error": {
    "code": "GPT_INTERVIEW_FAILED"
  }
}
```

### 회사 정보 누락
```json
{
  "error": {
    "code": "MISSING_COMPANY_NAME"
  }
}
```

### 채용공고 없음
```json
{
  "error": {
    "code": "JOB_NOT_FOUND"
  }
}
```

---

## 🚀 중요 정보

- **백엔드 서버**: `http://localhost:4001`
- **Content-Type**: `application/json`
- **CORS**: 모든 Origin 허용
- **파라미터 주의**: 회사 정보 API는 `company_name` 필드 사용
- **GPT 연동**: OpenAI GPT-4 + MCP 서비스 + Catch 데이터 통합