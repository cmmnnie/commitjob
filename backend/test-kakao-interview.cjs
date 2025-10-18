const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.AWS_RDS_HOST,
    user: process.env.AWS_RDS_USER,
    password: process.env.AWS_RDS_PASSWORD,
    database: process.env.AWS_RDS_DATABASE,
    port: process.env.AWS_RDS_PORT || 3306
  });

  try {
    console.log('===== 카카오 기출질문 테스트 =====\n');

    // 1. catch_companies 테이블에서 카카오 관련 회사명 확인
    console.log('1. catch_companies 테이블에서 카카오 검색:');
    const [companies] = await pool.execute(
      'SELECT company FROM catch_companies WHERE company LIKE ? LIMIT 10',
      ['%카카오%']
    );
    console.log('   발견된 회사:', companies.map(c => c.company).join(', '));
    console.log('');

    // 2. catch_interview_questions 테이블에서 카카오 검색
    console.log('2. catch_interview_questions 테이블에서 카카오 검색:');
    const [questions1] = await pool.execute(
      'SELECT company, position, question FROM catch_interview_questions WHERE company = ? LIMIT 5',
      ['카카오']
    );
    console.log(`   company='카카오' 정확 매칭: ${questions1.length}개`);
    if (questions1.length > 0) {
      questions1.forEach((q, idx) => {
        console.log(`   [${idx+1}] 회사: ${q.company}, 직무: ${q.position}`);
        console.log(`       질문: ${q.question.substring(0, 50)}...`);
      });
    }
    console.log('');

    // 3. LIKE 검색
    console.log('3. catch_interview_questions 테이블에서 LIKE 검색:');
    const [questions2] = await pool.execute(
      'SELECT company, position, question FROM catch_interview_questions WHERE company LIKE ? LIMIT 5',
      ['%카카오%']
    );
    console.log(`   company LIKE '%카카오%': ${questions2.length}개`);
    if (questions2.length > 0) {
      questions2.forEach((q, idx) => {
        console.log(`   [${idx+1}] 회사: ${q.company}, 직무: ${q.position}`);
        console.log(`       질문: ${q.question.substring(0, 50)}...`);
      });
    }
    console.log('');

    // 4. 전체 통계
    console.log('4. 전체 통계:');
    const [total] = await pool.execute('SELECT COUNT(*) as cnt FROM catch_interview_questions');
    console.log(`   전체 기출질문: ${total[0].cnt}개`);

    const [uniqueCompanies] = await pool.execute(
      'SELECT COUNT(DISTINCT company) as cnt FROM catch_interview_questions'
    );
    console.log(`   회사 수: ${uniqueCompanies[0].cnt}개`);
    console.log('');

    // 5. jobs 테이블에서 카카오 공고 확인
    console.log('5. jobs 테이블에서 카카오 공고:');
    const [jobs] = await pool.execute(
      'SELECT id, company, title FROM jobs WHERE company LIKE ? LIMIT 5',
      ['%카카오%']
    );
    console.log(`   발견된 공고: ${jobs.length}개`);
    if (jobs.length > 0) {
      jobs.forEach((j, idx) => {
        console.log(`   [${idx+1}] 회사명: "${j.company}", 공고: ${j.title}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
})();
