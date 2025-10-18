import mysql from 'mysql2/promise';
import readline from 'readline';

// RDS 데이터베이스 연결 설정
const connection = await mysql.createConnection({
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
});

// 콘솔 입력을 받기 위한 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise 기반으로 질문하는 함수
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function deleteTableData() {
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           테이블 데이터 삭제 프로그램                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 사용 가능한 테이블 목록 조회
    console.log('📋 데이터베이스의 테이블 목록:\n');
    const [tables] = await connection.execute('SHOW TABLES');

    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    console.log('\n' + '='.repeat(60));

    // 테이블명 입력 받기
    const tableName = await question('\n삭제할 테이블명을 입력하세요: ');

    if (!tableName || tableName.trim() === '') {
      console.log('❌ 테이블명이 입력되지 않았습니다.');
      rl.close();
      await connection.end();
      process.exit(0);
    }

    // 테이블명 검증 (SQL Injection 방지)
    const sanitizedTableName = tableName.trim();

    // 테이블명에 허용되지 않는 문자 체크 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-zA-Z0-9_]+$/.test(sanitizedTableName)) {
      console.log('❌ 잘못된 테이블명 형식입니다. 영문, 숫자, 언더스코어(_)만 사용 가능합니다.');
      rl.close();
      await connection.end();
      process.exit(0);
    }

    // 테이블 존재 여부 확인 (테이블 목록에서 직접 확인)
    const [allTables] = await connection.execute('SHOW TABLES');
    const tableList = allTables.map(table => Object.values(table)[0]);

    if (!tableList.includes(sanitizedTableName)) {
      console.log(`❌ 테이블 '${sanitizedTableName}'이(가) 존재하지 않습니다.`);
      rl.close();
      await connection.end();
      process.exit(0);
    }

    // 삭제 전 데이터 건수 확인
    console.log(`\n📊 삭제 전 '${sanitizedTableName}' 테이블 데이터 현황:\n`);
    const [countBefore] = await connection.query(
      `SELECT COUNT(*) as count FROM \`${sanitizedTableName}\``
    );
    console.log(`  총 ${countBefore[0].count}건의 데이터가 있습니다.`);

    if (countBefore[0].count === 0) {
      console.log('\n✅ 삭제할 데이터가 없습니다.');
      rl.close();
      await connection.end();
      process.exit(0);
    }

    // 삭제 확인
    console.log('\n' + '='.repeat(60));
    console.log(`⚠️  경고: '${sanitizedTableName}' 테이블의 모든 데이터가 삭제됩니다!`);
    const confirm = await question('정말 삭제하시겠습니까? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ 삭제가 취소되었습니다.');
      rl.close();
      await connection.end();
      process.exit(0);
    }

    // 데이터 삭제 실행
    console.log(`\n🗑️  '${sanitizedTableName}' 테이블 데이터 삭제 중...\n`);
    const [deleteResult] = await connection.query(
      `DELETE FROM \`${sanitizedTableName}\``
    );
    console.log(`✅ ${deleteResult.affectedRows}건의 데이터가 삭제되었습니다.`);

    // 삭제 후 데이터 건수 확인
    console.log('\n' + '='.repeat(60));
    console.log('📊 삭제 후 데이터 현황:\n');
    const [countAfter] = await connection.query(
      `SELECT COUNT(*) as count FROM \`${sanitizedTableName}\``
    );
    console.log(`  총 ${countAfter[0].count}건의 데이터가 남아있습니다.`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 데이터 삭제 작업 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.code === 'ER_PARSE_ERROR') {
      console.error('⚠️  잘못된 테이블명입니다. 올바른 테이블명을 입력해주세요.');
    }
    process.exit(1);
  } finally {
    rl.close();
    await connection.end();
  }
}

// 프로그램 실행
deleteTableData();
