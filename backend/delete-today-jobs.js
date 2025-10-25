import mysql from 'mysql2/promise';

// RDS 데이터베이스 연결 설정
const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

async function deleteTodayJobs() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         오늘 스크래핑된 Jobs 데이터 삭제              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 오늘 날짜
    const today = new Date();
    console.log(`📅 오늘 날짜: ${today.toLocaleDateString('ko-KR')}\n`);

    // 오늘 스크래핑된 데이터 건수 확인
    console.log('📊 삭제할 데이터 확인 중...\n');
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as count FROM jobs WHERE DATE(scraped_at) = CURDATE()`
    );

    const count = countResult[0].count;
    console.log(`  오늘 스크래핑된 데이터: ${count}건`);

    if (count === 0) {
      console.log('\n✅ 오늘 스크래핑된 데이터가 없습니다.');
      await connection.end();
      process.exit(0);
    }

    // 샘플 데이터 조회 (최대 5건)
    console.log('\n📋 삭제 예정 데이터 샘플 (최대 5건):\n');
    const [sampleData] = await connection.query(
      `SELECT id, company, title, scraped_at
       FROM jobs
       WHERE DATE(scraped_at) = CURDATE()
       LIMIT 5`
    );

    sampleData.forEach((row, index) => {
      console.log(`  ${index + 1}. [ID: ${row.id}] ${row.company} - ${row.title}`);
      console.log(`     스크래핑 시간: ${row.scraped_at}`);
    });

    // 데이터 삭제 실행
    console.log('\n' + '='.repeat(60));
    console.log(`⚠️  오늘(${today.toLocaleDateString('ko-KR')}) 스크래핑된 ${count}건의 데이터를 삭제합니다...\n`);

    const [deleteResult] = await connection.query(
      `DELETE FROM jobs WHERE DATE(scraped_at) = CURDATE()`
    );
    console.log(`✅ ${deleteResult.affectedRows}건의 데이터가 삭제되었습니다.`);

    // 삭제 후 전체 데이터 건수 확인
    console.log('\n' + '='.repeat(60));
    console.log('📊 삭제 후 jobs 테이블 현황:\n');
    const [countAfter] = await connection.query(
      `SELECT COUNT(*) as count FROM jobs`
    );
    console.log(`  전체 남은 데이터: ${countAfter[0].count}건`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 데이터 삭제 작업 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 프로그램 실행
deleteTodayJobs();
