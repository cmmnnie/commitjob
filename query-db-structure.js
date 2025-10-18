import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function queryDatabaseStructure() {
  try {
    // 모든 테이블 목록 조회
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log('=== CommitJob 데이터베이스 테이블 구조 ===\n');
    console.log(`총 ${tableNames.length}개의 테이블\n`);

    // 각 테이블의 구조 및 데이터 건수 조회
    for (const tableName of tableNames) {
      console.log(`\n📋 테이블: ${tableName}`);
      console.log('='.repeat(100));

      // 테이블 구조 조회
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);

      // 데이터 건수 조회
      const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult[0].count;

      console.log(`📊 데이터 건수: ${rowCount}건\n`);

      console.log('컬럼명'.padEnd(35) + '데이터 타입'.padEnd(30) + 'NULL'.padEnd(8) + 'Key'.padEnd(8) + 'Default');
      console.log('-'.repeat(100));

      columns.forEach(col => {
        const colName = col.Field.padEnd(35);
        const colType = col.Type.padEnd(30);
        const nullable = col.Null.padEnd(8);
        const key = col.Key.padEnd(8);
        const defaultVal = (col.Default !== null ? col.Default : 'NULL').toString();
        console.log(`${colName}${colType}${nullable}${key}${defaultVal}`);
      });

      console.log('');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

queryDatabaseStructure();
