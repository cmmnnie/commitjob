import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyData() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('=== 데이터베이스 확인 ===\n');

    // catch_companies 총 개수
    const [companiesCount] = await pool.execute('SELECT COUNT(*) as count FROM catch_companies');
    console.log(`catch_companies 총 개수: ${companiesCount[0].count}`);

    // catch_interview_questions 총 개수
    const [questionsCount] = await pool.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
    console.log(`catch_interview_questions 총 개수: ${questionsCount[0].count}`);

    // jobs 테이블에서 첫 5개 회사와 매칭 확인
    console.log('\n=== jobs 테이블 회사와 매칭 확인 ===');
    const [sampleJobs] = await pool.execute('SELECT id, company, title FROM jobs LIMIT 5');
    
    for (const job of sampleJobs) {
      console.log(`\n회사: "${job.company}"`);
      console.log(`공고: ${job.title}`);
      
      // catch_companies 매칭
      const [companyMatch] = await pool.execute(
        'SELECT COUNT(*) as cnt FROM catch_companies WHERE company = ?',
        [job.company]
      );
      console.log(`  → catch_companies 매칭: ${companyMatch[0].cnt}건`);
      
      // catch_interview_questions 매칭
      const [questionMatch] = await pool.execute(
        'SELECT COUNT(*) as cnt FROM catch_interview_questions WHERE company = ?',
        [job.company]
      );
      console.log(`  → catch_interview_questions 매칭: ${questionMatch[0].cnt}건`);
    }

    // catch_companies 샘플 10개 회사명 출력
    console.log('\n=== catch_companies 샘플 회사명 ===');
    const [companiesSample] = await pool.execute('SELECT company FROM catch_companies LIMIT 10');
    companiesSample.forEach((c, i) => {
      console.log(`${i+1}. "${c.company}"`);
    });

    // catch_interview_questions 회사별 개수
    console.log('\n=== catch_interview_questions 회사별 질문 개수 (상위 10개) ===');
    const [questionsByCompany] = await pool.execute(
      'SELECT company, COUNT(*) as cnt FROM catch_interview_questions GROUP BY company ORDER BY cnt DESC LIMIT 10'
    );
    questionsByCompany.forEach((item, i) => {
      console.log(`${i+1}. "${item.company}": ${item.cnt}개`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyData();
