import mysql from 'mysql2/promise';
import readline from 'readline';
import fs from 'fs';

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

async function queryTable(tableName, saveToFile = false) {
  try {
    console.log(`\n=== ${tableName} 테이블 전체 데이터 조회 (생략 없음) ===\n`);

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

    let output = '';
    output += `=== ${tableName} 테이블 전체 데이터 조회 (생략 없음) ===\n\n`;
    output += `📊 총 ${rows.length}건의 데이터\n\n`;
    output += `컬럼 목록: ${columns.join(', ')}\n`;
    output += '='.repeat(150) + '\n\n';

    // 각 데이터 출력 (생략 없이 전체 출력)
    rows.forEach((row, index) => {
      const separator = `\n[${index + 1}] ==========================================`;
      console.log(separator);
      output += separator + '\n';

      columns.forEach(col => {
        let value = row[col];
        let displayValue;

        // null 또는 undefined 처리
        if (value === null || value === undefined) {
          displayValue = 'NULL';
        }
        // Buffer 타입 처리 (이미지 등)
        else if (Buffer.isBuffer(value)) {
          displayValue = `<Buffer ${value.length} bytes>`;
        }
        // 날짜 타입 처리
        else if (value instanceof Date) {
          displayValue = value.toISOString();
        }
        // JSON 타입 처리
        else if (typeof value === 'object') {
          displayValue = JSON.stringify(value, null, 2);
        }
        // 문자열 타입 - 생략 없이 전체 출력
        else {
          displayValue = String(value);
        }

        const line = `  ${col}: ${displayValue}`;
        console.log(line);
        output += line + '\n';
      });
    });

    const footer = '\n' + '='.repeat(150) + `\n총 ${rows.length}건 조회 완료\n`;
    console.log(footer);
    output += footer;

    // 파일로 저장 옵션
    if (saveToFile) {
      const fileName = `${tableName}_full_export_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      fs.writeFileSync(fileName, output, 'utf-8');
      console.log(`\n💾 결과가 파일로 저장되었습니다: ${fileName}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║     CommitJob 테이블 조회 도구 (생략 없는 전체 버전)    ║');
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
    let saveToFile = false;

    // 명령행 인자가 있으면 사용
    if (process.argv.length > 2) {
      tableName = process.argv[2];
      console.log(`\n🔍 조회할 테이블: ${tableName}`);

      // --save 옵션 확인
      if (process.argv.includes('--save')) {
        saveToFile = true;
        console.log('💾 결과를 파일로 저장합니다.');
      }
    } else {
      // 인터랙티브 입력
      tableName = await question('\n🔍 조회할 테이블명을 입력하세요 (종료: q): ');

      if (tableName.toLowerCase() !== 'q' && tableName.trim()) {
        const saveAnswer = await question('💾 결과를 파일로 저장하시겠습니까? (y/n): ');
        saveToFile = saveAnswer.toLowerCase() === 'y';
      }
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
    await queryTable(tableName.trim(), saveToFile);

    rl.close();
    await pool.end();
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    rl.close();
    await pool.end();
    process.exit(1);
  }
}

main();
