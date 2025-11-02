import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// server.js에서 함수 가져오기 위해 임시로 복사
import natural from 'natural';
const TfIdf = natural.TfIdf;

// server.js의 개선된 calculateTextSimilarity 함수 복사
function calculateTextSimilarity(userProfile, job) {
  const tfidf = new TfIdf();

  const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills.join(' ') : (userProfile.skills || '');
  const userJobs = Array.isArray(userProfile.jobs) ? userProfile.jobs.join(' ') : (userProfile.jobs || '');
  const userRegions = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions.join(' ') : (userProfile.preferred_regions || '');
  const userText = `${userJobs} ${userSkills} ${userProfile.experience || ''} ${userRegions}`.toLowerCase();

  const jobTitle = job.title || '';
  let jobRecruitmentConditions = job.recruitment_conditions || '';
  let jobDescription = job.job_description || '';
  const jobText = `${jobTitle} ${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();

  tfidf.addDocument(userText);
  tfidf.addDocument(jobText);

  const userTerms = tfidf.listTerms(0);
  const jobTerms = tfidf.listTerms(1);
  const allTerms = new Set([...userTerms.map(t => t.term), ...jobTerms.map(t => t.term)]);

  let dotProduct = 0, userMagnitude = 0, jobMagnitude = 0;
  for (const term of allTerms) {
    const userTfidf = userTerms.find(t => t.term === term)?.tfidf || 0;
    const jobTfidf = jobTerms.find(t => t.term === term)?.tfidf || 0;
    dotProduct += userTfidf * jobTfidf;
    userMagnitude += userTfidf * userTfidf;
    jobMagnitude += jobTfidf * jobTfidf;
  }

  userMagnitude = Math.sqrt(userMagnitude);
  jobMagnitude = Math.sqrt(jobMagnitude);
  const cosineSimilarity = userMagnitude === 0 || jobMagnitude === 0 ? 0 : dotProduct / (userMagnitude * jobMagnitude);

  let skillBonus = 0, regionBonus = 0, jobTitleBonus = 0, jobMismatchPenalty = 0;

  const userSkillsArray = Array.isArray(userProfile.skills) ? userProfile.skills : [];
  const combinedJobText = `${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();
  const skillMatches = userSkillsArray.filter(skill => combinedJobText.includes(skill.toLowerCase()));
  skillBonus = skillMatches.length * 0.05;

  const userRegionsArray = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions : [];
  const jobLocation = job.location || '';
  const matchedRegions = userRegionsArray.filter(region => jobLocation.includes(region));
  if (matchedRegions.length > 0) regionBonus = 0.1;

  const userJobsArray = Array.isArray(userProfile.jobs) ? userProfile.jobs : [];
  const matchedJobTitles = userJobsArray.filter(userJob =>
    jobTitle.toLowerCase().includes(userJob.toLowerCase()) ||
    jobDescription.toLowerCase().includes(userJob.toLowerCase())
  );
  const titleMatch = matchedJobTitles.length > 0;

  // 직무 카테고리 정의
  const developerKeywords = ['개발', 'developer', '프로그래머', 'programmer', '프론트엔드', 'frontend', '백엔드', 'backend', 'fullstack', '풀스택', 'web developer', '웹 개발', 'software engineer', '소프트웨어 엔지니어', 'application', '앱 개발'];
  const securityKeywords = ['보안', 'security', '정보보호', 'infosec', '보안 관리', '보안컨설팅'];
  const managerKeywords = ['관리자', 'manager', '매니저', '팀장', 'lead', '리더', 'pm', '기획', '총괄'];
  const designerKeywords = ['디자이너', 'designer', 'ux', 'ui', '디자인'];
  const marketingKeywords = ['마케팅', 'marketing', '광고', '홍보', 'pr'];

  const userIsDeveloper = userJobsArray.some(job => developerKeywords.some(kw => job.toLowerCase().includes(kw)));
  const userIsSecurity = userJobsArray.some(job => securityKeywords.some(kw => job.toLowerCase().includes(kw)));
  const userIsManager = userJobsArray.some(job => managerKeywords.some(kw => job.toLowerCase().includes(kw)));
  const userIsDesigner = userJobsArray.some(job => designerKeywords.some(kw => job.toLowerCase().includes(kw)));
  const userIsMarketing = userJobsArray.some(job => marketingKeywords.some(kw => job.toLowerCase().includes(kw)));

  const jobTextForCategory = `${jobTitle} ${jobDescription}`.toLowerCase();
  const jobIsSecurity = securityKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsDeveloper = !jobIsSecurity && developerKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsManager = managerKeywords.some(kw => jobTextForCategory.includes(kw)) && !jobIsDeveloper && !jobIsSecurity;
  const jobIsDesigner = designerKeywords.some(kw => jobTextForCategory.includes(kw));
  const jobIsMarketing = marketingKeywords.some(kw => jobTextForCategory.includes(kw));

  let categoryMismatch = false;
  if (userIsDeveloper && !jobIsDeveloper) {
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

  if (titleMatch && !categoryMismatch) {
    jobTitleBonus = 0.2;
  }

  const totalBonus = skillBonus + regionBonus + jobTitleBonus + jobMismatchPenalty;
  const finalScore = Math.max(0, Math.min(cosineSimilarity + totalBonus, 1.0));

  return {
    finalScore,
    cosineSimilarity,
    skillBonus,
    regionBonus,
    jobTitleBonus,
    jobMismatchPenalty,
    categoryMismatch,
    skillMatches,
    matchedRegions,
    matchedJobTitles,
    userCategory: userIsDeveloper ? '개발자' : userIsSecurity ? '보안' : userIsManager ? '관리자' : userIsDesigner ? '디자이너' : userIsMarketing ? '마케팅' : '기타',
    jobCategory: jobIsDeveloper ? '개발자' : jobIsSecurity ? '보안' : jobIsManager ? '관리자' : jobIsDesigner ? '디자이너' : jobIsMarketing ? '마케팅' : '기타'
  };
}

const userProfile = {
  jobs: ["백엔드 개발자", "프론트엔드 개발자"],
  skills: ["java", "sql"],
  experience: "10년",
  preferred_regions: ["서울", "경기", "제주"]
};

const securityManagerJob = {
  title: "정보보호 관리자 (팀장) 채용",
  company: "골프존",
  location: "서울 강남구",
  recruitment_conditions: "경력(10년 이상) | 정규직 | 학력무관 | 서울 강남구",
  job_description: "정보보안, 보안컨설팅, 보안 엔지니어, 네트워크/서버/보안"
};

const backendDevJob = {
  title: "백엔드 개발자 채용",
  company: "테크 회사",
  location: "서울 강남구",
  recruitment_conditions: "경력(5년 이상) | 정규직 | 대졸 이상 | 서울 강남구",
  job_description: "백엔드 개발, Java, Spring Boot, SQL, RESTful API 개발, 서버 개발"
};

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║          개선된 유사도 계산 로직 테스트                      ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log('[테스트 1] 정보보호 관리자 (직무 불일치 - 점수 낮아야 함)');
console.log('─'.repeat(60));
const result1 = calculateTextSimilarity(userProfile, securityManagerJob);
console.log(`코사인 유사도: ${(result1.cosineSimilarity * 100).toFixed(2)}%`);
console.log(`스킬 보너스: +${(result1.skillBonus * 100).toFixed(2)}% (${result1.skillMatches.join(', ') || '없음'})`);
console.log(`지역 보너스: +${(result1.regionBonus * 100).toFixed(2)}% (${result1.matchedRegions.join(', ') || '없음'})`);
console.log(`직무 보너스: +${(result1.jobTitleBonus * 100).toFixed(2)}% (${result1.matchedJobTitles.join(', ') || '없음'})`);
console.log(`카테고리 불일치 패널티: ${(result1.jobMismatchPenalty * 100).toFixed(2)}% (${result1.userCategory} → ${result1.jobCategory})`);
console.log(`🎯 최종 점수: ${(result1.finalScore * 100).toFixed(2)}%`);

console.log('\n' + '='.repeat(60) + '\n');

console.log('[테스트 2] 백엔드 개발자 (직무 일치 - 점수 높아야 함)');
console.log('─'.repeat(60));
const result2 = calculateTextSimilarity(userProfile, backendDevJob);
console.log(`코사인 유사도: ${(result2.cosineSimilarity * 100).toFixed(2)}%`);
console.log(`스킬 보너스: +${(result2.skillBonus * 100).toFixed(2)}% (${result2.skillMatches.join(', ') || '없음'})`);
console.log(`지역 보너스: +${(result2.regionBonus * 100).toFixed(2)}% (${result2.matchedRegions.join(', ') || '없음'})`);
console.log(`직무 보너스: +${(result2.jobTitleBonus * 100).toFixed(2)}% (${result2.matchedJobTitles.join(', ') || '없음'})`);
console.log(`카테고리 불일치 패널티: ${(result2.jobMismatchPenalty * 100).toFixed(2)}% (${result2.userCategory} → ${result2.jobCategory})`);
console.log(`🎯 최종 점수: ${(result2.finalScore * 100).toFixed(2)}%`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ 개선 결과:');
console.log(`정보보호 관리자: ${(result1.finalScore * 100).toFixed(2)}% (이전: 48.75%)`);
console.log(`백엔드 개발자: ${(result2.finalScore * 100).toFixed(2)}% (이전: 59.94%)`);
console.log(`\n점수 차이: ${((result2.finalScore - result1.finalScore) * 100).toFixed(2)}%p`);
console.log(`\n직무 불일치 공고는 -30% 패널티가 적용되어 낮은 점수를 받습니다!`);
