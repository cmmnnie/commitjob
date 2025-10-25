import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkMatching() {
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
    // jobs 테이블에서 랜덤 회사명 가져오기
    const [jobs] = await pool.execute('SELECT DISTINCT company FROM jobs LIMIT 10');
    console.log('Sample companies from jobs table:');
    
    for (const job of jobs) {
      const company = job.company;
      console.log(`\n"${company}"`);
      
      // catch_companies 확인
      const [companyData] = await pool.execute('SELECT COUNT(*) as cnt FROM catch_companies WHERE company = ?', [company]);
      console.log(`  - catch_companies: ${companyData[0].cnt}`);
      
      // catch_interview_questions 확인
      const [questions] = await pool.execute('SELECT COUNT(*) as cnt FROM catch_interview_questions WHERE company = ?', [company]);
      console.log(`  - catch_interview_questions: ${questions[0].cnt}`);
    }

    // catch_interview_questions의 회사명 샘플
    console.log('\n\nSample companies from catch_interview_questions:');
    const [interviewCompanies] = await pool.execute('SELECT DISTINCT company FROM catch_interview_questions LIMIT 10');
    console.log(interviewCompanies.map(c => `"${c.company}"`).join(', '));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMatching();
