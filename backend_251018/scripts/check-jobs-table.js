import mysql from 'mysql2/promise';

const checkJobsTable = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // jobs 테이블 구조
    console.log('=== jobs 테이블 구조 ===');
    const [jobsDesc] = await connection.execute('DESCRIBE jobs');
    jobsDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // 샘플 데이터 조회
    console.log('\n=== jobs 테이블 샘플 데이터 (1개) ===');
    const [sample] = await connection.execute('SELECT * FROM jobs LIMIT 1');
    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    }

    await connection.end();
    console.log('\n✅ 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

checkJobsTable();
