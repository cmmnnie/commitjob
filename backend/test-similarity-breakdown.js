import natural from 'natural';

// TF-IDF 기반 텍스트 유사도 계산 함수 (상세 내역 포함)
const TfIdf = natural.TfIdf;

function calculateTextSimilarity(userProfile, job, includeBreakdown = false) {
  const tfidf = new TfIdf();

  // 사용자 프로필 텍스트 생성
  const userSkills = Array.isArray(userProfile.skills) ? userProfile.skills.join(' ') : (userProfile.skills || '');
  const userJobs = Array.isArray(userProfile.jobs) ? userProfile.jobs.join(' ') : (userProfile.jobs || '');
  const userRegions = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions.join(' ') : (userProfile.preferred_regions || '');
  const userText = `${userJobs} ${userSkills} ${userProfile.experience || ''} ${userRegions}`.toLowerCase();

  // 채용공고 텍스트 생성
  const jobTitle = job.title || '';
  const jobRecruitmentConditions = job.recruitment_conditions || '';
  const jobDescription = job.job_description || '';
  const jobText = `${jobTitle} ${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();

  // TF-IDF 문서 추가
  tfidf.addDocument(userText);
  tfidf.addDocument(jobText);

  // 코사인 유사도 계산
  const userTerms = tfidf.listTerms(0);
  const jobTerms = tfidf.listTerms(1);

  // 벡터 생성
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
    if (includeBreakdown) {
      return {
        score: 0,
        breakdown: {
          cosine_similarity: 0,
          skill_bonus: 0,
          region_bonus: 0,
          job_title_bonus: 0,
          total_bonus: 0,
          final_score: 0,
          matched_skills: [],
          matched_regions: [],
          matched_job_titles: [],
          tfidf_stats: {
            user_terms_count: userTerms.length,
            job_terms_count: jobTerms.length,
            common_terms_count: 0,
            dot_product: 0,
            user_magnitude: 0,
            job_magnitude: 0
          }
        }
      };
    }
    return 0;
  }

  const cosineSimilarity = dotProduct / (userMagnitude * jobMagnitude);

  // 추가 보너스 점수 계산
  let skillBonus = 0;
  let regionBonus = 0;
  let jobTitleBonus = 0;

  // 스킬 매칭 보너스
  const userSkillsArray = Array.isArray(userProfile.skills) ? userProfile.skills : [];
  const combinedJobText = `${jobRecruitmentConditions} ${jobDescription}`.toLowerCase();
  const skillMatches = userSkillsArray.filter(skill =>
    combinedJobText.includes(skill.toLowerCase())
  );
  skillBonus = skillMatches.length * 0.05;

  // 지역 매칭 보너스
  const userRegionsArray = Array.isArray(userProfile.preferred_regions) ? userProfile.preferred_regions : [];
  const jobLocation = job.location || '';
  const matchedRegions = userRegionsArray.filter(region => jobLocation.includes(region));
  const regionMatch = matchedRegions.length > 0;
  if (regionMatch) regionBonus = 0.1;

  // 직무 매칭 보너스
  const userJobsArray = Array.isArray(userProfile.jobs) ? userProfile.jobs : [];
  const matchedJobTitles = userJobsArray.filter(userJob =>
    jobTitle.toLowerCase().includes(userJob.toLowerCase()) ||
    jobDescription.toLowerCase().includes(userJob.toLowerCase())
  );
  const titleMatch = matchedJobTitles.length > 0;
  if (titleMatch) jobTitleBonus = 0.15;

  const totalBonus = skillBonus + regionBonus + jobTitleBonus;

  // 최종 유사도 (0~1 범위, 최대 1.0)
  const finalScore = Math.min(cosineSimilarity + totalBonus, 1.0);

  if (includeBreakdown) {
    return {
      score: finalScore,
      breakdown: {
        cosine_similarity: parseFloat(cosineSimilarity.toFixed(4)),
        skill_bonus: parseFloat(skillBonus.toFixed(4)),
        region_bonus: parseFloat(regionBonus.toFixed(4)),
        job_title_bonus: parseFloat(jobTitleBonus.toFixed(4)),
        total_bonus: parseFloat(totalBonus.toFixed(4)),
        final_score: parseFloat(finalScore.toFixed(4)),
        matched_skills: skillMatches,
        matched_regions: matchedRegions,
        matched_job_titles: matchedJobTitles,
        tfidf_stats: {
          user_terms_count: userTerms.length,
          job_terms_count: jobTerms.length,
          common_terms_count: Array.from(allTerms).filter(term => {
            const userTfidf = userTerms.find(t => t.term === term)?.tfidf || 0;
            const jobTfidf = jobTerms.find(t => t.term === term)?.tfidf || 0;
            return userTfidf > 0 && jobTfidf > 0;
          }).length,
          dot_product: parseFloat(dotProduct.toFixed(4)),
          user_magnitude: parseFloat(userMagnitude.toFixed(4)),
          job_magnitude: parseFloat(jobMagnitude.toFixed(4))
        }
      }
    };
  }

  return finalScore;
}

// 테스트 데이터
const userProfile = {
  jobs: ["백엔드 개발자", "프론트엔드 개발자"],
  skills: ["java", "sql", "python", "javascript"],
  experience: "10년",
  preferred_regions: ["서울", "경기"]
};

const job1 = {
  id: 1,
  title: "백엔드 개발자 채용",
  company: "테스트 회사",
  location: "서울 강남구",
  recruitment_conditions: "경력 5년 이상, Java, Spring Boot, MySQL 경험자 우대",
  job_description: "백엔드 개발자를 모집합니다. Java, Spring, SQL 기술을 활용한 서버 개발 업무를 담당하게 됩니다."
};

const job2 = {
  id: 2,
  title: "AI 엔지니어 채용",
  company: "AI 회사",
  location: "경기 성남시",
  recruitment_conditions: "경력 3년 이상, Python, TensorFlow 경험자",
  job_description: "AI 모델 개발 및 머신러닝 프로젝트 수행"
};

const job3 = {
  id: 3,
  title: "마케팅 매니저",
  company: "마케팅 회사",
  location: "부산",
  recruitment_conditions: "경력 5년 이상, 디지털 마케팅 경험",
  job_description: "디지털 마케팅 전략 수립 및 실행"
};

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║        유사도 계산 상세 내역 테스트                          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("📋 사용자 프로필:");
console.log(JSON.stringify(userProfile, null, 2));
console.log("\n" + "─".repeat(60) + "\n");

const jobs = [job1, job2, job3];

jobs.forEach((job, index) => {
  console.log(`\n[공고 ${index + 1}] ${job.title} - ${job.company}`);
  console.log("─".repeat(60));

  const result = calculateTextSimilarity(userProfile, job, true);

  console.log(`\n🎯 최종 유사도 점수: ${(result.score * 100).toFixed(2)}%\n`);

  console.log("📊 계산 내역:");
  console.log(`  • 코사인 유사도 (TF-IDF):     ${(result.breakdown.cosine_similarity * 100).toFixed(2)}%`);
  console.log(`  • 스킬 매칭 보너스:           +${(result.breakdown.skill_bonus * 100).toFixed(2)}%`);
  console.log(`  • 지역 매칭 보너스:           +${(result.breakdown.region_bonus * 100).toFixed(2)}%`);
  console.log(`  • 직무 매칭 보너스:           +${(result.breakdown.job_title_bonus * 100).toFixed(2)}%`);
  console.log(`  • 총 보너스:                  +${(result.breakdown.total_bonus * 100).toFixed(2)}%`);

  console.log(`\n✅ 매칭된 항목:`);
  console.log(`  • 스킬: ${result.breakdown.matched_skills.length > 0 ? result.breakdown.matched_skills.join(', ') : '없음'}`);
  console.log(`  • 지역: ${result.breakdown.matched_regions.length > 0 ? result.breakdown.matched_regions.join(', ') : '없음'}`);
  console.log(`  • 직무: ${result.breakdown.matched_job_titles.length > 0 ? result.breakdown.matched_job_titles.join(', ') : '없음'}`);

  console.log(`\n📈 TF-IDF 통계:`);
  console.log(`  • 사용자 용어 수:             ${result.breakdown.tfidf_stats.user_terms_count}`);
  console.log(`  • 공고 용어 수:               ${result.breakdown.tfidf_stats.job_terms_count}`);
  console.log(`  • 공통 용어 수:               ${result.breakdown.tfidf_stats.common_terms_count}`);
  console.log(`  • 내적(Dot Product):          ${result.breakdown.tfidf_stats.dot_product}`);
  console.log(`  • 사용자 벡터 크기:           ${result.breakdown.tfidf_stats.user_magnitude}`);
  console.log(`  • 공고 벡터 크기:             ${result.breakdown.tfidf_stats.job_magnitude}`);

  console.log("\n" + "=".repeat(60));
});

console.log("\n✅ 테스트 완료!\n");
