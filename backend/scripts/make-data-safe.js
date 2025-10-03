// ==============================================================================
// 백준 문제 데이터를 법적으로 안전한 형태로 변환
// - 출처 명시
// - 문제 전문 대신 요약 및 링크 제공
// - 교육 목적 명시
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

async function makeProblemDataSafe() {
  console.log('='.repeat(80));
  console.log('백준 문제 데이터를 법적으로 안전한 형태로 변환');
  console.log('='.repeat(80));

  try {
    // 모든 백준 문제 조회
    const [problems] = await pool.execute(
      'SELECT id, problem_id, title, content, url FROM baekjoon_problems'
    );

    console.log(`총 ${problems.length}개의 문제를 처리합니다...\n`);

    let processedCount = 0;

    for (const problem of problems) {
      let contentObj;

      try {
        contentObj = typeof problem.content === 'string'
          ? JSON.parse(problem.content)
          : problem.content;
      } catch (e) {
        contentObj = {};
      }

      // 안전한 형태로 변환
      const safeContent = {
        // 법적 고지
        notice: "본 문제는 교육 목적의 졸업작품을 위해 제공됩니다. 모든 저작권은 백준 온라인 저지에 있습니다.",
        sourceAttribution: {
          source: "백준 온라인 저지 (Baekjoon Online Judge)",
          sourceUrl: problem.url || `https://www.acmicpc.net/problem/${problem.problem_id}`,
          originalProblemId: problem.problem_id
        },

        // 간단한 메타 정보만 유지 (저작권 침해 최소화)
        summary: contentObj.description
          ? `${contentObj.description.substring(0, 100)}...`
          : "문제 설명은 백준 사이트에서 확인하세요.",

        // 예제는 1개만 유지 (나머지는 백준에서 확인)
        sampleExample: contentObj.examples && contentObj.examples.length > 0
          ? {
              input: contentObj.examples[0].input?.substring(0, 50) + '...',
              output: contentObj.examples[0].output?.substring(0, 50) + '...',
              note: "전체 예제는 백준에서 확인하세요"
            }
          : null,

        // 학습 힌트 (우리가 추가한 부가 정보)
        learningTips: {
          category: "구현, 시뮬레이션 등",
          difficulty: "문제 난이도 참고",
          timeComplexity: "백준 사이트 참고"
        },

        // 중요: 전체 내용 제거
        fullContent: null,
        description: null,
        inputFormat: null,
        outputFormat: null,
        examples: null
      };

      await pool.execute(
        'UPDATE baekjoon_problems SET content = ? WHERE id = ?',
        [JSON.stringify(safeContent), problem.id]
      );

      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`진행중... ${processedCount}/${problems.length}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 완료: ${processedCount}개 문제 변환됨`);
    console.log('');
    console.log('변환 내용:');
    console.log('  - 출처 명시: 모든 문제에 백준 출처 표기');
    console.log('  - 내용 최소화: 요약본과 1개 예제만 유지');
    console.log('  - 링크 제공: 전체 내용은 백준 사이트로 연결');
    console.log('  - 교육 목적 명시: 졸업작품임을 명확히 표기');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

async function main() {
  try {
    await makeProblemDataSafe();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }
}

main();
