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
    console.log('카카오 관련 기출질문 확인 중...\n');

    // 카카오 기출질문 조회
    const [kakaoQuestions] = await pool.execute(
      'SELECT * FROM catch_interview_questions WHERE company LIKE ? LIMIT 10',
      ['%카카오%']
    );

    console.log('카카오 기출질문 개수:', kakaoQuestions.length);
    console.log('\n기출질문 샘플:');
    kakaoQuestions.slice(0, 3).forEach((q, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log('회사명:', q.company);
      console.log('직무:', q.position);
      console.log('질문:', q.question);
      console.log('난이도:', q.difficulty);
    });

    // 전체 통계
    const [total] = await pool.execute('SELECT COUNT(*) as total FROM catch_interview_questions');
    console.log('\n\n전체 기출질문 개수:', total[0].total);

    // 회사별 개수
    const [companyCounts] = await pool.execute(
      'SELECT company, COUNT(*) as cnt FROM catch_interview_questions GROUP BY company ORDER BY cnt DESC LIMIT 10'
    );
    console.log('\n회사별 기출질문 개수 (상위 10개):');
    companyCounts.forEach(c => console.log(`  ${c.company}: ${c.cnt}개`));

    await pool.end();
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
})();
