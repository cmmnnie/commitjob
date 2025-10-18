import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb',
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

    // 통계 데이터 수집
    const tableStats = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const tableName of tableNames) {
      const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const totalCount = countResult[0].count;

      // 테이블 구조 확인하여 created_at 컬럼 존재 여부 체크
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
      const hasCreatedAt = columns.some(col => col.Field === 'created_at');

      let todayCount = 0;
      if (hasCreatedAt) {
        const [todayResult] = await pool.execute(
          `SELECT COUNT(*) as count FROM ${tableName} WHERE DATE(created_at) = ?`,
          [today]
        );
        todayCount = todayResult[0].count;
      }

      tableStats.push({ tableName, totalCount, todayCount, hasCreatedAt });
    }

    // 각 테이블의 구조 및 데이터 건수 조회
    for (const tableName of tableNames) {
      console.log(`\n📋 테이블: ${tableName}`);
      console.log('='.repeat(100));

      // 테이블 구조 조회
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);

      // 데이터 건수 조회
      const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult[0].count;

      const stat = tableStats.find(s => s.tableName === tableName);
      const todayCountStr = stat.todayCount > 0 ? `, 오늘 INSERT: ${stat.todayCount}건` : '';

      console.log(`📊 데이터 건수: ${rowCount}건${todayCountStr}\n`);

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

      // 샘플 데이터 1건 조회 (최근 insert된 데이터)
      if (rowCount > 0) {
        console.log('\n📄 최근 데이터 (1건):');
        console.log('-'.repeat(100));

        // created_at 컬럼이 있으면 최근 데이터, 없으면 그냥 1건
        const stat = tableStats.find(s => s.tableName === tableName);
        let query = `SELECT * FROM ${tableName}`;
        if (stat.hasCreatedAt) {
          query += ` ORDER BY created_at DESC LIMIT 1`;
        } else {
          query += ` LIMIT 1`;
        }

        const [sampleData] = await pool.execute(query);

        if (sampleData.length > 0) {
          const sample = sampleData[0];
          for (const [key, value] of Object.entries(sample)) {
            let displayValue = value;

            // 긴 텍스트는 100자로 제한
            if (typeof value === 'string' && value.length > 100) {
              displayValue = value.substring(0, 100) + '...';
            }
            // NULL 값 표시
            else if (value === null) {
              displayValue = 'NULL';
            }
            // 날짜 타입 포맷팅
            else if (value instanceof Date) {
              displayValue = value.toISOString();
            }

            console.log(`  ${key}: ${displayValue}`);
          }
        }
      }

      console.log('');
    }

    // 전체 테이블 요약 정보 (하단)
    console.log('\n\n');
    console.log('📊 전체 테이블 리스트 및 데이터 건수');
    console.log('='.repeat(100));
    console.log('테이블명'.padEnd(40) + '전체 건수'.padEnd(20) + '오늘 INSERT 건수');
    console.log('-'.repeat(100));

    for (const stat of tableStats) {
      console.log(`${stat.tableName.padEnd(40)}${stat.totalCount.toString().padEnd(20)}${stat.todayCount > 0 ? stat.todayCount : '-'}`);
    }

    console.log('='.repeat(100));

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

queryDatabaseStructure();
