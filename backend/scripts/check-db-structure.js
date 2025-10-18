import mysql from 'mysql2/promise';

const checkDBStructure = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // 모든 테이블 조회
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('=== 데이터베이스 테이블 목록 ===');
    tables.forEach(t => console.log(` - ${Object.values(t)[0]}`));

    // companies 테이블 구조
    console.log('\n=== companies 테이블 구조 ===');
    const [companiesDesc] = await connection.execute('DESCRIBE companies');
    companiesDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // job_postings 테이블 구조
    console.log('\n=== job_postings 테이블 구조 ===');
    const [jobsDesc] = await connection.execute('DESCRIBE job_postings');
    jobsDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // catch 관련 테이블이 있는지 확인
    const [catchTables] = await connection.execute("SHOW TABLES LIKE '%catch%'");
    if (catchTables.length > 0) {
      console.log('\n=== Catch 관련 테이블 ===');
      catchTables.forEach(t => console.log(` - ${Object.values(t)[0]}`));
    }

    await connection.end();
    console.log('\n✅ 데이터베이스 구조 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

checkDBStructure();
