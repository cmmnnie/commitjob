import natural from 'natural';

const TfIdf = natural.TfIdf;

function calculateTextSimilarity(userProfile, job, includeBreakdown = false) {
  const tfidf = new TfIdf();

  // 사용자 프로필 텍스트 생성
  const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills.join(' ') : (userProfile.skills || '');
  const userJobs = Array.isArray(userProfile.jobs) ? userProfile.jobs.join(' ') : (userProfile.jobs || '');
  const userRegions = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions.join(' ') : (userProfile.preferred_regions || '');
  const userText = `${userJobs} ${userSkills} ${userProfile.experience || ''} ${userRegions}`.toLowerCase();

  const jobTitle = job.title || '';
  const jobRecruitmentConditions = job.recruitment_conditions || '';
  const jobDescription = job.job_description || '';
  const jobText = `${jobTitle} ${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();

  console.log('\n📝 입력 텍스트:');
  console.log('사용자:', userText);
  console.log('공고:', jobText);

  tfidf.addDocument(userText);
  tfidf.addDocument(jobText);

  const userTerms = tfidf.listTerms(0);
  const jobTerms = tfidf.listTerms(1);

  console.log('\n📊 TF-IDF 용어 분석:');
  console.log('사용자 용어 (상위 10개):', userTerms.slice(0, 10).map(t => `${t.term}(${t.tfidf.toFixed(3)})`).join(', '));
  console.log('공고 용어 (상위 10개):', jobTerms.slice(0, 10).map(t => `${t.term}(${t.tfidf.toFixed(3)})`).join(', '));

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

  const cosineSimilarity = dotProduct / (userMagnitude * jobMagnitude);

  // 보너스 점수 계산
  let skillBonus = 0;
  let regionBonus = 0;
  let jobTitleBonus = 0;

  const userSkillsArray = Array.isArray(userProfile.skills) ? userProfile.skills : [];
  const combinedJobText = `${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();
  const skillMatches = userSkillsArray.filter(skill =>
    combinedJobText.includes(skill.toLowerCase())
  );
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
  if (matchedJobTitles.length > 0) jobTitleBonus = 0.15;

  const totalBonus = skillBonus + regionBonus + jobTitleBonus;
  const finalScore = Math.min(cosineSimilarity + totalBonus, 1.0);

  console.log('\n🎯 점수 분석:');
  console.log(`코사인 유사도: ${(cosineSimilarity * 100).toFixed(2)}%`);
  console.log(`스킬 보너스: +${(skillBonus * 100).toFixed(2)}% (매칭: ${skillMatches.join(', ') || '없음'})`);
  console.log(`지역 보너스: +${(regionBonus * 100).toFixed(2)}% (매칭: ${matchedRegions.join(', ') || '없음'})`);
  console.log(`직무 보너스: +${(jobTitleBonus * 100).toFixed(2)}% (매칭: ${matchedJobTitles.join(', ') || '없음'})`);
  console.log(`최종 점수: ${(finalScore * 100).toFixed(2)}%`);

  return finalScore;
}

// 실제 문제 상황 재현
const userProfile = {
  jobs: ["백엔드 개발자", "프론트엔드 개발자"],
  skills: ["java", "sql"],
  experience: "10년",
  preferred_regions: ["서울", "경기", "제주"],
  expected_salary: "6000만원"
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
console.log("║             직무 불일치 문제 분석                            ║");
console.log("╚══════════════════════════════════════════════════════════════╝");

console.log('\n👤 사용자 프로필:');
console.log(`  - 희망 직무: ${userProfile.jobs.join(', ')}`);
console.log(`  - 보유 스킬: ${userProfile.skills.join(', ')}`);
console.log(`  - 경력: ${userProfile.experience}`);
console.log(`  - 희망 지역: ${userProfile.preferred_regions.join(', ')}`);

console.log('\n' + '='.repeat(60));
console.log('\n[테스트 1] 정보보호 관리자 공고 (직무 불일치 - 낮아야 함)');
console.log('─'.repeat(60));
calculateTextSimilarity(userProfile, securityManagerJob);

console.log('\n' + '='.repeat(60));
console.log('\n[테스트 2] 백엔드 개발자 공고 (직무 일치 - 높아야 함)');
console.log('─'.repeat(60));
calculateTextSimilarity(userProfile, backendDevJob);

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  문제점:');
console.log('1. "경력 10년"이 두 공고 모두 일치하여 TF-IDF 유사도가 높아짐');
console.log('2. "서울"이 두 공고 모두 일치하여 지역 보너스 동일');
console.log('3. 직무 불일치에 대한 패널티가 없음');
console.log('4. "개발자"와 "보안 관리자"의 차이를 구분하지 못함');
console.log('\n💡 개선 방안:');
console.log('1. 직무 키워드 불일치 시 패널티 적용');
console.log('2. 직무 카테고리 분류 및 카테고리 불일치 시 점수 대폭 감소');
console.log('3. 직무 타이틀 가중치 증가 (경력, 지역보다 직무가 더 중요)');
