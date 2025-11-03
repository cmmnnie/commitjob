/**
 * QA/테스트 엔지니어 직무와 개발자 직무의 카테고리 불일치 패널티 테스트
 *
 * 목적: 백엔드/프론트엔드 개발자가 QA/테스트 공고를 추천받을 때
 *       카테고리 불일치 패널티(-30%)가 제대로 적용되는지 확인
 */

import natural from 'natural';
const { TfIdf } = natural;

// calculateTextSimilarity 함수 복사 (server.js:35-296)
function calculateTextSimilarity(userProfile, job, includeBreakdown = false) {
  const tfidf = new TfIdf();

  // 사용자 프로필 텍스트 생성
  const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills.join(' ') : (userProfile.skills || '');
  const userJobs = Array.isArray(userProfile.jobs) ? userProfile.jobs.join(' ') : (userProfile.jobs || '');
  const userRegions = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions.join(' ') : (userProfile.preferred_regions || '');
  const userSalary = userProfile.expected_salary || '';
  const userText = `${userJobs} ${userSkills} ${userProfile.experience || ''} ${userRegions} ${userSalary}`.toLowerCase();

  // 채용공고 텍스트 생성
  const jobTitle = job.title || '';
  let jobRecruitmentConditions = job.recruitment_conditions || '';
  if (!jobRecruitmentConditions && job.conditions) {
    jobRecruitmentConditions = Array.isArray(job.conditions) ? job.conditions.join(' ') : job.conditions;
  }
  let jobDescription = job.job_description || '';
  if (!jobDescription && job.job_info) {
    jobDescription = Array.isArray(job.job_info) ? job.job_info.join(' ') : job.job_info;
  }
  const jobText = `${jobTitle} ${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();

  // TF-IDF 문서 추가
  tfidf.addDocument(userText);
  tfidf.addDocument(jobText);

  // 코사인 유사도 계산
  const userTerms = tfidf.listTerms(0);
  const jobTerms = tfidf.listTerms(1);
  const allTerms = new Set([...userTerms.map(t => t.term), ...jobTerms.map(t => t.term)]);

  let dotProduct = 0;
  let userMagnitude = 0;
  let jobMagnitude = 0;

  for (const term of allTerms) {
    const userTfidf = userTerms.find(t => t.term === term)?.tfidf || 0;
    const jobTfidf = jobTerms.find(t => t.term === term)?.tfidf || 0;
    dotProduct += userTfidf * jobTfidf;
    userMagnitude += userTfidf * userTfidf;
    jobMagnitude += jobTfidf * jobTfidf;
  }

  userMagnitude = Math.sqrt(userMagnitude);
  jobMagnitude = Math.sqrt(jobMagnitude);

  if (userMagnitude === 0 || jobMagnitude === 0) {
    return includeBreakdown ? { score: 0, breakdown: {} } : 0;
  }

  const cosineSimilarity = dotProduct / (userMagnitude * jobMagnitude);

  // 추가 보너스/패널티 점수 계산
  let skillBonus = 0;
  let regionBonus = 0;
  let jobTitleBonus = 0;
  let jobMismatchPenalty = 0;

  // 스킬 매칭 보너스
  const userSkillsArray = Array.isArray(userProfile.skills) ? userProfile.skills : [];
  const combinedJobText = `${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();
  const skillMatches = userSkillsArray.filter(skill =>
    combinedJobText.includes(skill.toLowerCase())
  );
  skillBonus = Math.min(skillMatches.length, 3) * 0.05;

  // 지역 매칭 보너스
  const userRegionsArray = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions : [];
  const jobLocation = job.location || '';
  const matchedRegions = userRegionsArray.filter(region => jobLocation.includes(region));
  const regionMatch = matchedRegions.length > 0;
  if (regionMatch) regionBonus = 0.1;

  // 직무 매칭 보너스 및 불일치 패널티
  const userJobsArray = Array.isArray(userProfile.jobs) ? userProfile.jobs : [];
  const matchedJobTitles = userJobsArray.filter(userJob =>
    jobTitle.toLowerCase().includes(userJob.toLowerCase()) ||
    jobDescription.toLowerCase().includes(userJob.toLowerCase())
  );
  const titleMatch = matchedJobTitles.length > 0;

  // 직무 카테고리 정의 (우선순위: QA/테스트 → 보안 → 개발자 → 기타)
  const qaTestKeywords = ['qa', 'qe', '품질', 'quality', 'test', '테스트', 'tester', '테스터', 'quality assurance', 'quality engineer', 'sw 품질', '소프트웨어 품질', '검증'];
  const developerKeywords = ['프로그래머', 'programmer', '프론트엔드', 'frontend', '백엔드', 'backend', 'fullstack', '풀스택', 'web developer', '웹 개발', 'software engineer', '소프트웨어 엔지니어', 'application', '앱 개발', 'software developer', '개발자'];
  const securityKeywords = ['보안', 'security', '정보보호', 'infosec', '보안 관리', '보안컨설팅'];
  const managerKeywords = ['관리자', 'manager', '매니저', '팀장', 'lead', '리더', 'pm', '기획', '총괄'];
  const designerKeywords = ['디자이너', 'designer', 'ux', 'ui', '디자인'];
  const marketingKeywords = ['마케팅', 'marketing', '광고', '홍보', 'pr'];

  // 사용자 희망 직무 카테고리 파악
  const userIsQaTest = userJobsArray.some(job =>
    qaTestKeywords.some(kw => job.toLowerCase().includes(kw))
  );
  const userIsDeveloper = userJobsArray.some(job =>
    developerKeywords.some(kw => job.toLowerCase().includes(kw))
  );
  const userIsSecurity = userJobsArray.some(job =>
    securityKeywords.some(kw => job.toLowerCase().includes(kw))
  );
  const userIsManager = userJobsArray.some(job =>
    managerKeywords.some(kw => job.toLowerCase().includes(kw))
  );
  const userIsDesigner = userJobsArray.some(job =>
    designerKeywords.some(kw => job.toLowerCase().includes(kw))
  );
  const userIsMarketing = userJobsArray.some(job =>
    marketingKeywords.some(kw => job.toLowerCase().includes(kw))
  );

  // 공고 직무 카테고리 파악 (우선순위: QA/테스트 → 보안 → 개발자 → 기타)
  const jobTextForCategory = `${jobTitle} ${jobDescription}`.toLowerCase();
  const jobIsQaTest = qaTestKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsSecurity = !jobIsQaTest && securityKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsDeveloper = !jobIsQaTest && !jobIsSecurity && developerKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsManager = managerKeywords.some(kw => jobTextForCategory.includes(kw)) &&
                       !jobIsDeveloper && !jobIsSecurity && !jobIsQaTest;
  const jobIsDesigner = !jobIsQaTest && designerKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsMarketing = !jobIsQaTest && marketingKeywords.some(kw => jobTextForCategory.includes(kw));

  // 직무 카테고리 불일치 패널티 적용
  let categoryMismatch = false;
  if (userIsDeveloper && !jobIsDeveloper) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  } else if (userIsQaTest && !jobIsQaTest) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  } else if (userIsSecurity && !jobIsSecurity) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  } else if (userIsManager && !jobIsManager) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  } else if (userIsDesigner && !jobIsDesigner) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  } else if (userIsMarketing && !jobIsMarketing) {
    categoryMismatch = true;
    jobMismatchPenalty = -0.3;
  }

  // 직무 타이틀 정확 매칭 보너스 (카테고리 불일치가 없을 때만)
  if (titleMatch && !categoryMismatch) {
    jobTitleBonus = 0.2;
  }

  const totalBonus = skillBonus + regionBonus + jobTitleBonus + jobMismatchPenalty;
  const finalScore = Math.max(0, Math.min(cosineSimilarity + totalBonus, 1.0));

  if (includeBreakdown) {
    return {
      score: finalScore,
      breakdown: {
        cosine_similarity: parseFloat(cosineSimilarity.toFixed(4)),
        skill_bonus: parseFloat(skillBonus.toFixed(4)),
        region_bonus: parseFloat(regionBonus.toFixed(4)),
        job_title_bonus: parseFloat(jobTitleBonus.toFixed(4)),
        job_mismatch_penalty: parseFloat(jobMismatchPenalty.toFixed(4)),
        total_bonus: parseFloat(totalBonus.toFixed(4)),
        final_score: parseFloat(finalScore.toFixed(4)),
        matched_skills: skillMatches,
        matched_regions: matchedRegions,
        matched_job_titles: matchedJobTitles,
        user_category: userIsDeveloper ? '개발자' : userIsQaTest ? 'QA/테스트' : userIsSecurity ? '보안' : userIsManager ? '관리자' : userIsDesigner ? '디자이너' : userIsMarketing ? '마케팅' : '기타',
        job_category: jobIsDeveloper ? '개발자' : jobIsQaTest ? 'QA/테스트' : jobIsSecurity ? '보안' : jobIsManager ? '관리자' : jobIsDesigner ? '디자이너' : jobIsMarketing ? '마케팅' : '기타',
        category_mismatch: categoryMismatch
      }
    };
  }

  return finalScore;
}

// 테스트 케이스
console.log('='.repeat(80));
console.log('QA/테스트 엔지니어 vs 개발자 카테고리 불일치 패널티 테스트');
console.log('='.repeat(80));
console.log();

// 사용자 프로필: 백엔드/프론트엔드 개발자
const userProfile = {
  jobs: ['백엔드 개발자', '프론트엔드 개발자'],
  skills: ['Java', 'Spring', 'JavaScript', 'React', 'Node.js'],
  experience: '3년',
  preferred_regions: ['서울', '경기'],
  expected_salary: '4000만원'
};

console.log('📋 사용자 프로필:');
console.log(`  희망 직무: ${userProfile.jobs.join(', ')}`);
console.log(`  보유 스킬: ${userProfile.skills.join(', ')}`);
console.log(`  경력: ${userProfile.experience}`);
console.log(`  희망 지역: ${userProfile.preferred_regions.join(', ')}`);
console.log(`  희망 연봉: ${userProfile.expected_salary}`);
console.log();

// 테스트 케이스 1: QA/테스트 엔지니어 공고 (카테고리 불일치 예상)
const qaJob = {
  title: 'SW 품질 관리',
  recruitment_conditions: 'QA 경험 3년 이상, 테스트 자동화 경험, Java 또는 JavaScript 사용 가능',
  job_description: 'QA 엔지니어, 테스트 엔지니어로서 소프트웨어 품질 관리 및 테스트 자동화 업무를 담당합니다. Java, Selenium, JUnit 등을 활용한 자동화 테스트 경험이 있으신 분을 찾습니다.',
  location: '서울 강남구'
};

console.log('📄 공고 1: QA/테스트 엔지니어 (카테고리 불일치 예상)');
console.log(`  제목: ${qaJob.title}`);
console.log(`  모집조건: ${qaJob.recruitment_conditions}`);
console.log(`  직무설명: ${qaJob.job_description}`);
console.log(`  위치: ${qaJob.location}`);
console.log();

const qaResult = calculateTextSimilarity(userProfile, qaJob, true);
console.log('🔍 분석 결과:');
console.log(`  사용자 카테고리: ${qaResult.breakdown.user_category}`);
console.log(`  공고 카테고리: ${qaResult.breakdown.job_category}`);
console.log(`  카테고리 불일치: ${qaResult.breakdown.category_mismatch ? '예 ❌' : '아니오 ✅'}`);
console.log();
console.log('💯 점수 계산:');
console.log(`  코사인 유사도: ${(qaResult.breakdown.cosine_similarity * 100).toFixed(2)}%`);
console.log(`  스킬 보너스: +${(qaResult.breakdown.skill_bonus * 100).toFixed(2)}% (매칭: ${qaResult.breakdown.matched_skills.join(', ') || '없음'})`);
console.log(`  지역 보너스: +${(qaResult.breakdown.region_bonus * 100).toFixed(2)}% (매칭: ${qaResult.breakdown.matched_regions.join(', ') || '없음'})`);
console.log(`  직무 보너스: +${(qaResult.breakdown.job_title_bonus * 100).toFixed(2)}%`);
console.log(`  카테고리 불일치 패널티: ${(qaResult.breakdown.job_mismatch_penalty * 100).toFixed(2)}%`);
console.log(`  ---`);
console.log(`  최종 매칭률: ${(qaResult.breakdown.final_score * 100).toFixed(2)}%`);
console.log();

// 테스트 케이스 2: 일반 개발자 공고 (카테고리 일치 예상)
const developerJob = {
  title: '개발자 (백엔드/프론트엔드)',
  recruitment_conditions: 'IT분야 개발 경험 3년 이상, Java, Spring, JavaScript 경험',
  job_description: '백엔드 및 프론트엔드 개발자로서 웹 애플리케이션 개발 업무를 담당합니다. Java Spring 기반 백엔드와 React 기반 프론트엔드 개발을 담당하실 분을 찾습니다.',
  location: '서울 강남구'
};

console.log('📄 공고 2: 일반 개발자 공고 (카테고리 일치 예상)');
console.log(`  제목: ${developerJob.title}`);
console.log(`  모집조건: ${developerJob.recruitment_conditions}`);
console.log(`  직무설명: ${developerJob.job_description}`);
console.log(`  위치: ${developerJob.location}`);
console.log();

const devResult = calculateTextSimilarity(userProfile, developerJob, true);
console.log('🔍 분석 결과:');
console.log(`  사용자 카테고리: ${devResult.breakdown.user_category}`);
console.log(`  공고 카테고리: ${devResult.breakdown.job_category}`);
console.log(`  카테고리 불일치: ${devResult.breakdown.category_mismatch ? '예 ❌' : '아니오 ✅'}`);
console.log();
console.log('💯 점수 계산:');
console.log(`  코사인 유사도: ${(devResult.breakdown.cosine_similarity * 100).toFixed(2)}%`);
console.log(`  스킬 보너스: +${(devResult.breakdown.skill_bonus * 100).toFixed(2)}% (매칭: ${devResult.breakdown.matched_skills.join(', ') || '없음'})`);
console.log(`  지역 보너스: +${(devResult.breakdown.region_bonus * 100).toFixed(2)}% (매칭: ${devResult.breakdown.matched_regions.join(', ') || '없음'})`);
console.log(`  직무 보너스: +${(devResult.breakdown.job_title_bonus * 100).toFixed(2)}%`);
console.log(`  카테고리 불일치 패널티: ${(devResult.breakdown.job_mismatch_penalty * 100).toFixed(2)}%`);
console.log(`  ---`);
console.log(`  최종 매칭률: ${(devResult.breakdown.final_score * 100).toFixed(2)}%`);
console.log();

// 결과 비교
console.log('='.repeat(80));
console.log('📊 최종 비교 결과');
console.log('='.replace(80));
console.log();
console.log(`QA/테스트 공고 매칭률: ${(qaResult.breakdown.final_score * 100).toFixed(2)}%`);
console.log(`일반 개발자 공고 매칭률: ${(devResult.breakdown.final_score * 100).toFixed(2)}%`);
console.log();

if (devResult.breakdown.final_score > qaResult.breakdown.final_score) {
  console.log('✅ 성공: 개발자 공고가 QA/테스트 공고보다 높은 매칭률을 보입니다!');
  console.log(`   차이: ${((devResult.breakdown.final_score - qaResult.breakdown.final_score) * 100).toFixed(2)}%p`);
} else {
  console.log('❌ 실패: QA/테스트 공고가 여전히 더 높은 매칭률을 보입니다.');
  console.log(`   차이: ${((qaResult.breakdown.final_score - devResult.breakdown.final_score) * 100).toFixed(2)}%p`);
  console.log('   추가 조정이 필요합니다.');
}
console.log();
console.log('='.repeat(80));
