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
          cosine_similarity_explanation: "TF-IDF 기반 코사인 유사도 - 사용자 프로필과 채용공고 텍스트의 의미적 유사도를 0~1 사이 값으로 측정 (유효한 용어 없음)",
          cosine_similarity_calculation: {
            step1: "사용자 프로필과 채용공고를 각각 텍스트로 변환",
            step2: "TF-IDF(Term Frequency-Inverse Document Frequency)로 각 텍스트를 수치 벡터로 표현",
            step3: "두 벡터의 내적(dot product) 계산: 0",
            step4: "각 벡터의 크기(magnitude) 계산: 사용자=0, 공고=0",
            step5: "코사인 유사도 = 0 (벡터 크기가 0이므로 계산 불가)",
            explanation: "공통 용어가 없거나 유효한 텍스트가 없어 유사도를 계산할 수 없습니다."
          },
          skill_bonus: 0,
          skill_bonus_explanation: "스킬 매칭 보너스 - 사용자 보유 스킬이 공고 내용에 포함될 때마다 +0.05 (매칭: 0개 × 0.05)",
          region_bonus: 0,
          region_bonus_explanation: "지역 매칭 보너스 - 희망 근무지역과 공고 지역이 일치하면 +0.1 (매칭: X)",
          job_title_bonus: 0,
          job_title_bonus_explanation: "직무 매칭 보너스 - 희망 직무가 공고 제목/설명에 포함되면 +0.15 (매칭: X)",
          total_bonus: 0,
          total_bonus_explanation: "전체 보너스 합계 (스킬 + 지역 + 직무)",
          final_score: 0,
          final_score_explanation: "최종 유사도 점수 = 코사인 유사도 + 전체 보너스 (최대 1.0)",
          matched_skills: [],
          matched_skills_explanation: "사용자 보유 스킬 중 공고에서 발견된 스킬 목록",
          matched_regions: [],
          matched_regions_explanation: "희망 근무지역 중 공고 위치와 일치하는 지역 목록",
          matched_job_titles: [],
          matched_job_titles_explanation: "희망 직무 중 공고 제목/설명에서 발견된 직무 목록",
          tfidf_stats: {
            user_terms_count: userTerms.length,
            user_terms_count_explanation: "사용자 프로필에서 추출된 고유 용어(단어) 개수",
            job_terms_count: jobTerms.length,
            job_terms_count_explanation: "채용공고에서 추출된 고유 용어(단어) 개수",
            common_terms_count: 0,
            common_terms_count_explanation: "사용자 프로필과 채용공고에 모두 나타나는 공통 용어 개수",
            dot_product: 0,
            dot_product_explanation: "TF-IDF 벡터 내적 - 두 벡터의 유사성을 나타내는 기본 값",
            user_magnitude: 0,
            user_magnitude_explanation: "사용자 프로필 TF-IDF 벡터의 크기(노름)",
            job_magnitude: 0,
            job_magnitude_explanation: "채용공고 TF-IDF 벡터의 크기(노름)",
            formula_explanation: "코사인 유사도 = 내적 / (사용자벡터크기 × 공고벡터크기)"
          },
          calculation_summary: "최종점수 0.00% = 코사인유사도 0.00% + 보너스 0.00% (공통 용어 없음)"
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
        cosine_similarity_explanation: "TF-IDF 기반 코사인 유사도 - 사용자 프로필과 채용공고 텍스트의 의미적 유사도를 0~1 사이 값으로 측정",
        cosine_similarity_calculation: {
          step1: "사용자 프로필과 채용공고를 각각 텍스트로 변환",
          step2: "TF-IDF(Term Frequency-Inverse Document Frequency)로 각 텍스트를 수치 벡터로 표현",
          step3: `두 벡터의 내적(dot product) 계산: ${parseFloat(dotProduct.toFixed(4))}`,
          step4: `각 벡터의 크기(magnitude) 계산: 사용자=${parseFloat(userMagnitude.toFixed(4))}, 공고=${parseFloat(jobMagnitude.toFixed(4))}`,
          step5: `코사인 유사도 = 내적 / (사용자벡터크기 × 공고벡터크기) = ${parseFloat(dotProduct.toFixed(4))} / (${parseFloat(userMagnitude.toFixed(4))} × ${parseFloat(jobMagnitude.toFixed(4))}) = ${parseFloat(cosineSimilarity.toFixed(4))}`,
          explanation: "값이 1에 가까울수록 두 텍스트가 유사함을 의미합니다. TF-IDF는 단순 단어 빈도가 아닌, 문서 내 중요도를 고려한 가중치를 부여합니다."
        },
        skill_bonus: parseFloat(skillBonus.toFixed(4)),
        skill_bonus_explanation: `스킬 매칭 보너스 - 사용자 보유 스킬이 공고 내용에 포함될 때마다 +0.05 (매칭: ${skillMatches.length}개 × 0.05)`,
        region_bonus: parseFloat(regionBonus.toFixed(4)),
        region_bonus_explanation: `지역 매칭 보너스 - 희망 근무지역과 공고 지역이 일치하면 +0.1 (매칭: ${matchedRegions.length > 0 ? 'O' : 'X'})`,
        job_title_bonus: parseFloat(jobTitleBonus.toFixed(4)),
        job_title_bonus_explanation: `직무 매칭 보너스 - 희망 직무가 공고 제목/설명에 포함되면 +0.15 (매칭: ${matchedJobTitles.length > 0 ? 'O' : 'X'})`,
        total_bonus: parseFloat(totalBonus.toFixed(4)),
        total_bonus_explanation: "전체 보너스 합계 (스킬 + 지역 + 직무)",
        final_score: parseFloat(finalScore.toFixed(4)),
        final_score_explanation: "최종 유사도 점수 = 코사인 유사도 + 전체 보너스 (최대 1.0)",
        matched_skills: skillMatches,
        matched_skills_explanation: "사용자 보유 스킬 중 공고에서 발견된 스킬 목록",
        matched_regions: matchedRegions,
        matched_regions_explanation: "희망 근무지역 중 공고 위치와 일치하는 지역 목록",
        matched_job_titles: matchedJobTitles,
        matched_job_titles_explanation: "희망 직무 중 공고 제목/설명에서 발견된 직무 목록",
        tfidf_stats: {
          user_terms_count: userTerms.length,
          user_terms_count_explanation: "사용자 프로필에서 추출된 고유 용어(단어) 개수",
          job_terms_count: jobTerms.length,
          job_terms_count_explanation: "채용공고에서 추출된 고유 용어(단어) 개수",
          common_terms_count: Array.from(allTerms).filter(term => {
            const userTfidf = userTerms.find(t => t.term === term)?.tfidf || 0;
            const jobTfidf = jobTerms.find(t => t.term === term)?.tfidf || 0;
            return userTfidf > 0 && jobTfidf > 0;
          }).length,
          common_terms_count_explanation: "사용자 프로필과 채용공고에 모두 나타나는 공통 용어 개수",
          dot_product: parseFloat(dotProduct.toFixed(4)),
          dot_product_explanation: "TF-IDF 벡터 내적 - 두 벡터의 유사성을 나타내는 기본 값",
          user_magnitude: parseFloat(userMagnitude.toFixed(4)),
          user_magnitude_explanation: "사용자 프로필 TF-IDF 벡터의 크기(노름)",
          job_magnitude: parseFloat(jobMagnitude.toFixed(4)),
          job_magnitude_explanation: "채용공고 TF-IDF 벡터의 크기(노름)",
          formula_explanation: "코사인 유사도 = 내적 / (사용자벡터크기 × 공고벡터크기)"
        },
        calculation_summary: `최종점수 ${(finalScore * 100).toFixed(2)}% = 코사인유사도 ${(cosineSimilarity * 100).toFixed(2)}% + 보너스 ${(totalBonus * 100).toFixed(2)}%`
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

  console.log(`\n🎯 최종 유사도 점수: ${(result.score * 100).toFixed(2)}%`);
  console.log(`   ${result.breakdown.calculation_summary}\n`);

  console.log("📊 계산 내역:");
  console.log(`  • 코사인 유사도 (TF-IDF):     ${(result.breakdown.cosine_similarity * 100).toFixed(2)}%`);
  console.log(`    └─ ${result.breakdown.cosine_similarity_explanation}`);
  console.log(`\n  📐 코사인 유사도 계산 과정:`);
  console.log(`    1. ${result.breakdown.cosine_similarity_calculation.step1}`);
  console.log(`    2. ${result.breakdown.cosine_similarity_calculation.step2}`);
  console.log(`    3. ${result.breakdown.cosine_similarity_calculation.step3}`);
  console.log(`    4. ${result.breakdown.cosine_similarity_calculation.step4}`);
  console.log(`    5. ${result.breakdown.cosine_similarity_calculation.step5}`);
  console.log(`    ℹ️  ${result.breakdown.cosine_similarity_calculation.explanation}\n`);
  console.log(`  • 스킬 매칭 보너스:           +${(result.breakdown.skill_bonus * 100).toFixed(2)}%`);
  console.log(`    └─ ${result.breakdown.skill_bonus_explanation}`);
  console.log(`  • 지역 매칭 보너스:           +${(result.breakdown.region_bonus * 100).toFixed(2)}%`);
  console.log(`    └─ ${result.breakdown.region_bonus_explanation}`);
  console.log(`  • 직무 매칭 보너스:           +${(result.breakdown.job_title_bonus * 100).toFixed(2)}%`);
  console.log(`    └─ ${result.breakdown.job_title_bonus_explanation}`);
  console.log(`  • 총 보너스:                  +${(result.breakdown.total_bonus * 100).toFixed(2)}%`);
  console.log(`    └─ ${result.breakdown.total_bonus_explanation}`);

  console.log(`\n✅ 매칭된 항목:`);
  console.log(`  • 스킬: ${result.breakdown.matched_skills.length > 0 ? result.breakdown.matched_skills.join(', ') : '없음'}`);
  console.log(`    └─ ${result.breakdown.matched_skills_explanation}`);
  console.log(`  • 지역: ${result.breakdown.matched_regions.length > 0 ? result.breakdown.matched_regions.join(', ') : '없음'}`);
  console.log(`    └─ ${result.breakdown.matched_regions_explanation}`);
  console.log(`  • 직무: ${result.breakdown.matched_job_titles.length > 0 ? result.breakdown.matched_job_titles.join(', ') : '없음'}`);
  console.log(`    └─ ${result.breakdown.matched_job_titles_explanation}`);

  console.log(`\n📈 TF-IDF 통계:`);
  console.log(`  • 사용자 용어 수:             ${result.breakdown.tfidf_stats.user_terms_count}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.user_terms_count_explanation}`);
  console.log(`  • 공고 용어 수:               ${result.breakdown.tfidf_stats.job_terms_count}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.job_terms_count_explanation}`);
  console.log(`  • 공통 용어 수:               ${result.breakdown.tfidf_stats.common_terms_count}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.common_terms_count_explanation}`);
  console.log(`  • 내적(Dot Product):          ${result.breakdown.tfidf_stats.dot_product}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.dot_product_explanation}`);
  console.log(`  • 사용자 벡터 크기:           ${result.breakdown.tfidf_stats.user_magnitude}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.user_magnitude_explanation}`);
  console.log(`  • 공고 벡터 크기:             ${result.breakdown.tfidf_stats.job_magnitude}`);
  console.log(`    └─ ${result.breakdown.tfidf_stats.job_magnitude_explanation}`);
  console.log(`  • 계산 공식:                  ${result.breakdown.tfidf_stats.formula_explanation}`);

  console.log("\n" + "=".repeat(60));
});

console.log("\n✅ 테스트 완료!\n");
