import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function queryAllJobs() {
  try {
    console.log('=== Jobs 테이블 전체 데이터 조회 ===\n');

    // 전체 데이터 조회 (scraped_at 오름차순)
    const [jobs] = await pool.execute(
      'SELECT * FROM jobs ORDER BY scraped_at '
    );

    console.log(`📊 총 ${jobs.length}건의 데이터\n`);

    if (jobs.length === 0) {
      console.log('데이터가 없습니다.');
      await pool.end();
      return;
    }

    // 컬럼명 출력
    const columns = Object.keys(jobs[0]);
    console.log('컬럼 목록:', columns.join(', '));
    console.log('='.repeat(150));
    console.log('');

    // 각 데이터 출력
    jobs.forEach((job, index) => {
      console.log(`\n[${index + 1}] ==========================================`);
      columns.forEach(col => {
        let value = job[col];

        // null 또는 undefined 처리
        if (value === null || value === undefined) {
          value = 'NULL';
        }
        // 날짜 타입 처리
        else if (value instanceof Date) {
          value = value.toISOString();
        }
        // 긴 텍스트는 줄바꿈 처리
        else if (typeof value === 'string' && value.length > 100) {
          value = value.substring(0, 100) + '...';
        }

        console.log(`  ${col}: ${value}`);
      });
    });

    console.log('\n');
    console.log('='.repeat(150));
    console.log(`총 ${jobs.length}건 조회 완료`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

queryAllJobs();
