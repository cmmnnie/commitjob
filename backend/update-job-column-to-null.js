import mysql from 'mysql2/promise';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

// 데이터베이스 연결 설정
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  timezone: '+09:00'
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

async function updateJobColumnToNull() {
  let connection;

  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║       Jobs 테이블 컬럼 NULL 업데이트 프로그램        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    connection = await pool.getConnection();

    // jobs 테이블의 컬럼 정보 조회
    console.log('📋 Jobs 테이블의 컬럼 목록:\n');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jobs'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    columns.forEach((col, index) => {
      const nullable = col.IS_NULLABLE === 'YES' ? '(NULL 가능)' : '(NOT NULL)';
      const key = col.COLUMN_KEY ? ` [${col.COLUMN_KEY}]` : '';
      console.log(`  ${index + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${nullable}${key}`);
    });

    console.log('\n' + '='.repeat(60));

    // Job ID 입력 받기
    const jobIdInput = await question('\n수정할 Job ID를 입력하세요: ');

    if (!jobIdInput || jobIdInput.trim() === '') {
      console.log('❌ Job ID가 입력되지 않았습니다.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    const jobId = parseInt(jobIdInput.trim());

    if (isNaN(jobId) || jobId <= 0) {
      console.log('❌ 올바른 숫자 형식의 Job ID를 입력해주세요.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // Job 존재 여부 확인
    const [jobs] = await connection.execute(
      'SELECT * FROM jobs WHERE id = ?',
      [jobId]
    );

    if (jobs.length === 0) {
      console.log(`❌ ID ${jobId}인 Job이 존재하지 않습니다.`);
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // 현재 Job 정보 출력
    console.log(`\n📊 현재 Job 정보 (ID: ${jobId}):\n`);
    const job = jobs[0];
    for (const [key, value] of Object.entries(job)) {
      const displayValue = value === null ? 'NULL' : (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value);
      console.log(`  ${key}: ${displayValue}`);
    }

    console.log('\n' + '='.repeat(60));

    // NULL로 수정할 컬럼명 입력 받기
    const columnInput = await question('\nNULL로 수정할 컬럼명을 입력하세요 (여러 개는 쉼표로 구분): ');

    if (!columnInput || columnInput.trim() === '') {
      console.log('❌ 컬럼명이 입력되지 않았습니다.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // 쉼표로 구분된 컬럼명 파싱
    const columnNames = columnInput.split(',').map(col => col.trim()).filter(col => col !== '');

    if (columnNames.length === 0) {
      console.log('❌ 유효한 컬럼명이 입력되지 않았습니다.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // 컬럼명 검증
    const validColumns = columns.map(col => col.COLUMN_NAME);
    const invalidColumns = columnNames.filter(col => !validColumns.includes(col));

    if (invalidColumns.length > 0) {
      console.log(`❌ 존재하지 않는 컬럼: ${invalidColumns.join(', ')}`);
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // id 컬럼은 수정 불가
    if (columnNames.includes('id')) {
      console.log('❌ id 컬럼은 수정할 수 없습니다.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // NOT NULL 제약조건이 있는 컬럼 체크
    const notNullColumns = columnNames.filter(colName => {
      const colInfo = columns.find(col => col.COLUMN_NAME === colName);
      return colInfo && colInfo.IS_NULLABLE === 'NO';
    });

    if (notNullColumns.length > 0) {
      console.log(`⚠️  경고: 다음 컬럼은 NOT NULL 제약조건이 있습니다: ${notNullColumns.join(', ')}`);
      console.log('이 컬럼들을 NULL로 수정하면 오류가 발생할 수 있습니다.\n');
    }

    // 수정 내용 확인
    console.log(`\n📝 수정할 내용:\n`);
    console.log(`  Job ID: ${jobId}`);
    console.log(`  수정할 컬럼: ${columnNames.join(', ')}`);
    console.log(`  새로운 값: NULL\n`);

    // 현재 값 표시
    console.log(`현재 값:`);
    columnNames.forEach(colName => {
      const currentValue = job[colName];
      const displayValue = currentValue === null ? 'NULL' : (typeof currentValue === 'string' && currentValue.length > 100 ? currentValue.substring(0, 100) + '...' : currentValue);
      console.log(`  ${colName}: ${displayValue}`);
    });

    console.log('\n' + '='.repeat(60));

    // 수정 확인
    const confirm = await question('정말 수정하시겠습니까? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ 수정이 취소되었습니다.');
      rl.close();
      connection.release();
      await pool.end();
      process.exit(0);
    }

    // UPDATE 쿼리 생성 및 실행
    const setClause = columnNames.map(col => `\`${col}\` = NULL`).join(', ');
    const updateQuery = `UPDATE jobs SET ${setClause} WHERE id = ?`;

    console.log(`\n🔄 업데이트 실행 중...\n`);
    const [updateResult] = await connection.execute(updateQuery, [jobId]);

    if (updateResult.affectedRows === 0) {
      console.log('⚠️  업데이트된 행이 없습니다.');
    } else {
      console.log(`✅ ${updateResult.affectedRows}개 행이 업데이트되었습니다.`);
    }

    // 업데이트 후 데이터 확인
    console.log('\n' + '='.repeat(60));
    console.log('📊 업데이트 후 데이터:\n');

    const [updatedJobs] = await connection.execute(
      'SELECT * FROM jobs WHERE id = ?',
      [jobId]
    );

    if (updatedJobs.length > 0) {
      const updatedJob = updatedJobs[0];
      columnNames.forEach(colName => {
        const newValue = updatedJob[colName];
        const displayValue = newValue === null ? 'NULL' : (typeof newValue === 'string' && newValue.length > 100 ? newValue.substring(0, 100) + '...' : newValue);
        console.log(`  ${colName}: ${displayValue}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 업데이트 작업 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    rl.close();
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// 프로그램 실행
updateJobColumnToNull();
