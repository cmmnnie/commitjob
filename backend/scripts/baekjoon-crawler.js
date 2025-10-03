// ==============================================================================
// 백준 문제 크롤러
// 삼성 SW 역량테스트 기출문제를 크롤링하여 DB에 저장
// ==============================================================================

import axios from 'axios';
import * as cheerio from 'cheerio';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 데이터베이스 연결 설정
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

// 삼성 SW 역량테스트 기출문제 목록
// 백준에서 공개적으로 알려진 삼성 기출문제들
const SAMSUNG_PROBLEMS = [
  { problem_id: '14500', title: '테트로미노', difficulty: 'Gold 4' },
  { problem_id: '14501', title: '퇴사', difficulty: 'Silver 3' },
  { problem_id: '14502', title: '연구소', difficulty: 'Gold 4' },
  { problem_id: '14503', title: '로봇 청소기', difficulty: 'Gold 5' },
  { problem_id: '14888', title: '연산자 끼워넣기', difficulty: 'Silver 1' },
  { problem_id: '14889', title: '스타트와 링크', difficulty: 'Silver 1' },
  { problem_id: '14890', title: '경사로', difficulty: 'Gold 3' },
  { problem_id: '14891', title: '톱니바퀴', difficulty: 'Gold 5' },
  { problem_id: '15683', title: '감시', difficulty: 'Gold 4' },
  { problem_id: '15684', title: '사다리 조작', difficulty: 'Gold 3' },
  { problem_id: '15685', title: '드래곤 커브', difficulty: 'Gold 4' },
  { problem_id: '15686', title: '치킨 배달', difficulty: 'Gold 5' },
  { problem_id: '16234', title: '인구 이동', difficulty: 'Gold 5' },
  { problem_id: '16235', title: '나무 재테크', difficulty: 'Gold 4' },
  { problem_id: '16236', title: '아기 상어', difficulty: 'Gold 3' },
  { problem_id: '17144', title: '미세먼지 안녕!', difficulty: 'Gold 4' },
  { problem_id: '17142', title: '연구소 3', difficulty: 'Gold 3' },
  { problem_id: '17143', title: '낚시왕', difficulty: 'Gold 1' },
  { problem_id: '17140', title: '이차원 배열과 연산', difficulty: 'Gold 4' },
  { problem_id: '17779', title: '게리맨더링 2', difficulty: 'Gold 4' },
  { problem_id: '17822', title: '원판 돌리기', difficulty: 'Gold 2' },
  { problem_id: '17825', title: '주사위 윷놀이', difficulty: 'Gold 2' },
  { problem_id: '19236', title: '청소년 상어', difficulty: 'Gold 2' },
  { problem_id: '19237', title: '어른 상어', difficulty: 'Gold 2' },
  { problem_id: '19238', title: '스타트 택시', difficulty: 'Gold 2' },
  { problem_id: '20055', title: '컨베이어 벨트 위의 로봇', difficulty: 'Gold 5' },
  { problem_id: '20056', title: '마법사 상어와 파이어볼', difficulty: 'Gold 4' },
  { problem_id: '20057', title: '마법사 상어와 토네이도', difficulty: 'Gold 3' },
  { problem_id: '20058', title: '마법사 상어와 파이어스톰', difficulty: 'Gold 3' },
  { problem_id: '21608', title: '상어 초등학교', difficulty: 'Gold 5' }
];

// 백준 문제 상세 정보 크롤링
async function crawlProblemDetail(problemId) {
  try {
    console.log(`크롤링 중: 문제 ${problemId}`);

    const url = `https://www.acmicpc.net/problem/${problemId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // 문제 제목
    const title = $('#problem_title').text().trim();

    // 문제 설명
    const description = $('#problem_description').text().trim();

    // 입력 형식
    const inputFormat = $('#problem_input').text().trim();

    // 출력 형식
    const outputFormat = $('#problem_output').text().trim();

    // 시간 제한 및 메모리 제한
    const limits = $('#problem-info tbody tr td').map((i, el) => $(el).text().trim()).get();
    const timeLimit = limits[0] || '2초';
    const memoryLimit = limits[1] || '512MB';

    // 예제 입력/출력
    const examples = [];
    $('.sampledata').each((i, el) => {
      const sampleId = $(el).attr('id');
      const content = $(el).text().trim();

      if (sampleId && sampleId.includes('input')) {
        const outputId = sampleId.replace('input', 'output');
        const outputContent = $(`#${outputId}`).text().trim();

        examples.push({
          input: content,
          output: outputContent
        });
      }
    });

    return {
      title,
      description,
      inputFormat,
      outputFormat,
      timeLimit,
      memoryLimit,
      examples
    };

  } catch (error) {
    console.error(`문제 ${problemId} 크롤링 실패:`, error.message);
    return null;
  }
}

// DB에 문제 저장
async function saveProblemToDB(problemInfo, problemDetail) {
  try {
    // 삼성 회사 ID 조회
    const [companies] = await pool.execute(
      'SELECT id FROM companies WHERE name = ?',
      ['삼성']
    );

    let companyId;
    if (companies.length === 0) {
      // 삼성 회사 정보가 없으면 생성
      const [result] = await pool.execute(
        'INSERT INTO companies (name, description) VALUES (?, ?)',
        ['삼성', '삼성전자 코딩테스트 기출문제']
      );
      companyId = result.insertId;
      console.log('삼성 회사 정보 생성됨 (ID:', companyId, ')');
    } else {
      companyId = companies[0].id;
    }

    // 문제가 이미 존재하는지 확인
    const [existing] = await pool.execute(
      'SELECT id FROM baekjoon_problems WHERE problem_id = ?',
      [problemInfo.problem_id]
    );

    if (existing.length > 0) {
      console.log(`문제 ${problemInfo.problem_id} 이미 존재함`);
      return existing[0].id;
    }

    // 문제 저장
    // content 컬럼에 전체 정보를 JSON으로 저장
    const contentData = {
      description: problemDetail?.description || '',
      inputFormat: problemDetail?.inputFormat || '',
      outputFormat: problemDetail?.outputFormat || '',
      examples: problemDetail?.examples || []
    };

    const [result] = await pool.execute(
      `INSERT INTO baekjoon_problems
       (problem_id, title, content, difficulty, time_limit, memory_limit,
        company_id, url, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        problemInfo.problem_id,
        problemDetail?.title || problemInfo.title,
        JSON.stringify(contentData),
        problemInfo.difficulty,
        problemDetail?.timeLimit || '2초',
        problemDetail?.memoryLimit || '512MB',
        companyId,
        `https://www.acmicpc.net/problem/${problemInfo.problem_id}`,
        '백준 온라인 저지'
      ]
    );

    const problemDbId = result.insertId;
    console.log(`✅ 문제 ${problemInfo.problem_id} 저장 완료 (DB ID: ${problemDbId})`);

    // 예제 테스트 케이스 저장
    if (problemDetail?.examples && problemDetail.examples.length > 0) {
      for (let i = 0; i < problemDetail.examples.length; i++) {
        const example = problemDetail.examples[i];
        await pool.execute(
          `INSERT INTO test_cases
           (problem_id, input, expected_output, is_sample)
           VALUES (?, ?, ?, TRUE)`,
          [problemDbId, example.input, example.output]
        );
      }
      console.log(`  → 예제 ${problemDetail.examples.length}개 저장 완료`);
    }

    return problemDbId;

  } catch (error) {
    console.error(`문제 ${problemInfo.problem_id} 저장 실패:`, error.message);
    throw error;
  }
}

// 메인 크롤링 함수
async function crawlSamsungProblems() {
  console.log('='.repeat(80));
  console.log('삼성 SW 역량테스트 백준 문제 크롤링 시작');
  console.log('='.repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const problemInfo of SAMSUNG_PROBLEMS) {
    try {
      // 백준 서버 부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 문제 상세 정보 크롤링
      const problemDetail = await crawlProblemDetail(problemInfo.problem_id);

      if (!problemDetail) {
        console.log(`⚠️  문제 ${problemInfo.problem_id} 크롤링 실패 - 기본 정보만 저장`);
      }

      // DB에 저장
      await saveProblemToDB(problemInfo, problemDetail);
      successCount++;

    } catch (error) {
      console.error(`❌ 문제 ${problemInfo.problem_id} 처리 실패:`, error.message);
      failCount++;
    }
  }

  console.log('='.repeat(80));
  console.log('크롤링 완료');
  console.log(`성공: ${successCount}개, 실패: ${failCount}개`);
  console.log('='.repeat(80));
}

// 스크립트 실행
async function main() {
  try {
    await crawlSamsungProblems();
    process.exit(0);
  } catch (error) {
    console.error('크롤러 실행 오류:', error);
    process.exit(1);
  }
}

main();
