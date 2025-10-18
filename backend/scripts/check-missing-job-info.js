import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

async function checkMissingJobInfo() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         job_info 누락 데이터 확인                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // job_info가 NULL이거나 빈 값인 데이터 조회
    const [missingJobInfo] = await connection.execute(`
      SELECT id, company, title, job_info, conditions, registration_info, scraped_at
      FROM jobs
      WHERE job_info IS NULL OR job_info = '' OR job_info = '[]'
      ORDER BY scraped_at DESC
    `);

    console.log(`📊 job_info가 없는 데이터: ${missingJobInfo.length}건\n`);

    if (missingJobInfo.length > 0) {
      console.log('='.repeat(120));
      console.log('상세 내역:\n');

      missingJobInfo.forEach((job, index) => {
        console.log(`[${index + 1}] ==========================================`);
        console.log(`  ID: ${job.id}`);
        console.log(`  회사: ${job.company}`);
        console.log(`  제목: ${job.title.substring(0, 80)}${job.title.length > 80 ? '...' : ''}`);
        console.log(`  job_info: ${job.job_info || 'NULL'}`);
        console.log(`  conditions: ${job.conditions || 'NULL'}`);
        console.log(`  registration_info: ${job.registration_info || 'NULL'}`);
        console.log(`  scraped_at: ${job.scraped_at}`);
        console.log('');
      });

      console.log('='.repeat(120));
    }

    // 전체 통계
    const [totalCount] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    const [hasJobInfo] = await connection.execute(`
      SELECT COUNT(*) as count FROM jobs
      WHERE job_info IS NOT NULL AND job_info != '' AND job_info != '[]'
    `);

    console.log('\n📈 전체 통계:');
    console.log(`  - 전체 데이터: ${totalCount[0].count}건`);
    console.log(`  - job_info 있음: ${hasJobInfo[0].count}건`);
    console.log(`  - job_info 없음: ${missingJobInfo.length}건`);
    console.log(`  - 완성도: ${((hasJobInfo[0].count / totalCount[0].count) * 100).toFixed(2)}%`);

    await connection.end();
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    await connection.end();
    process.exit(1);
  }
}

checkMissingJobInfo();
