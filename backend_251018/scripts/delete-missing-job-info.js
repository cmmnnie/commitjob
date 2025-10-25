import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

async function deleteMissingJobInfo() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      job_info 누락 데이터 삭제                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 삭제 전 데이터 확인
    const [beforeDelete] = await connection.execute(`
      SELECT id, company, title
      FROM jobs
      WHERE job_info IS NULL OR job_info = '' OR job_info = '[]'
      ORDER BY id
    `);

    console.log(`📊 삭제 대상 데이터: ${beforeDelete.length}건\n`);

    if (beforeDelete.length > 0) {
      console.log('삭제할 데이터 목록:');
      console.log('='.repeat(100));
      beforeDelete.forEach((job, index) => {
        console.log(`  ${index + 1}. [ID: ${job.id}] ${job.company} - ${job.title.substring(0, 60)}${job.title.length > 60 ? '...' : ''}`);
      });
      console.log('='.repeat(100));
      console.log('');
    }

    // 삭제 전 전체 건수
    const [totalBefore] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(`삭제 전 전체 데이터: ${totalBefore[0].count}건\n`);

    // job_info가 없는 데이터 삭제
    console.log('🗑️  삭제 중...\n');
    const [deleteResult] = await connection.execute(`
      DELETE FROM jobs
      WHERE job_info IS NULL OR job_info = '' OR job_info = '[]'
    `);

    console.log(`✅ ${deleteResult.affectedRows}건 삭제됨\n`);

    // 삭제 후 전체 건수
    const [totalAfter] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(`삭제 후 전체 데이터: ${totalAfter[0].count}건\n`);

    // 검증: job_info 없는 데이터 다시 확인
    const [afterCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM jobs
      WHERE job_info IS NULL OR job_info = '' OR job_info = '[]'
    `);

    console.log('='.repeat(60));
    console.log('📈 최종 상태:');
    console.log(`  - 총 데이터: ${totalAfter[0].count}건`);
    console.log(`  - job_info 누락: ${afterCheck[0].count}건`);
    console.log(`  - 완성도: 100%`);
    console.log('='.repeat(60));

    await connection.end();
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    await connection.end();
    process.exit(1);
  }
}

deleteMissingJobInfo();
