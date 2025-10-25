import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_CONFIG = {
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb',
  multipleStatements: true
};

async function importBaekData() {
  let connection;

  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        baek.sql 데이터 import                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ AWS RDS MySQL 연결 성공\n');

    // 기존 데이터 삭제
    console.log('🗑️  기존 데이터 삭제 중...');
    await connection.execute('DELETE FROM company_workbook_problem');
    await connection.execute('DELETE FROM problem_detail');
    console.log('✅ 기존 데이터 삭제 완료\n');

    // baek.sql 파일 읽기
    const sqlFilePath = path.join(__dirname, '..', 'coding', 'baek.sql');
    console.log(`📂 SQL 파일 읽기: ${sqlFilePath}\n`);

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // SQL 파일에서 필요한 부분만 추출
    // 1. company_workbook_problem 데이터
    console.log('📊 1. company_workbook_problem 데이터 추출 중...');

    const companyProblemMatch = sqlContent.match(/INSERT INTO `company_workbook_problem` VALUES[\s\S]*?;/);

    if (companyProblemMatch) {
      const companyProblemInsert = companyProblemMatch[0];
      await connection.query(companyProblemInsert);
      console.log('✅ company_workbook_problem 데이터 삽입 완료\n');
    }

    // 2. problem_detail 데이터
    console.log('📊 2. problem_detail 데이터 추출 중...');

    // problem_detail INSERT문 찾기 (복잡한 HTML 포함)
    const problemDetailStart = sqlContent.indexOf("INSERT INTO `problem_detail` VALUES");

    if (problemDetailStart !== -1) {
      // INSERT 시작부터 다음 테이블 정의 전까지 추출
      let problemDetailEnd = sqlContent.indexOf("UNLOCK TABLES;", problemDetailStart);

      if (problemDetailEnd === -1) {
        problemDetailEnd = sqlContent.length;
      }

      const problemDetailInsert = sqlContent.substring(problemDetailStart, problemDetailEnd);

      // 파일이 너무 커서 직접 실행하기 어려우므로, 파일로 저장 후 mysql 명령어로 실행
      const tempSqlPath = path.join(__dirname, 'temp_problem_detail.sql');
      fs.writeFileSync(tempSqlPath, problemDetailInsert);

      console.log('⚠️  problem_detail 데이터가 너무 큽니다. 수동 import가 필요합니다.');
      console.log(`   임시 파일 생성: ${tempSqlPath}`);
      console.log('   또는 create-coding-test-tables.js의 샘플 데이터를 사용하세요.\n');
    }

    // 결과 확인
    console.log('📊 3. 삽입 결과 확인\n');

    const [companyStats] = await connection.execute(`
      SELECT company, COUNT(*) as count
      FROM company_workbook_problem
      GROUP BY company
      ORDER BY company
    `);

    console.log('기업별 문제 수:');
    companyStats.forEach(row => {
      console.log(`  - ${row.company}: ${row.count}건`);
    });

    const [detailCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM problem_detail'
    );

    console.log(`\n문제 상세 정보: ${detailCount[0].count}건\n`);

    console.log('='.repeat(80));
    console.log('✅ 데이터 import 완료!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.code) {
      console.error(`오류 코드: ${error.code}`);
    }
    if (error.sqlMessage) {
      console.error(`SQL 오류: ${error.sqlMessage}`);
    }
    console.error('\n');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 프로그램 실행
importBaekData();
