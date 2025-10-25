import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

async function deleteSampleData() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           샘플 데이터 삭제 작업 시작                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 삭제 전 데이터 건수 확인
    console.log('📊 삭제 전 데이터 현황:\n');

    const [jobsBefore] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(`  - jobs: ${jobsBefore[0].count}건`);

    const [companiesBefore] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
    console.log(`  - catch_companies: ${companiesBefore[0].count}건`);

    const [reviewsBefore] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
    console.log(`  - catch_reviews: ${reviewsBefore[0].count}건`);

    const [interviewBefore] = await connection.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
    console.log(`  - catch_interview_questions: ${interviewBefore[0].count}건`);

    console.log('\n' + '='.repeat(60));
    console.log('🗑️  샘플 데이터 삭제 중...\n');

    // 1. catch_interview_questions 삭제 (외래키 때문에 먼저)
    console.log('1. catch_interview_questions 삭제 중...');
    const [deleteInterview] = await connection.execute('DELETE FROM catch_interview_questions');
    console.log(`   ✅ ${deleteInterview.affectedRows}건 삭제됨`);

    // 2. catch_reviews 삭제
    console.log('2. catch_reviews 삭제 중...');
    const [deleteReviews] = await connection.execute('DELETE FROM catch_reviews');
    console.log(`   ✅ ${deleteReviews.affectedRows}건 삭제됨`);

    // 3. catch_companies 삭제
    console.log('3. catch_companies 삭제 중...');
    const [deleteCompanies] = await connection.execute('DELETE FROM catch_companies');
    console.log(`   ✅ ${deleteCompanies.affectedRows}건 삭제됨`);

    // 4. jobs 테이블에서 샘플 데이터만 삭제 (2025-10-08 이후 생성된 데이터)
    console.log('4. jobs 테이블 샘플 데이터 삭제 중...');
    const [deleteJobs] = await connection.execute(
      "DELETE FROM jobs WHERE scraped_at >= '2025-10-08 00:00:00'"
    );
    console.log(`   ✅ ${deleteJobs.affectedRows}건 삭제됨`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 삭제 후 데이터 현황:\n');

    // 삭제 후 데이터 건수 확인
    const [jobsAfter] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(`  - jobs: ${jobsAfter[0].count}건`);

    const [companiesAfter] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
    console.log(`  - catch_companies: ${companiesAfter[0].count}건`);

    const [reviewsAfter] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
    console.log(`  - catch_reviews: ${reviewsAfter[0].count}건`);

    const [interviewAfter] = await connection.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
    console.log(`  - catch_interview_questions: ${interviewAfter[0].count}건`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 샘플 데이터 삭제 완료!\n');

    await connection.end();

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    await connection.end();
    process.exit(1);
  }
}

deleteSampleData();
