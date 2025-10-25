import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

console.log('🔧 catch_companies 테이블 컬럼명 변경: name -> company\n');

try {
  // name 컬럼을 company로 변경
  await connection.execute(`
    ALTER TABLE catch_companies
    CHANGE COLUMN name company VARCHAR(255) NOT NULL UNIQUE
  `);

  console.log('✅ 컬럼명 변경 완료: name -> company\n');

  // 변경 후 테이블 구조 확인
  const [columns] = await connection.execute('DESCRIBE catch_companies');
  console.log('변경된 테이블 구조:');
  console.log('='.repeat(80));
  columns.forEach(col => {
    console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Null} ${col.Key} ${col.Default || ''}`);
  });

} catch (error) {
  console.error('❌ 오류:', error.message);
}

await connection.end();
