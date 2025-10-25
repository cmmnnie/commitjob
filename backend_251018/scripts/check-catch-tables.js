import mysql from 'mysql2/promise';

const checkCatchTables = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // catch_companies 테이블 구조
    console.log('=== catch_companies 테이블 구조 ===');
    const [companiesDesc] = await connection.execute('DESCRIBE catch_companies');
    companiesDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // catch_reviews 테이블 구조
    console.log('\n=== catch_reviews 테이블 구조 ===');
    const [reviewsDesc] = await connection.execute('DESCRIBE catch_reviews');
    reviewsDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // jobs 테이블 구조 (catch scraper가 사용하는 테이블)
    console.log('\n=== jobs 테이블 구조 ===');
    const [jobsDesc] = await connection.execute('DESCRIBE jobs');
    jobsDesc.forEach(col => console.log(` ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`));

    // 각 테이블 데이터 개수 확인
    const [companiesCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
    console.log(`\n=== 데이터 개수 ===`);
    console.log(` catch_companies: ${companiesCount[0].count}개`);

    const [reviewsCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
    console.log(` catch_reviews: ${reviewsCount[0].count}개`);

    const [jobsCount] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(` jobs: ${jobsCount[0].count}개`);

    // 샘플 데이터 확인
    console.log(`\n=== jobs 테이블 샘플 데이터 ===`);
    const [jobsSample] = await connection.execute('SELECT * FROM jobs LIMIT 2');
    jobsSample.forEach(job => {
      console.log(`\nID: ${job.id}`);
      console.log(`  회사: ${job.company}`);
      console.log(`  제목: ${job.title}`);
      console.log(`  URL: ${job.url}`);
      console.log(`  카테고리: ${job.category}`);
    });

    await connection.end();
    console.log('\n✅ Catch 테이블 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  }
};

checkCatchTables();
