import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
};

async function queryByColumn() {
  let connection;

  try {
    // 명령줄 인자 확인
    const args = process.argv.slice(2);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        특정 컬럼 값으로 데이터 조회 도구               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // DB 연결
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ AWS RDS MySQL 연결 성공\n');

    // 사용법 안내
    if (args.length < 3) {
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME, TABLE_ROWS
        FROM information_schema.tables
        WHERE table_schema = 'appdb'
        ORDER BY TABLE_NAME
      `);

      console.log('📋 사용 가능한 테이블 목록:\n');
      tables.forEach((table, index) => {
        const tableName = table.TABLE_NAME;
        const rows = table.TABLE_ROWS || 0;
        console.log(`   ${String(index + 1).padStart(2)}. ${tableName.padEnd(35)} (${rows}건)`);
      });

      console.log('\n' + '='.repeat(80));
      console.log('사용법: node query-by-column.js <테이블명> <컬럼명> <검색값>');
      console.log('='.repeat(80));
      console.log('\n예시:');
      console.log('  node query-by-column.js catch_interview_questions company 카카오');
      console.log('  node query-by-column.js jobs company 네이버');
      console.log('  node query-by-column.js catch_companies industry IT');
      console.log('\n');
      await connection.end();
      return;
    }

    const [tableName, columnName, searchValue] = args;

    console.log(`🔍 조회 조건:`);
    console.log(`   테이블: ${tableName}`);
    console.log(`   컬럼: ${columnName}`);
    console.log(`   검색값: ${searchValue}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // 테이블 존재 확인
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = 'appdb' AND TABLE_NAME = ?
    `, [tableName]);

    if (tables.length === 0) {
      console.log(`❌ 테이블 '${tableName}'이 존재하지 않습니다.\n`);
      await connection.end();
      return;
    }

    // 컬럼 존재 확인
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.columns
      WHERE table_schema = 'appdb' AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [tableName, columnName]);

    if (columns.length === 0) {
      console.log(`❌ 컬럼 '${columnName}'이 테이블 '${tableName}'에 존재하지 않습니다.\n`);

      // 사용 가능한 컬럼 목록 표시
      const [allColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM information_schema.columns
        WHERE table_schema = 'appdb' AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);

      console.log(`\n📋 ${tableName} 테이블의 사용 가능한 컬럼:\n`);
      allColumns.forEach((col, index) => {
        console.log(`   ${String(index + 1).padStart(2)}. ${col.COLUMN_NAME.padEnd(30)} (${col.DATA_TYPE})`);
      });
      console.log('\n');

      await connection.end();
      return;
    }

    // 데이터 조회 (LIKE 검색 지원)
    const searchPattern = `%${searchValue}%`;
    const [rows] = await connection.execute(
      `SELECT * FROM ${tableName} WHERE ${columnName} LIKE ? LIMIT 100`,
      [searchPattern]
    );

    if (rows.length === 0) {
      console.log(`📊 조회 결과: 0건\n`);
      console.log(`'${columnName}' 컬럼에서 '${searchValue}'를 포함하는 데이터가 없습니다.\n`);
      await connection.end();
      return;
    }

    console.log(`📊 조회 결과: ${rows.length}건 (최대 100건까지 표시)\n`);

    // 컬럼명 목록 출력
    const columnNames = Object.keys(rows[0]);
    console.log('컬럼 목록:', columnNames.join(', '));
    console.log('='.repeat(80) + '\n');

    // 결과 출력
    rows.forEach((row, index) => {
      console.log(`[${index + 1}] ${'='.repeat(40)}`);
      columnNames.forEach(colName => {
        let value = row[colName];

        // 값 포맷팅
        if (value === null) {
          value = 'NULL';
        } else if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }

        // 긴 텍스트는 줄바꿈
        if (value.length > 100) {
          value = value.substring(0, 100) + '...';
        }

        console.log(`  ${colName}: ${value}`);
      });
      console.log('');
    });

    console.log('\n' + '='.repeat(80));
    console.log(`총 ${rows.length}건 조회 완료`);
    console.log('='.repeat(80) + '\n');

    console.log('✅ 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.code) {
      console.error(`오류 코드: ${error.code}`);
    }
    console.error('\n');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 프로그램 실행
queryByColumn();
