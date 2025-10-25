import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
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
    console.log('Checking database data...\n');

    // catch_companies 테이블 확인
    const [companies] = await pool.execute('SELECT COUNT(*) as count, company FROM catch_companies GROUP BY company LIMIT 5');
    console.log('catch_companies:', companies.length > 0 ? `${companies.length} companies found` : 'No data');
    if (companies.length > 0) {
      console.log('Sample companies:', companies.map(c => c.company).join(', '));
    }

    // catch_reviews 테이블 확인
    const [reviews] = await pool.execute('SELECT COUNT(*) as count FROM catch_reviews');
    console.log('\ncatch_reviews:', reviews[0].count, 'reviews');

    // catch_interview_questions 테이블 확인
    const [questions] = await pool.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
    console.log('catch_interview_questions:', questions[0].count, 'questions');

    // 특정 회사 샘플 확인
    const [sampleJobs] = await pool.execute('SELECT DISTINCT company FROM jobs LIMIT 5');
    console.log('\nSample companies from jobs:', sampleJobs.map(j => j.company).join(', '));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
