import mysql from 'mysql2/promise';

const testData = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // 회사 데이터
    const [companies] = await connection.execute('SELECT * FROM companies LIMIT 3');
    console.log('회사 데이터:');
    companies.forEach(c => console.log(` - ${c.name}: ${c.location}`));

    // 채용공고 데이터
    const [jobs] = await connection.execute('SELECT * FROM job_postings LIMIT 3');
    console.log('\n채용공고 데이터:');
    jobs.forEach(j => console.log(` - ${j.title} (${j.company_id})`));

    // 사용자 데이터 (카카오 로그인 테스트)
    const [users] = await connection.execute('SELECT * FROM users ORDER BY id DESC LIMIT 3');
    console.log('\n최근 사용자:');
    users.forEach(u => console.log(` - ID: ${u.id}, ${u.name} (${u.email})`));

    await connection.end();
    console.log('\n✅ RDS 데이터 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

testData();
