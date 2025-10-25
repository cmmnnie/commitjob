import mysql from 'mysql2/promise';

const verifyData = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // jobs 테이블 데이터 확인
    console.log('=== jobs 테이블 현황 ===');
    const [jobsCount] = await connection.execute('SELECT COUNT(*) as count FROM jobs');
    console.log(`총 채용공고 수: ${jobsCount[0].count}개`);

    const [jobsByCategory] = await connection.execute(`
      SELECT category, COUNT(*) as count
      FROM jobs
      GROUP BY category
    `);
    console.log('\n카테고리별:');
    jobsByCategory.forEach(row => {
      console.log(`  - ${row.category}: ${row.count}개`);
    });

    const [latestJobs] = await connection.execute(`
      SELECT company, title, category, scraped_at
      FROM jobs
      ORDER BY scraped_at DESC
      LIMIT 5
    `);
    console.log('\n최근 추가된 공고:');
    latestJobs.forEach((job, i) => {
      console.log(`  ${i+1}. [${job.category}] ${job.company} - ${job.title}`);
      console.log(`     (${job.scraped_at})`);
    });

    // catch_companies 테이블 데이터 확인
    console.log('\n=== catch_companies 테이블 현황 ===');
    const [companiesCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
    console.log(`총 회사 수: ${companiesCount[0].count}개`);

    const [latestCompanies] = await connection.execute(`
      SELECT name, industry, location
      FROM catch_companies
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n최근 추가된 회사:');
    latestCompanies.forEach((company, i) => {
      console.log(`  ${i+1}. ${company.name} (${company.industry || 'N/A'})`);
      console.log(`     위치: ${company.location || 'N/A'}`);
    });

    // catch_reviews 테이블 데이터 확인
    console.log('\n=== catch_reviews 테이블 현황 ===');
    const [reviewsCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
    console.log(`총 리뷰 수: ${reviewsCount[0].count}개`);

    await connection.end();
    console.log('\n✅ 데이터 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

verifyData();
