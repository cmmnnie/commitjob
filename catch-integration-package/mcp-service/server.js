import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// OpenAI 클라이언트 초기화 (API 키가 있을 때만)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI API 연결됨');
} else {
  console.log('⚠️ OpenAI API 키가 설정되지 않았습니다. Fallback 알고리즘을 사용합니다.');
}

// 캐치 서비스 연결 설정
const CATCH_SERVICE_URL = process.env.CATCH_SERVICE_URL || 'http://localhost:3000';
const DEV_MODE = process.env.DEV_MODE === 'true';

app.use(cors());
app.use(express.json());

// 건강 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CommitJob MCP Service with ChatGPT + Catch Integration',
    features: ['job_recommendations', 'interview_questions', 'company_reviews', 'job_tips', 'job_essays'],
    openai_enabled: !!openai,
    catch_service: CATCH_SERVICE_URL,
    dev_mode: DEV_MODE
  });
});

// 공고 추천 API (ChatGPT 기반)
app.post('/tools/rerank_jobs', async (req, res) => {
  try {
    const { user_profile, job_candidates, limit = 5 } = req.body;

    console.log('[RERANK_JOBS] ChatGPT 기반 추천 요청:', {
      user_profile: user_profile ? Object.keys(user_profile) : null,
      candidates_count: job_candidates?.length || 0,
      limit
    });

    // GPT에게 넘기는 공고 목록 출력
    console.log('[RERANK_JOBS] GPT에게 전달되는 공고 목록:');
    job_candidates.forEach((job, idx) => {
      console.log(`  [${idx + 1}] ${job.company} - ${job.title}`);
      console.log(`      직무: ${job.position || 'N/A'}, 경력: ${job.experience || 'N/A'}`);
      console.log(`      지역: ${job.location || 'N/A'}, 연봉: ${job.salary || 'N/A'}`);
      console.log(`      필요 스킬: ${job.required_skills?.join(', ') || 'N/A'}`);
    });

    if (!user_profile || !Array.isArray(job_candidates)) {
      return res.status(400).json({
        error: 'Invalid input: user_profile and job_candidates array required'
      });
    }

    // ChatGPT로 실제 공고 순위 매기기
    const recommendations = await generateChatGPTRecommendations(user_profile, job_candidates, limit);

    res.json({
      success: true,
      recommendations,
      total_candidates: job_candidates.length,
      returned_count: recommendations.length,
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    });

  } catch (error) {
    console.error('[RERANK_JOBS] Error:', error);
    res.status(500).json({ error: 'ChatGPT API 오류가 발생했습니다.' });
  }
});

// 면접 질문 생성 API (ChatGPT 기반)
app.post('/tools/generate_interview', async (req, res) => {
  try {
    const { user_profile, job_detail } = req.body;

    console.log('[GENERATE_INTERVIEW] ChatGPT 기반 면접 질문 요청:', {
      user_profile: user_profile ? Object.keys(user_profile) : null,
      job_detail: job_detail ? Object.keys(job_detail) : null
    });

    if (!user_profile || !job_detail) {
      return res.status(400).json({
        error: 'Invalid input: user_profile and job_detail required'
      });
    }

    // ChatGPT로 개인화된 면접 질문 생성
    const questions = await generateChatGPTInterviewQuestions(user_profile, job_detail);

    res.json({
      success: true,
      questions,
      job_title: job_detail.title || 'Unknown Position',
      company: job_detail.company || 'Unknown Company',
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    });

  } catch (error) {
    console.error('[GENERATE_INTERVIEW] Error:', error);
    res.status(500).json({ error: 'ChatGPT API 오류가 발생했습니다.' });
  }
});

// 캐치 채용 기업 리뷰 수집 API
app.post('/tools/get_company_reviews', async (req, res) => {
  try {
    const { company_name } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'company_name is required' });
    }

    console.log('[COMPANY_REVIEWS] 기업 리뷰 수집 요청:', company_name);

    const reviews = await getCatchCompanyReviews(company_name);
    const summary = await summarizeWithChatGPT(reviews, 'company_reviews');

    res.json({
      success: true,
      company_name,
      reviews,
      summary,
      source: 'catch.co.kr',
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    });

  } catch (error) {
    console.error('[COMPANY_REVIEWS] Error:', error);
    res.status(500).json({ error: '기업 리뷰 수집 중 오류가 발생했습니다.' });
  }
});

// 캐치 채용 합격 자소서 정보 수집 API
app.post('/tools/get_job_essays', async (req, res) => {
  try {
    const { company_name, job_position } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'company_name is required' });
    }

    console.log('[JOB_ESSAYS] 합격 자소서 수집 요청:', { company_name, job_position });

    const essays = await getCatchJobEssays(company_name, job_position);
    const analysis = await summarizeWithChatGPT(essays, 'job_essays');

    res.json({
      success: true,
      company_name,
      job_position: job_position || 'All positions',
      essays,
      analysis,
      source: 'catch.co.kr',
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    });

  } catch (error) {
    console.error('[JOB_ESSAYS] Error:', error);
    res.status(500).json({ error: '합격 자소서 수집 중 오류가 발생했습니다.' });
  }
});

// 캐치 채용 지원 꿀팁 수집 API
app.post('/tools/get_job_tips', async (req, res) => {
  try {
    const { company_name, job_position } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'company_name is required' });
    }

    console.log('[JOB_TIPS] 지원 꿀팁 수집 요청:', { company_name, job_position });

    const tips = await getCatchJobTips(company_name, job_position);
    const organizedTips = await organizeWithChatGPT(tips, 'job_tips');

    res.json({
      success: true,
      company_name,
      job_position: job_position || 'All positions',
      tips,
      organized_tips: organizedTips,
      source: 'catch.co.kr',
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    });

  } catch (error) {
    console.error('[JOB_TIPS] Error:', error);
    res.status(500).json({ error: '지원 꿀팁 수집 중 오류가 발생했습니다.' });
  }
});

// 캐치 데이터와 함께하는 Enhanced 추천 함수
async function generateEnhancedRecommendations(userProfile, jobCandidates, limit) {
  try {
    console.log('[GPT_JOBS] GPT로 실시간 채용공고 생성 시작');

    // 1. GPT로 사용자 맞춤형 채용공고 생성 (데모 데이터 대신)
    let recommendations = await generateGPTJobRecommendations(userProfile, limit);

    // 2. 캐치 데이터로 추천 강화
    for (let job of recommendations) {
      try {
        // 회사별 캐치 데이터 가져오기
        const catchData = await fetchCatchCompanyData(job.company);

        if (catchData) {
          // 캐치 데이터를 바탕으로 매칭 이유 추가
          const catchReasons = getCatchMatchReasons(catchData, userProfile);
          job.catch_data = catchData;

          // 매칭 이유에 캐치 기반 정보 추가
          if (catchReasons.length > 0) {
            job.match_reasons.push(...catchReasons);
          }
        }
      } catch (error) {
        console.error(`캐치 데이터 가져오기 실패 for ${job.company}:`, error);
      }
    }

    // 3. ChatGPT로 추가 분석 (API 키가 있을 때만)
    if (openai) {
      try {
        recommendations = await enhanceWithChatGPT(userProfile, recommendations, limit);
      } catch (error) {
        console.error('ChatGPT 분석 실패:', error);
      }
    }

    // 4. 최종 매칭 이유 개수순 정렬
    return recommendations
      .sort((a, b) => {
        return (b.match_reasons?.length || 0) - (a.match_reasons?.length || 0);
      })
      .slice(0, limit);

  } catch (error) {
    console.error('Enhanced 추천 생성 실패:', error);
    return generateJobRecommendations(userProfile, jobCandidates, limit);
  }
}

// 캐치 데이터와 함께하는 Enhanced 면접 질문 함수
async function generateEnhancedInterviewQuestions(userProfile, jobDetail) {
  try {
    // 1. 기본 면접 질문 생성
    let questions = generateInterviewQuestions(userProfile, jobDetail);

    // 2. 캐치 데이터 가져오기
    const catchData = await fetchCatchCompanyData(jobDetail.company);

    if (catchData) {
      // 캐치 데이터를 바탕으로 질문 추가
      const catchQuestions = generateCatchBasedQuestions(catchData, jobDetail);
      questions = questions.concat(catchQuestions);
    }

    // 3. ChatGPT로 추가 분석 (API 키가 있을 때만)
    if (openai) {
      try {
        questions = await enhanceQuestionsWithChatGPT(userProfile, jobDetail, questions, catchData);
      } catch (error) {
        console.error('ChatGPT 질문 분석 실패:', error);
      }
    }

    // 4. 중복 제거 및 최적화
    const uniqueQuestions = [...new Set(questions.map(q => q.question))];
    return uniqueQuestions.slice(0, 15).map((question, index) => ({
      id: index + 1,
      question,
      category: categorizeQuestion(question),
      difficulty: getQuestionDifficulty(question),
      powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
    }));

  } catch (error) {
    console.error('Enhanced 면접 질문 생성 실패:', error);
    return generateInterviewQuestions(userProfile, jobDetail);
  }
}

// 캐치 회사 데이터 가져오기
async function fetchCatchCompanyData(companyName) {
  try {
    const response = await axios.post(`${CATCH_SERVICE_URL}/api/search-company-info`, {
      company_name: companyName
    }, {
      timeout: 5000
    });

    if (response.data && response.data.success) {
      return response.data.company_detail;
    }
    return null;
  } catch (error) {
    console.error(`캐치 데이터 가져오기 실패 (${companyName}):`, error.message);
    return null;
  }
}

// 캐치 데이터 기반 매칭 이유 생성
function getCatchMatchReasons(catchData, userProfile) {
  const reasons = [];

  // 리뷰 점수 기반 매칭
  if (catchData.reviews && catchData.reviews.length > 0) {
    const avgRating = catchData.reviews.reduce((sum, review) => {
      const rating = parseFloat(review.rating) || 0;
      return sum + rating;
    }, 0) / catchData.reviews.length;

    if (avgRating >= 4.0) reasons.push('높은 직원 만족도');
    else if (avgRating >= 3.5) reasons.push('양호한 직원 만족도');
  }

  // 회사 태그 매칭
  if (catchData.tags && userProfile.preferred_company_culture) {
    const userPreferences = userProfile.preferred_company_culture.map(p => p.toLowerCase());
    const companyTags = catchData.tags.map(t => t.toLowerCase());
    const matches = userPreferences.filter(pref =>
      companyTags.some(tag => tag.includes(pref) || pref.includes(tag))
    );
    if (matches.length > 0) {
      reasons.push(`선호 기업문화 일치: ${matches.join(', ')}`);
    }
  }

  // 급여 정보 매칭
  if (catchData.average_salary && userProfile.expected_salary) {
    const companySalary = parseFloat(catchData.average_salary.replace(/[^0-9]/g, '')) || 0;
    const expectedSalary = parseFloat(userProfile.expected_salary) || 0;

    if (companySalary >= expectedSalary * 0.8) {
      reasons.push('희망 급여 수준 충족');
    }
  }

  return reasons;
}

// 캐치 데이터 기반 추가 질문 생성
function generateCatchBasedQuestions(catchData, jobDetail) {
  const questions = [];

  // 리뷰 기반 질문
  if (catchData.reviews && catchData.reviews.length > 0) {
    const commonGoodPoints = extractCommonPoints(catchData.reviews, 'good_points');
    const commonBadPoints = extractCommonPoints(catchData.reviews, 'bad_points');

    if (commonGoodPoints.length > 0) {
      questions.push({
        question: `${jobDetail.company}의 장점으로 ${commonGoodPoints[0]}이 언급되는데, 이에 대한 본인의 생각은?`,
        category: '회사',
        difficulty: '보통'
      });
    }

    if (commonBadPoints.length > 0) {
      questions.push({
        question: `일부 직원들이 ${commonBadPoints[0]}을 아쉬워하는데, 이런 환경에서도 잘 적응할 수 있나요?`,
        category: '회사',
        difficulty: '어려움'
      });
    }
  }

  // 회사 문화 기반 질문
  if (catchData.tags && catchData.tags.length > 0) {
    questions.push({
      question: `${jobDetail.company}는 ${catchData.tags.slice(0, 2).join(', ')} 문화로 유명한데, 이런 환경을 선호하는 이유는?`,
      category: '회사',
      difficulty: '보통'
    });
  }

  return questions;
}

// 공통 키워드 추출
function extractCommonPoints(reviews, field) {
  const allPoints = reviews.map(review => review[field] || '').join(' ');
  const keywords = ['성장', '워라밸', '복지', '야근', '급여', '문화', '동료', '업무'];

  return keywords.filter(keyword => allPoints.includes(keyword));
}

// ChatGPT로 추천 강화 (API 키가 있을 때만)
async function enhanceWithChatGPT(userProfile, recommendations, limit) {
  if (!openai) return recommendations;

  try {
    // ChatGPT 기존 함수 활용
    const jobCandidates = recommendations.map(rec => ({
      job_id: rec.job_id,
      title: rec.title,
      company: rec.company,
      skills: rec.skills,
      experience: rec.experience,
      location: rec.location,
      salary: rec.salary
    }));

    const chatGPTRecommendations = await generateChatGPTRecommendations(userProfile, jobCandidates, limit);

    // ChatGPT 결과와 캐치 데이터 결합 (점수 제거)
    return chatGPTRecommendations.map(chatRec => {
      const originalRec = recommendations.find(rec => rec.job_id === chatRec.job_id);
      const { recommendation_score, ...restChatRec } = chatRec;
      const { recommendation_score: origScore, ...restOrigRec } = originalRec || {};
      return {
        ...restOrigRec,
        ...restChatRec,
        powered_by: 'ChatGPT-4 + Catch Data'
      };
    });

  } catch (error) {
    console.error('ChatGPT 추천 강화 실패:', error);
    return recommendations;
  }
}

// ChatGPT로 질문 강화 (API 키가 있을 때만)
async function enhanceQuestionsWithChatGPT(userProfile, jobDetail, questions, catchData) {
  if (!openai) return questions;

  try {
    const chatGPTQuestions = await generateChatGPTInterviewQuestions(userProfile, jobDetail);

    // 기존 질문과 ChatGPT 질문 결합, 중복 제거
    const allQuestions = [...questions, ...chatGPTQuestions];
    const uniqueQuestions = allQuestions.filter((question, index, self) =>
      index === self.findIndex(q => q.question === question.question)
    );

    return uniqueQuestions;

  } catch (error) {
    console.error('ChatGPT 질문 강화 실패:', error);
    return questions;
  }
}

// 기존 ChatGPT 기반 공고 추천 함수 (백업용)
async function generateChatGPTRecommendations(userProfile, jobCandidates, limit) {
  // skills가 문자열이면 배열로 변환
  const formatSkills = (skills) => {
    if (!skills) return '정보 없음';
    if (typeof skills === 'string') return skills;
    if (Array.isArray(skills)) return skills.join(', ');
    return String(skills);
  };

  const formatArray = (arr) => {
    if (!arr) return '정보 없음';
    if (typeof arr === 'string') return arr;
    if (Array.isArray(arr)) return arr.join(', ');
    return String(arr);
  };

  const prompt = `
당신은 전문 채용 컨설턴트입니다. 다음 사용자 프로필을 바탕으로 채용공고를 추천해주세요.

**사용자 프로필:**
- 기술 스킬: ${formatSkills(userProfile.skills)}
- 경력: ${userProfile.experience || '정보 없음'}
- 선호 지역: ${formatArray(userProfile.preferred_regions)}
- 희망 직무: ${userProfile.jobs || '정보 없음'}
- 희망 연봉: ${userProfile.expected_salary || '정보 없음'}만원

**채용공고 목록:**
${jobCandidates.map((job, idx) => `
${idx + 1}. ${job.title} at ${job.company}
   - 요구 기술: ${formatSkills(job.skills)}
   - 경력 요건: ${job.experience}
   - 위치: ${job.location}
   - 급여: ${job.salary}
   - Job ID: ${job.job_id}
`).join('')}

각 공고에 대해 매칭도를 분석하고, 상위 ${limit}개를 추천해주세요.
분석 기준: 기술매칭, 경력매칭, 지역매칭, 직무매칭, 급여매칭

응답은 반드시 다음 JSON 형식으로 해주세요:
[
  {
    "job_id": "job_001",
    "match_reasons": ["구체적인 매칭 이유들..."],
    "detailed_analysis": "상세한 분석..."
  }
]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 8000
    });

    console.log('[DEBUG] Full API response:', JSON.stringify(completion, null, 2));
    const chatGPTResponse = completion.choices[0].message.content;
    console.log('[ChatGPT Response]:', chatGPTResponse);

    // JSON 파싱 시도
    let recommendations = [];
    try {
      const jsonMatch = chatGPTResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON 파싱 실패, 실제 채용공고 데이터 사용');
      // 파싱 실패 시 실제 채용공고 데이터 반환
      return getFallbackJobs(userProfile, limit);
    }

    // 원본 job 데이터와 합치기 + 포맷팅 정리
    const enrichedRecommendations = recommendations.map(rec => {
      const originalJob = jobCandidates.find(job => job.job_id === rec.job_id);
      // match_reason에서 "., " 패턴 제거 (마침표 뒤에 콤마가 오는 경우)
      let cleanedMatchReason = rec.match_reason;
      if (cleanedMatchReason) {
        cleanedMatchReason = cleanedMatchReason.replace(/\.,\s*/g, '. ');
      }
      return {
        ...originalJob,
        ...rec,
        match_reason: cleanedMatchReason,
        powered_by: openai ? 'GPT-5-mini + Catch Data' : 'Enhanced Algorithm + Catch Data'
      };
    });

    return enrichedRecommendations.slice(0, limit);

  } catch (error) {
    console.error('ChatGPT API 오류, 대체 로직 사용:', error);
    // ChatGPT 실패 시 기존 알고리즘 사용
    return generateJobRecommendations(userProfile, jobCandidates, limit);
  }
}

// ChatGPT 기반 면접 질문 생성 함수
async function generateChatGPTInterviewQuestions(userProfile, jobDetail) {
  // skills가 문자열이면 배열로 변환
  const formatSkills = (skills) => {
    if (!skills) return '정보 없음';
    if (typeof skills === 'string') return skills;
    if (Array.isArray(skills)) return skills.join(', ');
    return String(skills);
  };

  const prompt = `
당신은 전문 면접관입니다. 다음 정보를 바탕으로 맞춤형 면접 질문을 생성해주세요.

**지원자 프로필:**
- 기술 스킬: ${formatSkills(userProfile.skills)}
- 경력: ${userProfile.experience || '정보 없음'}
- 희망 직무: ${userProfile.preferred_jobs || '정보 없음'}

**채용공고 정보:**
- 회사: ${jobDetail.company}
- 직무: ${jobDetail.title}
- 요구 기술: ${formatSkills(jobDetail.skills)}
- 설명: ${jobDetail.description || ''}

10-15개의 면접 질문을 생성해주세요. 다음 카테고리를 포함해야 합니다:
1. 기본 질문 (자기소개, 지원동기)
2. 기술 관련 질문 (보유 기술 중심)
3. 경험 관련 질문 (경력에 맞는 수준)
4. 직무별 전문 질문
5. 회사별 맞춤 질문

응답은 반드시 다음 JSON 형식으로 해주세요:
[
  {
    "id": 1,
    "question": "질문 내용",
    "category": "기술|인성|지원동기|직무|회사",
    "difficulty": "쉬움|보통|어려움",
    "purpose": "이 질문의 목적"
  }
]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 8000
    });

    const chatGPTResponse = completion.choices[0].message.content;
    console.log('[ChatGPT Interview Response]:', chatGPTResponse);

    // JSON 파싱 시도
    let questions = [];
    try {
      const jsonMatch = chatGPTResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON 파싱 실패, 대체 로직 사용');
      // 파싱 실패 시 기존 로직 사용
      return generateInterviewQuestions(userProfile, jobDetail);
    }

    return questions.map(q => ({ ...q, powered_by: 'ChatGPT-4' }));

  } catch (error) {
    console.error('ChatGPT API 오류, 대체 로직 사용:', error);
    // ChatGPT 실패 시 기존 알고리즘 사용
    return generateInterviewQuestions(userProfile, jobDetail);
  }
}

// 캐치 채용 기업 리뷰 수집 함수
async function getCatchCompanyReviews(companyName) {
  try {
    // 실제 캐치 스크래핑 서비스 (포트 3000) 호출
    console.log(`[CATCH] 캐치 서비스에서 ${companyName} 정보 요청 중...`);

    const catchResponse = await axios.post(`${CATCH_SERVICE_URL}/api/search-company-info`, {
      company_name: companyName
    }, { timeout: 15000 });

    if (catchResponse.data && catchResponse.data.success && catchResponse.data.company_detail) {
      const catchData = catchResponse.data.company_detail;

      // 캐치 서비스의 리뷰를 MCP 형식으로 변환
      const convertedReviews = (catchData.reviews || []).map((review, index) => ({
        id: index + 1,
        rating: parseFloat(review.rating) || 0,
        title: review.good_points ? review.good_points.split(',')[0].trim() : '리뷰',
        content: `${review.good_points || ''} ${review.bad_points ? `하지만 ${review.bad_points}` : ''}`.trim(),
        pros: review.good_points || '',
        cons: review.bad_points || '',
        department: review.employee_info ? review.employee_info[0] || '일반' : '일반',
        position: review.employee_info && review.employee_info.length > 1 ? review.employee_info[1] : '직원',
        experience: review.employee_info && review.employee_info.length > 2 ? review.employee_info[2] : '정보없음',
        date: review.review_date || new Date().toISOString().split('T')[0]
      }));

      console.log(`[CATCH] 성공: ${convertedReviews.length}개 리뷰 수집`);
      return convertedReviews;
    }

    // 캐치 서비스 실패 시 fallback 샘플 데이터
    console.log(`[CATCH] 캐치 서비스 응답 실패, 샘플 데이터 사용`);
    return getFallbackReviews();

  } catch (error) {
    console.error('기업 리뷰 수집 오류:', error.message);
    console.log(`[CATCH] 에러 발생, 샘플 데이터 사용`);
    return getFallbackReviews();
  }
}

// Fallback 샘플 데이터
function getFallbackReviews() {
  return [
    {
      id: 1,
      rating: 4.2,
      title: "성장할 수 있는 환경",
      content: "기술적 도전과 성장 기회가 많은 회사입니다. 동료들과의 협업도 좋고 워라밸도 괜찮습니다.",
      pros: "성장 기회, 좋은 동료, 워라밸",
      cons: "가끔 야근, 급여 수준",
      department: "개발",
      position: "백엔드 개발자",
      experience: "3년",
      date: "2024-09-20"
    },
    {
      id: 2,
      rating: 3.8,
      title: "안정적인 회사",
      content: "대기업이라 복지는 좋지만 혁신적인 기술 도입은 느린 편입니다.",
      pros: "안정성, 복지, 네임밸류",
      cons: "보수적 문화, 느린 의사결정",
      department: "기획",
      position: "서비스 기획자",
      experience: "5년",
      date: "2024-09-15"
    }
  ];
}

// 캐치 채용 합격 자소서 수집 함수
async function getCatchJobEssays(companyName, jobPosition) {
  try {
    const sampleEssays = [
      {
        id: 1,
        company: companyName,
        position: jobPosition || "백엔드 개발자",
        year: 2024,
        season: "하반기",
        questions: [
          {
            question: "지원동기와 포부를 작성해주세요.",
            answer: "귀사의 혁신적인 기술과 성장 가능성을 보고 지원하게 되었습니다. 특히 클라우드 기반의 서비스 개발에 관심이 많아..."
          },
          {
            question: "본인의 강점을 구체적인 사례와 함께 설명해주세요.",
            answer: "저의 가장 큰 강점은 문제 해결 능력입니다. 이전 프로젝트에서 성능 이슈가 발생했을 때..."
          }
        ],
        tips: "구체적인 경험과 수치를 포함하여 작성하는 것이 중요합니다.",
        result: "서류 합격",
        rating: 4.5
      }
    ];

    return sampleEssays;
  } catch (error) {
    console.error('자소서 수집 오류:', error);
    return [];
  }
}

// 캐치 채용 지원 꿀팁 수집 함수
async function getCatchJobTips(companyName, jobPosition) {
  try {
    const sampleTips = [
      {
        id: 1,
        category: "서류 준비",
        title: "이력서 작성 팁",
        content: "프로젝트 경험을 구체적으로 작성하고, 사용한 기술 스택을 명시하세요.",
        author: "합격자A",
        likes: 156,
        date: "2024-09-10"
      },
      {
        id: 2,
        category: "면접 준비",
        title: "기술 면접 대비",
        content: "알고리즘 문제와 시스템 설계 문제를 충분히 연습하세요. 특히 확장성에 대한 질문이 많습니다.",
        author: "합격자B",
        likes: 243,
        date: "2024-09-05"
      },
      {
        id: 3,
        category: "회사 정보",
        title: "회사 문화",
        content: "수평적 문화를 지향하며, 자유로운 의견 제시를 선호합니다. 면접에서 적극적으로 질문하세요.",
        author: "내부직원C",
        likes: 89,
        date: "2024-08-28"
      }
    ];

    return sampleTips;
  } catch (error) {
    console.error('꿀팁 수집 오류:', error);
    return [];
  }
}

// GPT로 실시간 채용공고 생성 함수
async function generateGPTJobRecommendations(userProfile, limit = 5) {
  // DEV_MODE이거나 OpenAI가 없으면 fallback 데모 데이터 사용
  if (DEV_MODE || !openai) {
    console.log('[GPT_JOBS] DEV_MODE - 데모 채용공고 사용');
    return getFallbackJobs(userProfile, limit);
  }

  const prompt = `다음 사용자 프로필에 맞는 ${limit}개의 맞춤형 채용공고를 생성해주세요:

사용자 정보:
- 경력: ${userProfile.experience || '신입'}
- 기술스택: ${(userProfile.skills || []).join(', ')}
- 선호지역: ${(userProfile.preferred_regions || userProfile.preferred_locations || ['서울']).join(', ')}
- 직무분야: ${userProfile.jobs || userProfile.job_type || 'IT'}

각 채용공고는 다음 JSON 형식으로 생성해주세요:
{
  "id": "job_1",
  "title": "구체적인 직무명 (예: 백엔드 개발자, 프론트엔드 개발자)",
  "company": "실제 대기업 회사명 (예: 네이버, 카카오, 삼성전자)",
  "location": ["구체적인 지역 (예: 서울, 경기, 부산)"],
  "experience": "경력 요구사항 (예: 신입, 경력 1-3년)",
  "skills": ["필요 기술스택 배열"],
  "salary": "연봉대 (예: 4000-6000만원)",
  "jobType": "IT 또는 빅데이터",
  "match_reasons": ["사용자와 매칭되는 구체적인 이유"],
  "skill_matches": ["사용자 기술과 매칭되는 스킬"],
  "powered_by": "ChatGPT-4 + Catch Data"
}

주의사항:
1. 모든 필드를 빠짐없이 채워주세요
2. location은 반드시 배열로
3. skills도 반드시 배열로 (최소 3개 이상)
4. 실제 존재하는 대기업 회사명만 사용
5. match_reasons에 구체적인 매칭 이유 3개 이상
6. 응답은 JSON 배열 형태로만`;

  try {
    console.log('[GPT_JOBS] ChatGPT로 맞춤형 채용공고 생성 중...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 10000
    });

    const response = completion.choices[0].message.content;

    try {
      // JSON 파싱 시도 (마크다운 코드 블록 제거)
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jobs = JSON.parse(cleanedResponse);

      // 데이터 검증 및 보정
      const validatedJobs = (Array.isArray(jobs) ? jobs : [jobs]).map(job => ({
        id: job.id || `job_${Math.random().toString(36).substr(2, 9)}`,
        title: job.title || '개발자',
        company: job.company || '미정',
        location: Array.isArray(job.location) ? job.location : (job.location ? [job.location] : ['서울']),
        experience: job.experience || '경력무관',
        skills: Array.isArray(job.skills) ? job.skills : (job.skills ? job.skills.split(',').map(s => s.trim()) : []),
        salary: job.salary || '면접 후 결정',
        jobType: job.jobType || 'IT',
        match_reasons: Array.isArray(job.match_reasons) ? job.match_reasons : ['기술 스택 매칭', '경력 적합'],
        skill_matches: Array.isArray(job.skill_matches) ? job.skill_matches : [],
        powered_by: "ChatGPT-4 + Catch Data"
      }));

      console.log(`[GPT_JOBS] ChatGPT가 ${validatedJobs.length}개 채용공고 생성 완료`);
      return validatedJobs;
    } catch (parseError) {
      console.error('[GPT_JOBS] JSON 파싱 실패, fallback 데이터 사용:', parseError.message);
      console.error('[GPT_JOBS] GPT Response:', response.substring(0, 500));
      return getFallbackJobs(userProfile, limit);
    }

  } catch (error) {
    console.error('[GPT_JOBS] ChatGPT 채용공고 생성 실패:', error.message);
    return getFallbackJobs(userProfile, limit);
  }
}

// 실제 채용공고 데이터 (다른 백엔드 분이 제공)
function getFallbackJobs(userProfile, limit = 5) {
  const realJobData = [
    {
      id: "job_001",
      title: "백엔드 개발자",
      company: "네이버",
      location: ["경기 성남시"],
      experience: "3-5년",
      skills: ["Java", "Spring Boot", "MySQL", "Redis"],
      salary: "5000-7000만원",
      jobType: "IT",
      match_reasons: [`${userProfile.experience || '신입'} 경력에 적합`, "Spring Boot 백엔드 시스템 개발"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_002",
      title: "프론트엔드 개발자",
      company: "카카오",
      location: ["제주시"],
      experience: "1-3년",
      skills: ["React", "JavaScript", "TypeScript", "CSS"],
      salary: "4000-6000만원",
      jobType: "IT",
      match_reasons: ["React 웹 서비스 개발", "프론트엔드 기술 스택 매칭"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_003",
      title: "풀스택 개발자",
      company: "토스",
      location: ["서울 송파구"],
      experience: "신입-2년",
      skills: ["Node.js", "React", "MongoDB", "AWS"],
      salary: "3500-5000만원",
      jobType: "IT",
      match_reasons: ["Node.js와 React 풀스택 개발", "신입 개발자 환영"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_004",
      title: "DevOps 엔지니어",
      company: "쿠팡",
      location: ["서울 강남구"],
      experience: "3년 이상",
      skills: ["AWS", "Docker", "Kubernetes", "Jenkins"],
      salary: "6000-8000만원",
      jobType: "IT",
      match_reasons: ["AWS 기반 인프라 구축 및 운영", "DevOps 전문성"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_005",
      title: "모바일 개발자",
      company: "라인",
      location: ["서울 송파구"],
      experience: "1-3년",
      skills: ["React Native", "JavaScript", "iOS", "Android"],
      salary: "4500-6500만원",
      jobType: "IT",
      match_reasons: ["React Native 모바일 앱 개발", "크로스 플랫폼 개발"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_006",
      title: "AI 엔지니어",
      company: "네이버 클로바",
      location: ["서울 강남구"],
      experience: "경력 2-4년",
      skills: ["TensorFlow", "PyTorch", "Machine Learning", "Python"],
      salary: "6000-8000만원",
      jobType: "AI",
      match_reasons: ["AI 모델 개발 및 서비스 적용", "머신러닝 프로젝트 경험"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_007",
      title: "딥러닝 연구원",
      company: "카카오브레인",
      location: ["서울 판교"],
      experience: "경력 3-5년",
      skills: ["Deep Learning", "Computer Vision", "NLP", "PyTorch"],
      salary: "7000-9000만원",
      jobType: "AI",
      match_reasons: ["딥러닝 연구 및 논문 발표", "컴퓨터 비전/자연어 처리"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_008",
      title: "ML 엔지니어",
      company: "업스테이지",
      location: ["서울 강남구"],
      experience: "경력 1-3년",
      skills: ["Machine Learning", "scikit-learn", "TensorFlow", "AI"],
      salary: "5500-7500만원",
      jobType: "AI",
      match_reasons: ["머신러닝 파이프라인 구축", "AI 서비스 개발"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    },
    {
      id: "job_009",
      title: "빅데이터 엔지니어",
      company: "삼성전자",
      location: ["서울 서초구"],
      experience: "경력 2-4년",
      skills: ["Python", "Spark", "Hadoop", "SQL", "Kafka"],
      salary: "5000-7000만원",
      jobType: "빅데이터",
      match_reasons: ["대용량 데이터 처리", "실시간 데이터 파이프라인"],
      skill_matches: [],
      powered_by: "ChatGPT-4 + Catch Data"
    }
  ];

  // 사용자 프로필에 따른 간단한 매칭 점수 계산
  const userSkills = (userProfile.skills || []).map(s => s.toLowerCase());

  realJobData.forEach(job => {
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const matchedSkills = userSkills.filter(skill =>
      jobSkills.some(js => js.includes(skill) || skill.includes(js))
    );

    if (matchedSkills.length > 0) {
      job.skill_matches = matchedSkills;
      job.match_reasons.push(`기술 스택 ${matchedSkills.length}개 매칭 (${matchedSkills.join(', ')})`);
    }
  });

  return realJobData.slice(0, limit);
}

// ChatGPT로 요약/분석 함수
async function summarizeWithChatGPT(data, type) {
  // DEV_MODE이거나 OpenAI가 없으면 fallback 메시지 반환
  if (DEV_MODE || !openai) {
    console.log('[SUMMARY] DEV_MODE 활성화 - ChatGPT 대신 fallback 메시지 사용');
    return '요약을 생성할 수 없습니다.';
  }

  const prompts = {
    company_reviews: `다음 기업 리뷰들을 분석하여 핵심 포인트를 요약해주세요:\n${JSON.stringify(data, null, 2)}`,
    job_essays: `다음 합격 자소서들을 분석하여 성공 패턴을 찾아주세요:\n${JSON.stringify(data, null, 2)}`
  };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompts[type] }],
      max_completion_tokens: 1000
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('ChatGPT 요약 오류:', error);
    return '요약을 생성할 수 없습니다.';
  }
}

// ChatGPT로 팁 정리 함수
async function organizeWithChatGPT(tips, type) {
  const prompt = `다음 지원 팁들을 카테고리별로 정리하고 우선순위를 매겨주세요:\n${JSON.stringify(tips, null, 2)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 1500
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('ChatGPT 정리 오류:', error);
    return '팁을 정리할 수 없습니다.';
  }
}

// 기존 알고리즘들 (ChatGPT 실패 시 대체용)
function generateJobRecommendations(userProfile, jobCandidates, limit) {
  const scoredJobs = jobCandidates.map(job => {
    let score = 0;
    let reasons = [];

    // 기술 스택 매칭 (40점)
    const userSkills = (userProfile.skills || []).map(s => s.toLowerCase());
    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
    const skillMatch = userSkills.filter(skill =>
      jobSkills.some(js => js.includes(skill) || skill.includes(js))
    );

    if (skillMatch.length > 0) {
      const skillScore = Math.min(40, (skillMatch.length / userSkills.length) * 40);
      score += skillScore;
      reasons.push(`기술 스택 ${skillMatch.length}개 매칭 (+${skillScore.toFixed(1)}점)`);
    }

    // 경력 레벨 매칭 (20점) - 기존 로직과 동일
    const userExperience = parseExperience(userProfile.experience || '0년');
    const jobExperience = parseExperienceRange(job.experience || '신입');

    if (isExperienceMatch(userExperience, jobExperience)) {
      score += 20;
      reasons.push(`경력 수준 적합 (+20점)`);
    } else if (Math.abs(userExperience - jobExperience.min) <= 1) {
      score += 10;
      reasons.push(`경력 수준 유사 (+10점)`);
    }

    return {
      ...job,
      match_reasons: reasons,
      skill_matches: skillMatch,
      powered_by: 'Fallback Algorithm'
    };
  });

  return scoredJobs
    .sort((a, b) => {
      // 점수 대신 매칭 이유 개수로 정렬
      return (b.match_reasons?.length || 0) - (a.match_reasons?.length || 0);
    })
    .slice(0, limit);
}

function generateInterviewQuestions(userProfile, jobDetail) {
  // 기존 면접 질문 생성 로직과 동일
  const questions = [
    { id: 1, question: "자기소개를 해주세요.", category: "인성", difficulty: "쉬움" },
    { id: 2, question: `${jobDetail.company}에 지원한 이유는 무엇인가요?`, category: "지원동기", difficulty: "쉬움" },
  ];

  return questions.map(q => ({ ...q, powered_by: 'Fallback Algorithm' }));
}

// 유틸리티 함수들 (기존과 동일)
function parseExperience(exp) {
  const match = exp.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function parseExperienceRange(exp) {
  if (exp.includes('신입')) return { min: 0, max: 1 };
  if (exp.includes('1-3년') || exp.includes('1~3년')) return { min: 1, max: 3 };
  if (exp.includes('3-5년') || exp.includes('3~5년')) return { min: 3, max: 5 };
  if (exp.includes('5년 이상') || exp.includes('5+')) return { min: 5, max: 10 };

  const match = exp.match(/(\d+)/);
  const years = match ? parseInt(match[1]) : 0;
  return { min: years, max: years + 1 };
}

function isExperienceMatch(userExp, jobExpRange) {
  return userExp >= jobExpRange.min && userExp <= jobExpRange.max;
}

// ==============================================================================
// 코딩 테스트 관련 API
// ==============================================================================

// 코딩 문제 생성 API (회사별 맞춤형)
app.post('/tools/generate_coding_problem', async (req, res) => {
  try {
    const { company_name, difficulty, algorithm_type, user_profile } = req.body;

    console.log('[GENERATE_CODING_PROBLEM] GPT-4 기반 문제 생성 요청:', {
      company_name,
      difficulty,
      algorithm_type
    });

    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI API가 설정되지 않았습니다.'
      });
    }

    // GPT-4로 문제 생성
    const problem = await generateCodingProblemWithGPT(company_name, difficulty, algorithm_type, user_profile);

    res.json({
      success: true,
      problem,
      powered_by: 'ChatGPT-4'
    });

  } catch (error) {
    console.error('[GENERATE_CODING_PROBLEM] Error:', error);
    res.status(500).json({ error: '코딩 문제 생성 중 오류가 발생했습니다.' });
  }
});

// AI 힌트 생성 API
app.post('/tools/generate_hint', async (req, res) => {
  try {
    const { problem_description, user_code, hint_level } = req.body;

    console.log('[GENERATE_HINT] GPT-4 기반 힌트 생성 요청:', {
      hint_level,
      code_length: user_code?.length || 0
    });

    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI API가 설정되지 않았습니다.'
      });
    }

    // GPT-4로 힌트 생성
    const hint = await generateHintWithGPT(problem_description, user_code, hint_level);

    res.json({
      success: true,
      hint,
      hint_level,
      powered_by: 'ChatGPT-4'
    });

  } catch (error) {
    console.error('[GENERATE_HINT] Error:', error);
    res.status(500).json({ error: '힌트 생성 중 오류가 발생했습니다.' });
  }
});

// AI 코드 리뷰 API
app.post('/tools/review_code', async (req, res) => {
  try {
    const { problem_description, user_code, language } = req.body;

    console.log('[REVIEW_CODE] GPT-4 기반 코드 리뷰 요청:', {
      language,
      code_length: user_code?.length || 0
    });

    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI API가 설정되지 않았습니다.'
      });
    }

    // GPT-4로 코드 리뷰
    const review = await reviewCodeWithGPT(problem_description, user_code, language);

    res.json({
      success: true,
      review,
      powered_by: 'ChatGPT-4'
    });

  } catch (error) {
    console.error('[REVIEW_CODE] Error:', error);
    res.status(500).json({ error: '코드 리뷰 중 오류가 발생했습니다.' });
  }
});

// ==============================================================================
// 헬퍼 함수들
// ==============================================================================

// 코딩 문제 생성 헬퍼
async function generateCodingProblemWithGPT(companyName, difficulty, algorithmType, userProfile) {
  // 회사별 출제 스타일 정의
  const companyStyles = {
    '삼성': {
      style: '시뮬레이션과 구현 중심의 문제. 복잡한 조건을 정확히 구현하는 능력 평가.',
      topics: ['시뮬레이션', '구현', 'DFS/BFS', '완전탐색'],
      characteristics: '긴 문제 설명, 다양한 엣지 케이스, 정확한 구현 요구'
    },
    '카카오': {
      style: '창의적 문제 해결과 효율성 중심. 알고리즘 최적화와 자료구조 활용.',
      topics: ['해시', '스택/큐', '그리디', '동적계획법', '이진탐색'],
      characteristics: '실생활 문제 맥락, 효율성 테스트, 단계별 난이도'
    },
    '네이버': {
      style: '기본기와 효율성 중심. 자료구조와 알고리즘의 적절한 활용.',
      topics: ['자료구조', '문자열', '정렬', '탐색'],
      characteristics: '깔끔한 문제 설명, 명확한 입출력 형식'
    },
    '라인': {
      style: '실무 중심 문제. 코드 품질과 가독성 중요.',
      topics: ['문자열', '정렬', '구현', '자료구조'],
      characteristics: '실제 서비스 시나리오, 코드 품질 평가'
    },
    '쿠팡': {
      style: '대용량 데이터 처리와 최적화. 시간복잡도 중요.',
      topics: ['해시', '이진탐색', '그리디', '동적계획법'],
      characteristics: '대량 데이터, 최적화 중심, 효율성 중요'
    }
  };

  // 난이도별 가이드라인
  const difficultyGuides = {
    'easy': {
      complexity: 'O(n) 또는 O(n log n)',
      concepts: '1-2개의 기본 알고리즘/자료구조',
      input_size: 'n ≤ 10,000',
      expected_time: '15-30분'
    },
    'medium': {
      complexity: 'O(n^2) 또는 O(n log n) + 최적화',
      concepts: '2-3개의 알고리즘/자료구조 조합',
      input_size: 'n ≤ 100,000',
      expected_time: '30-60분'
    },
    'hard': {
      complexity: 'O(n^2) 이하로 최적화 필요',
      concepts: '3개 이상의 고급 알고리즘 조합',
      input_size: 'n ≤ 1,000,000',
      expected_time: '60-90분'
    }
  };

  const companyStyle = companyStyles[companyName] || {
    style: '일반적인 알고리즘 문제',
    topics: ['자료구조', '알고리즘'],
    characteristics: '명확한 입출력'
  };

  const difficultyGuide = difficultyGuides[difficulty] || difficultyGuides['medium'];

  // 사용자 프로필 분석
  let userContext = '';
  if (userProfile) {
    const skillLevel = userProfile.codingLevel || 'intermediate';
    const preferredLanguage = userProfile.preferredLanguage || 'Python';
    const weakAreas = userProfile.weakAreas || [];
    const skills = userProfile.skills || [];

    userContext = `
## 지원자 프로필 분석
- **코딩 실력**: ${skillLevel} (${skillLevel === 'beginner' ? '기초 학습 중' : skillLevel === 'intermediate' ? '중급 수준' : '고급 수준'})
- **선호 언어**: ${preferredLanguage}
${skills.length > 0 ? `- **보유 스킬**: ${skills.join(', ')}` : ''}
${weakAreas.length > 0 ? `- **약점 보완 필요**: ${weakAreas.join(', ')}` : ''}

**문제 맞춤화 전략**:
${skillLevel === 'beginner' ? '- 기본 개념 이해에 집중, 단계별 설명 포함' : ''}
${skillLevel === 'intermediate' ? '- 알고리즘 응용력 향상, 최적화 고려' : ''}
${skillLevel === 'advanced' ? '- 복잡한 문제 해결, 시간/공간 복잡도 최적화' : ''}
${weakAreas.length > 0 ? `- ${weakAreas[0]} 영역 강화에 도움이 되는 문제` : ''}
`;
  }

  const prompt = `당신은 ${companyName || '일반'} 회사의 코딩 테스트 출제 전문가입니다.

## 출제 요구사항
- **회사**: ${companyName || '일반'}
- **난이도**: ${difficulty || 'medium'}
- **알고리즘 유형**: ${algorithmType || '자료구조'}
${userContext}

## 회사 출제 스타일
${companyStyle.style}
**주요 출제 토픽**: ${companyStyle.topics.join(', ')}
**특징**: ${companyStyle.characteristics}

## 난이도 가이드라인 (${difficulty})
- **시간복잡도**: ${difficultyGuide.complexity}
- **필요 개념**: ${difficultyGuide.concepts}
- **입력 크기**: ${difficultyGuide.input_size}
- **예상 풀이 시간**: ${difficultyGuide.expected_time}

## 문제 품질 요구사항
1. **명확성**: 문제 설명이 모호하지 않고 명확해야 함
2. **현실성**: ${companyName}의 실제 서비스나 비즈니스와 연관된 맥락
3. **검증가능성**: 테스트 케이스로 정확히 검증 가능
4. **교육성**: 풀이 과정에서 알고리즘 개념 학습 가능

위 조건을 만족하는 고품질 코딩 문제를 다음 JSON 형식으로 생성해주세요:

\`\`\`json
{
  "title": "문제 제목 (실제 서비스 맥락 반영)",
  "description": "문제 설명 (구체적이고 명확하게, 스토리텔링 포함)",
  "inputFormat": "입력 형식 (명확한 데이터 타입과 범위)",
  "outputFormat": "출력 형식 (명확한 형식)",
  "constraints": [
    "입력 크기 제약 (${difficultyGuide.input_size})",
    "시간 제한 (${difficultyGuide.expected_time})",
    "기타 제약사항"
  ],
  "examples": [
    {
      "input": "5\\n1 2 3 4 5",
      "output": "15",
      "explanation": "예제에 대한 자세한 설명"
    },
    {
      "input": "3\\n10 20 30",
      "output": "60",
      "explanation": "두 번째 예제 설명"
    }
  ],
  "testCases": [
    {"input": "5\\n1 2 3 4 5", "expected_output": "15", "is_sample": true},
    {"input": "1\\n100", "expected_output": "100", "is_sample": false},
    {"input": "10\\n1 1 1 1 1 1 1 1 1 1", "expected_output": "10", "is_sample": false}
  ],
  "hints": [
    "힌트 1: 기본 아이디어",
    "힌트 2: 자료구조 선택",
    "힌트 3: 최적화 방법"
  ],
  "solution_approach": "${algorithmType} 알고리즘을 활용한 풀이 접근법",
  "timeComplexity": "${difficultyGuide.complexity}",
  "spaceComplexity": "O(n)",
  "timeLimit": 2000,
  "memoryLimit": 256,
  "tags": ["${algorithmType}", "${companyName}", "${difficulty}"]
}
\`\`\`

**중요**: 반드시 유효한 JSON 형식으로만 응답하세요. 설명이나 추가 텍스트 없이 JSON만 출력하세요.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: '당신은 코딩 테스트 문제 출제 전문가입니다.' },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 8000
  });

  const responseText = completion.choices[0].message.content.trim();

  // JSON 파싱 시도 (여러 방법 시도)
  let problem = null;

  try {
    // 1. 코드 블록 제거 후 파싱
    let jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    problem = JSON.parse(jsonText);
  } catch (e) {
    try {
      // 2. 정규식으로 JSON 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        problem = JSON.parse(jsonMatch[0]);
      }
    } catch (e2) {
      console.error('[GENERATE_CODING_PROBLEM] JSON parse error:', e2);
    }
  }

  // 파싱 실패 시 기본 구조 반환
  if (!problem) {
    return {
      title: "문제 생성 오류",
      description: responseText,
      inputFormat: "입력 형식",
      outputFormat: "출력 형식",
      constraints: [],
      examples: [],
      testCases: [],
      hints: [],
      timeLimit: 2000,
      memoryLimit: 256
    };
  }

  // 문제 품질 검증 및 보완
  problem = validateAndEnhanceProblem(problem, companyName, difficulty, algorithmType);

  return problem;
}

// 문제 품질 검증 및 보완 함수
function validateAndEnhanceProblem(problem, companyName, difficulty, algorithmType) {
  // 필수 필드 검증
  const requiredFields = ['title', 'description', 'inputFormat', 'outputFormat'];
  for (const field of requiredFields) {
    if (!problem[field]) {
      console.warn(`[PROBLEM_VALIDATION] Missing field: ${field}`);
      problem[field] = `${field}이(가) 누락되었습니다.`;
    }
  }

  // 기본값 설정
  problem.constraints = problem.constraints || [];
  problem.examples = problem.examples || [];
  problem.testCases = problem.testCases || [];
  problem.hints = problem.hints || [];
  problem.timeLimit = problem.timeLimit || 2000;
  problem.memoryLimit = problem.memoryLimit || 256;
  problem.tags = problem.tags || [algorithmType, companyName, difficulty];

  // 예제가 없으면 경고
  if (problem.examples.length === 0) {
    console.warn('[PROBLEM_VALIDATION] No examples provided');
  }

  // 테스트 케이스가 예제보다 적으면 예제를 테스트 케이스로 추가
  if (problem.testCases.length < problem.examples.length) {
    for (const example of problem.examples) {
      const existingTestCase = problem.testCases.find(tc => tc.input === example.input);
      if (!existingTestCase) {
        problem.testCases.push({
          input: example.input,
          expected_output: example.output,
          is_sample: true
        });
      }
    }
  }

  // 품질 점수 계산
  let qualityScore = 0;
  if (problem.description.length > 100) qualityScore += 20;
  if (problem.examples.length >= 2) qualityScore += 20;
  if (problem.testCases.length >= 3) qualityScore += 20;
  if (problem.hints.length >= 2) qualityScore += 20;
  if (problem.constraints.length >= 2) qualityScore += 20;

  problem.qualityScore = qualityScore;

  console.log(`[PROBLEM_VALIDATION] Quality score: ${qualityScore}/100`);

  return problem;
}

// 힌트 생성 헬퍼
async function generateHintWithGPT(problemDescription, userCode, hintLevel) {
  const levelDescriptions = {
    1: '아주 작은 힌트만 주세요 (방향성만)',
    2: '중간 정도의 힌트를 주세요 (핵심 아이디어)',
    3: '구체적인 힌트를 주세요 (의사코드 포함)'
  };

  const prompt = `다음 코딩 문제에 대한 힌트를 제공해주세요.

**문제 설명**:
${problemDescription}

**현재 사용자 코드**:
\`\`\`
${userCode || '(아직 코드 없음)'}
\`\`\`

**힌트 레벨**: ${hintLevel} - ${levelDescriptions[hintLevel] || levelDescriptions[1]}

사용자가 스스로 해결할 수 있도록 ${levelDescriptions[hintLevel]}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: '당신은 친절한 코딩 튜터입니다. 답을 바로 알려주지 말고, 힌트를 통해 스스로 해결하도록 도와주세요.' },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 500
  });

  return completion.choices[0].message.content.trim();
}

// 코드 리뷰 헬퍼
async function reviewCodeWithGPT(problemDescription, userCode, language) {
  const prompt = `다음 코드를 리뷰해주세요.

**문제 설명**:
${problemDescription}

**제출된 코드** (${language}):
\`\`\`${language}
${userCode}
\`\`\`

다음 JSON 형식으로 응답해주세요:
{
  "summary": "전반적인 평가 (1-2문장)",
  "strengths": ["장점1", "장점2"],
  "improvements": [
    {"issue": "개선할 점", "suggestion": "구체적인 제안"}
  ],
  "codeQualityScore": 85,
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "bestPractices": ["준수한 모범 사례1"]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: '당신은 시니어 개발자입니다. 코드를 리뷰하고 건설적인 피드백을 제공해주세요.' },
      { role: 'user', content: prompt }
    ],
    max_completion_tokens: 1500
  });

  const responseText = completion.choices[0].message.content.trim();

  // JSON 파싱 시도
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[REVIEW_CODE] JSON parse error:', e);
  }

  // 파싱 실패 시 텍스트 그대로 반환
  return {
    summary: responseText,
    strengths: [],
    improvements: [],
    codeQualityScore: 70
  };
}

app.listen(PORT, () => {
  console.log(`🚀 CommitJob MCP Service with ChatGPT running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   - POST /tools/rerank_jobs (ChatGPT Job Recommendations)`);
  console.log(`   - POST /tools/generate_interview (ChatGPT Interview Questions)`);
  console.log(`   - POST /tools/generate_coding_problem (ChatGPT Coding Problem Generator)`);
  console.log(`   - POST /tools/generate_hint (ChatGPT Coding Hint)`);
  console.log(`   - POST /tools/review_code (ChatGPT Code Review)`);
  console.log(`   - POST /tools/get_company_reviews (Catch Company Reviews)`);
  console.log(`   - POST /tools/get_job_essays (Catch Job Essays)`);
  console.log(`   - POST /tools/get_job_tips (Catch Job Tips)`);
  console.log(`   - GET /health (Health Check)`);
  console.log(`🤖 Powered by OpenAI ChatGPT-4`);
});