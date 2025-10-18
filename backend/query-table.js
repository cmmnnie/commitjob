import mysql from 'mysql2/promise';
import readline from 'readline';

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

// readline 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 프롬프트 함수
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function queryTable(tableName) {
  try {
    console.log(`\n=== ${tableName} 테이블 전체 데이터 조회 ===\n`);

    // 테이블 존재 여부 확인
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (!tableNames.includes(tableName)) {
      console.log(`❌ 테이블 '${tableName}'이(가) 존재하지 않습니다.`);
      console.log(`\n사용 가능한 테이블 목록:`);
      tableNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
      return;
    }

    // 전체 데이터 조회
    const [rows] = await pool.execute(`SELECT * FROM ${tableName}`);

    console.log(`📊 총 ${rows.length}건의 데이터\n`);

    if (rows.length === 0) {
      console.log('데이터가 없습니다.');
      return;
    }

    // 컬럼명 출력
    const columns = Object.keys(rows[0]);
    console.log('컬럼 목록:', columns.join(', '));
    console.log('='.repeat(150));
    console.log('');

    // 각 데이터 출력
    rows.forEach((row, index) => {
      console.log(`\n[${index + 1}] ==========================================`);
      columns.forEach(col => {
        let value = row[col];

        // null 또는 undefined 처리
        if (value === null || value === undefined) {
          value = 'NULL';
        }
        // Buffer 타입 처리 (이미지 등)
        else if (Buffer.isBuffer(value)) {
          value = `<Buffer ${value.length} bytes>`;
        }
        // 날짜 타입 처리
        else if (value instanceof Date) {
          value = value.toISOString();
        }
        // JSON 타입 처리
        else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // 긴 텍스트는 줄바꿈 처리
        else if (typeof value === 'string' && value.length > 200) {
          value = value.substring(0, 200) + '...';
        }

        console.log(`  ${col}: ${value}`);
      });
    });

    console.log('\n');
    console.log('='.repeat(150));
    console.log(`총 ${rows.length}건 조회 완료`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        CommitJob 데이터베이스 테이블 조회 도구         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 사용 가능한 테이블 목록 표시
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log('📋 사용 가능한 테이블 목록:\n');

    // 각 테이블의 데이터 건수 조회
    for (let i = 0; i < tableNames.length; i++) {
      const name = tableNames[i];
      const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${name}`);
      const count = countResult[0].count;
      console.log(`  ${String(i + 1).padStart(2)}. ${name.padEnd(35)} (${count}건)`);
    }

    console.log('\n' + '─'.repeat(60));

    let tableName;

    // 명령행 인자가 있으면 사용
    if (process.argv.length > 2) {
      tableName = process.argv[2];
      console.log(`\n🔍 조회할 테이블: ${tableName}`);
    } else {
      // 인터랙티브 입력
      tableName = await question('\n🔍 조회할 테이블명을 입력하세요 (종료: q): ');
    }

    if (tableName.toLowerCase() === 'q') {
      console.log('\n프로그램을 종료합니다.');
      rl.close();
      await pool.end();
      return;
    }

    if (!tableName.trim()) {
      console.log('\n❌ 테이블명을 입력해주세요.');
      rl.close();
      await pool.end();
      return;
    }

    // 테이블 데이터 조회
    await queryTable(tableName.trim());

    rl.close();
    await pool.end();
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    await pool.end();
    process.exit(1);
  }
}

main();
