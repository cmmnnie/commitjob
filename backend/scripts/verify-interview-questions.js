import mysql from 'mysql2/promise';

const verifyInterviewQuestions = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');
    console.log('='.repeat(60));
    console.log('📝 기출문제 최종 검증');
    console.log('='.repeat(60) + '\n');

    // 1. 기출문제 총 개수
    const [totalCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
    console.log(`📊 총 기출문제 수: ${totalCount[0].count}개\n`);

    // 2. 회사별 기출문제 개수
    const [companyCount] = await connection.execute(`
      SELECT COUNT(DISTINCT company_name) as count
      FROM catch_interview_questions
    `);
    console.log(`🏢 기출문제가 있는 회사 수: ${companyCount[0].count}개\n`);

    // 3. jobs 테이블의 고유 회사 수
    const [jobsCompanyCount] = await connection.execute(`
      SELECT COUNT(DISTINCT company) as count
      FROM jobs
    `);
    console.log(`📋 jobs 테이블의 고유 회사 수: ${jobsCompanyCount[0].count}개\n`);

    // 4. 회사별 평균 질문 개수
    const [avgQuestions] = await connection.execute(`
      SELECT AVG(question_count) as avg_count
      FROM (
        SELECT company_name, COUNT(*) as question_count
        FROM catch_interview_questions
        GROUP BY company_name
      ) as company_stats
    `);
    console.log(`📈 회사당 평균 질문 수: ${Math.round(avgQuestions[0].avg_count)}개\n`);

    // 5. 기간별 분포
    const [periodDistribution] = await connection.execute(`
      SELECT period, COUNT(*) as count
      FROM catch_interview_questions
      GROUP BY period
      ORDER BY count DESC
    `);
    console.log('📅 기간별 분포:');
    periodDistribution.forEach(row => {
      console.log(`  - ${row.period}: ${row.count}개`);
    });

    // 6. 포지션별 분포
    const [positionDistribution] = await connection.execute(`
      SELECT position, COUNT(*) as count
      FROM catch_interview_questions
      GROUP BY position
      ORDER BY count DESC
    `);
    console.log('\n💼 포지션별 분포:');
    positionDistribution.forEach(row => {
      console.log(`  - ${row.position}: ${row.count}개`);
    });

    // 7. 질문 개수가 많은 상위 10개 회사
    const [topCompanies] = await connection.execute(`
      SELECT company_name, COUNT(*) as question_count
      FROM catch_interview_questions
      GROUP BY company_name
      ORDER BY question_count DESC
      LIMIT 10
    `);
    console.log('\n🏆 질문이 많은 상위 10개 회사:');
    topCompanies.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.company_name}: ${row.question_count}개`);
    });

    // 8. 샘플 질문
    const [sampleQuestions] = await connection.execute(`
      SELECT company_name, question, period, position, experience
      FROM catch_interview_questions
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n📝 최근 수집된 질문 샘플:');
    sampleQuestions.forEach((row, i) => {
      console.log(`\n  ${i+1}. ${row.company_name}`);
      console.log(`     Q: ${row.question}`);
      console.log(`     [${row.period} | ${row.position} | ${row.experience}]`);
    });

    // 9. 모든 데이터 종합
    console.log('\n' + '='.repeat(60));
    console.log('📊 전체 데이터 종합');
    console.log('='.repeat(60));

    const [jobsCount] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    const [companiesCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
    const [reviewsCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
    const [interviewCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_interview_questions');

    console.log(`📋 채용공고 (jobs): ${jobsCount[0].count}개`);
    console.log(`🏢 회사정보 (catch_companies): ${companiesCount[0].count}개`);
    console.log(`⭐ 회사리뷰 (catch_reviews): ${reviewsCount[0].count}개`);
    console.log(`💬 기출문제 (catch_interview_questions): ${interviewCount[0].count}개`);
    console.log('='.repeat(60));

    console.log('\n✅ 검증 완료!\n');

    await connection.end();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

verifyInterviewQuestions();
