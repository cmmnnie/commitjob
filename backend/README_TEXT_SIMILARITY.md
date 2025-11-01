# AI 추천 시스템 - 텍스트 유사도 기반 매칭

## 개요

AI 추천 시스템을 개선하여 **텍스트 유사도 알고리즘**을 활용한 2단계 필터링 방식으로 변경했습니다.

### 변경 전 (Before)
```
DB 전체 조회 (SQL 매칭) → 상위 20개 선택 → GPT에 전달 → 3개 추천
```

### 변경 후 (After)
```
최근 60건 조회 → 마감일 필터링 → 텍스트 유사도 계산 (fallback 지원) → 상위 20개 선택 → GPT에 전달 (fallback 지원) → 3개 추천
```

---

## 주요 변경사항

### 1. 텍스트 유사도 알고리즘 도입

**사용 라이브러리**: `natural` (TF-IDF 기반 텍스트 유사도)

```bash
npm install natural
```

#### 유사도 계산 방식

**사용자 프로필 텍스트**:
- 희망 직무 (User_Profiles.preferred_jobs)
- 보유 스킬 (User_Profiles.skills)
- 경력 (User_Profiles.experience)
- 희망 지역 (User_Profiles.preferred_regions)

**채용공고 텍스트**:
- 제목 (jobs.title)
- 채용 조건 (jobs.recruitment_conditions) - 자격요건, 우대사항
  - **Fallback**: recruitment_conditions 없으면 conditions 배열 사용
- 직무 상세 설명 (jobs.job_description) - 직무 상세 정보
  - **Fallback**: job_description 없으면 job_info 배열 사용

#### 유사도 점수 계산

1. **TF-IDF 코사인 유사도** (0~1)
   - 사용자 프로필과 채용공고 텍스트 간 코사인 유사도 계산

2. **보너스 점수**
   - 스킬 매칭: +0.05 × 매칭된 스킬 개수
   - 지역 매칭: +0.1 (희망 지역 일치 시)
   - 직무 매칭: +0.15 (희망 직무가 제목에 포함 시)

3. **최종 점수**: `min(코사인 유사도 + 보너스 점수, 1.0)`

---

### 2. 추천 프로세스

#### Step 1: 최근 60건 채용공고 조회
```sql
SELECT j.id, j.company, j.title, j.category, j.url,
       j.job_info, j.conditions, j.company_search_key, j.registration_info,
       j.recruitment_conditions, j.job_description,
       cc.location
FROM jobs j
LEFT JOIN catch_companies cc ON j.company = cc.company
WHERE j.category IN ('BIGDATA_AI', 'IT')
ORDER BY j.scraped_at DESC
LIMIT 60
```

#### Step 2: 마감일 필터링
- `filterActiveJobs()` 함수로 마감된 공고 제외
- 상시채용/수시지원 공고 포함

#### Step 3: 텍스트 유사도 계산
- 마감되지 않은 공고에 대해 유사도 계산
- `title`, `recruitment_conditions` (fallback: `conditions`), `job_description` (fallback: `job_info`) 필드 사용
- Fallback 로직으로 기존 데이터와 호환성 보장
- 유사도 내림차순 정렬

#### Step 4: 상위 20개 선정
- 유사도 점수가 높은 상위 20개 공고 선택
- 로그에 유사도 점수 출력

#### Step 5: GPT-4o-mini 추천
- 상위 20개 공고를 GPT에 전달
- 각 공고의 상세 정보 포함 (fallback 로직 적용)
  - 스킬, 조건, 설명, 지역, 경력 정보
- GPT가 최종 3개 추천

---

## 코드 구조

### 주요 함수

#### `calculateTextSimilarity(userProfile, job)`
**위치**: `server.js:35-107`

**기능**: 사용자 프로필과 채용공고 간 텍스트 유사도 계산

**입력**:
- `userProfile`: 사용자 프로필 객체
  - `skills`: 보유 스킬 배열
  - `jobs`: 희망 직무 배열
  - `preferred_regions`: 희망 지역 배열
  - `experience`: 경력

- `job`: 채용공고 객체
  - `title`: 제목
  - `recruitment_conditions`: 채용 조건 (없으면 `conditions` 배열)
  - `job_description`: 직무 상세 설명 (없으면 `job_info` 배열)
  - `location`: 지역

**출력**: 유사도 점수 (0~1)

#### API 엔드포인트: `GET /api/main-recommendations`
**위치**: `server.js:2163-2650`

**파라미터**:
- `user_id` (required): 사용자 ID
- `jobType` (optional): 직무 타입 (기본값: '전체')

**응답 형식**:
```json
{
  "빅데이터_AI": [
    {
      "id": "1234",
      "title": "데이터 엔지니어",
      "company": "카카오",
      "match_score": 85,
      "match_reasons": [
        "Python, Spark 기술스택 일치",
        "희망 지역(서울) 매칭",
        "경력 요구사항 적합"
      ],
      "similarity_score": 0.78
    }
  ],
  "IT": [...]
}
```

---

## 로그 출력 예시

```
[MAIN-RECS] 사용자 희망직무: 데이터 엔지니어
[MAIN-RECS] 사용자 스킬: Python, Spark, Kafka
[MAIN-RECS] 희망지역: 서울, 경기
[MAIN-RECS] 최근 60건 채용공고 조회 중...
[MAIN-RECS] ✅ DB 조회 완료
[MAIN-RECS]    최근 60건 조회: 60개 -> 마감 필터 후: 52개 공고
[MAIN-RECS] 📊 텍스트 유사도 계산 중 (title, recruitment_conditions (fallback: conditions), job_description (fallback: job_info) 사용)...
[MAIN-RECS] ✅ 텍스트 유사도 계산 완료
[MAIN-RECS]    상위 10개 공고 유사도 점수:
      1. 카카오 - 데이터 엔지니어 (유사도: 78.45%)
      2. 네이버 - 빅데이터 엔지니어 (유사도: 75.23%)
      3. 쿠팡 - 데이터 분석가 (유사도: 72.89%)
      ...
[MAIN-RECS] 🎯 상위 20개 공고 선정 완료 (유사도 78.45% ~ 45.67%)
[MAIN-RECS] 총 20개 공고 준비 완료 (출처: Database + Text Similarity)
[MAIN-RECS] GPT-4o-mini 기반 추천 시작 (텍스트 유사도 상위 20개 전달 → 3개 선택)
[MAIN-RECS] ✅ GPT-4o-mini로 3개 공고 추천 완료
```

---

## 테스트 방법

### 1. 서버 시작
```bash
npm start
# 또는
npm run dev
```

### 2. API 호출 예시
```bash
# 사용자 ID 1번의 추천 공고 조회
curl "http://localhost:3000/api/main-recommendations?user_id=1"
```

### 3. 프론트엔드에서 호출
```javascript
const response = await fetch(
  `http://localhost:3000/api/main-recommendations?user_id=${userId}`
);
const recommendations = await response.json();
```

---

## 성능 개선 효과

### Before (SQL 매칭만 사용)
- ❌ 단순 키워드 매칭으로 관련성 낮은 공고 포함 가능
- ❌ 사용자 프로필의 맥락 고려 부족
- ❌ 직무명이 정확히 일치하지 않으면 누락

### After (텍스트 유사도 + GPT)
- ✅ **최근 60건 제한**: 최신 채용공고만 조회하여 성능 최적화
- ✅ **상세 필드 활용**: `recruitment_conditions`, `job_description` 사용으로 정확도 향상
- ✅ **Fallback 로직**: 기존 `conditions`, `job_info` 배열과 호환성 보장
- ✅ **TF-IDF 기반 의미론적 유사도**: 키워드 매칭을 넘어선 텍스트 유사성 분석
- ✅ **사용자 프로필 전체 고려**: 희망 직무, 스킬, 경력, 지역을 종합적으로 매칭
- ✅ **GPT 효율성 극대화**: 유사도 상위 20개만 전달하여 고품질 추천

---

## 의존성

### 새로 추가된 라이브러리
```json
{
  "dependencies": {
    "natural": "^7.0.7"
  }
}
```

### 기존 라이브러리
- `express`: 웹 서버
- `mysql2`: 데이터베이스 연결
- `openai`: GPT API 호출

---

## 주의사항

1. **마감일 처리**
   - `registration_info` 필드에 마감일 정보가 JSON 배열 형식으로 저장되어 있어야 함
   - 예: `["~11.02(일)", "3일 전 등록"]`

2. **NULL 값 처리**
   - `job_info`, `conditions`, `registration_info`가 NULL이거나 빈 값일 경우 빈 배열로 처리

3. **성능 고려사항**
   - 최근 60건으로 제한하여 유사도 계산 성능 최적화
   - 마감 필터링 후 공고가 20개 미만일 경우 자동으로 전체 전달

4. **Fallback 로직**
   - `recruitment_conditions` 없으면 `conditions` 배열 사용
   - `job_description` 없으면 `job_info` 배열 사용
   - 기존 데이터와 새로운 데이터 모두 지원

---

## 향후 개선 방향

1. **한글 형태소 분석**
   - 현재는 단순 토큰 분리 사용
   - `mecab-ya` 등 한글 형태소 분석기 도입 검토

2. **유사도 가중치 조정**
   - 사용자 피드백 기반으로 보너스 점수 조정
   - A/B 테스트로 최적 가중치 도출

3. **캐싱 도입**
   - 공고별 TF-IDF 벡터 사전 계산 및 캐싱
   - Redis 등 활용하여 성능 개선

4. **추천 결과 학습**
   - 사용자가 선택한 공고 기록
   - 추천 모델 개선을 위한 피드백 루프 구축

---

## 문의 및 이슈

문제가 발생하거나 개선 아이디어가 있으면 개발팀에 문의해주세요.
