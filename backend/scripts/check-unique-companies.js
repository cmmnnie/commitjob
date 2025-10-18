import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

console.log('📊 Jobs 테이블 고유 회사 확인\n');

// 고유 회사 수
const [countResult] = await connection.execute(`
  SELECT COUNT(DISTINCT company) as count FROM jobs
`);
console.log(`총 고유 회사 수: ${countResult[0].count}개\n`);

// 회사 목록 (상위 20개)
const [companies] = await connection.execute(`
  SELECT company, COUNT(*) as job_count
  FROM jobs
  GROUP BY company
  ORDER BY job_count DESC
  LIMIT 20
`);

console.log('공고가 많은 상위 20개 회사:');
console.log('='.repeat(60));
companies.forEach((row, i) => {
  console.log(`  ${String(i+1).padStart(2)}. ${row.company.padEnd(30)} (${row.job_count}건)`);
});

await connection.end();
