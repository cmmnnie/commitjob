import mysql from 'mysql2/promise';
import fs from 'fs';

const migrate = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb',
      multipleStatements: true
    });

    console.log('✅ RDS 연결 성공');

    // SQL 파일 읽기
    const sql = fs.readFileSync('/Users/cmmnnie/Dev/test/캡스톤/backend/database-setup.sql', 'utf8');

    console.log('SQL 스키마 적용 중...');

    // SQL 실행
    await connection.query(sql);

    console.log('✅ 스키마 적용 완료!');

    // 테이블 목록 확인
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n생성된 테이블 목록:');
    tables.forEach(t => console.log(' -', Object.values(t)[0]));

    // 샘플 데이터 확인
    const [companies] = await connection.execute('SELECT COUNT(*) as count FROM companies');
    const [jobs] = await connection.execute('SELECT COUNT(*) as count FROM job_postings');

    console.log('\n데이터 확인:');
    console.log(' - 회사:', companies[0].count, '개');
    console.log(' - 채용공고:', jobs[0].count, '개');

    await connection.end();
    console.log('\n✅ 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  }
};

migrate();
