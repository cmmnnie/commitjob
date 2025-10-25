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
  multipleStatements: false
};

async function importProblemDetail() {
  let connection;

  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        problem_detail 데이터 import                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ AWS RDS MySQL 연결 성공\n');

    // temp SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, 'temp_problem_detail_final.sql');
    console.log(`📂 SQL 파일 읽기: ${sqlFilePath}\n`);

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📊 problem_detail 데이터 삽입 중... (시간이 걸릴 수 있습니다)\n');

    // INSERT 문 실행
    await connection.query(sqlContent);

    console.log('✅ problem_detail 데이터 삽입 완료\n');

    // 결과 확인
    const [detailCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM problem_detail'
    );

    console.log(`📊 문제 상세 정보: ${detailCount[0].count}건\n`);

    console.log('='.repeat(80));
    console.log('✅ problem_detail 데이터 import 완료!');
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
importProblemDetail();
