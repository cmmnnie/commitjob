const mysql = require('mysql2/promise');

async function trimCompanyNames() {
  const conn = await mysql.createConnection({
    host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
    port: 3306,
    user: 'appuser',
    password: 'Woolim114!',
    database: 'appdb'
  });

  console.log('=== 공백 제거 전 확인 ===\n');

  const tables = ['jobs', 'catch_companies', 'catch_reviews', 'catch_interview_questions'];

  for (const table of tables) {
    const [before] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE company != TRIM(company)`
    );
    console.log(`${table}: ${before[0].cnt}개 레코드에 앞뒤 공백 존재`);
  }

  console.log('\n=== 공백 제거 실행 ===\n');

  for (const table of tables) {
    try {
      const [result] = await conn.execute(
        `UPDATE ${table} SET company = TRIM(company) WHERE company != TRIM(company)`
      );
      console.log(`✅ ${table}: ${result.affectedRows}개 레코드 업데이트 완료`);
    } catch (e) {
      console.log(`❌ ${table} 실패: ${e.message}`);
    }
  }

  console.log('\n=== 공백 제거 후 확인 ===\n');

  for (const table of tables) {
    const [after] = await conn.execute(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE company != TRIM(company)`
    );
    console.log(`${table}: ${after[0].cnt}개 레코드에 앞뒤 공백 존재`);
  }

  await conn.end();
  console.log('\n✅ 모든 작업 완료');
}

trimCompanyNames().catch(console.error);
