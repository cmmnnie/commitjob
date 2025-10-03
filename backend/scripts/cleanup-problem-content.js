// ==============================================================================
// 백준 문제 데이터 정리 스크립트
// 저작권 문제 방지: 문제 전문을 삭제하고 메타데이터만 유지
// ==============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function cleanupProblemContent() {
  console.log('='.repeat(80));
  console.log('백준 문제 데이터 정리 시작');
  console.log('문제 전문을 삭제하고 메타데이터만 유지합니다');
  console.log('='.repeat(80));

  try {
    // 모든 백준 문제 조회
    const [problems] = await pool.execute(
      'SELECT id, problem_id, title FROM baekjoon_problems'
    );

    console.log(`총 ${problems.length}개의 문제를 처리합니다...`);

    let processedCount = 0;

    for (const problem of problems) {
      // content를 간단한 메타데이터로 변경
      const metadataOnly = {
        notice: '이 문제의 전체 내용은 백준 온라인 저지에서 확인하실 수 있습니다.',
        description: '',
        inputFormat: '',
        outputFormat: '',
        examples: []
      };

      await pool.execute(
        'UPDATE baekjoon_problems SET content = ? WHERE id = ?',
        [JSON.stringify(metadataOnly), problem.id]
      );

      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`진행중... ${processedCount}/${problems.length}`);
      }
    }

    console.log('='.repeat(80));
    console.log(`✅ 완료: ${processedCount}개 문제 정리됨`);
    console.log('모든 문제는 이제 백준 사이트로 링크만 제공됩니다');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

async function main() {
  try {
    await cleanupProblemContent();
    process.exit(0);
  } catch (error) {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }
}

main();
