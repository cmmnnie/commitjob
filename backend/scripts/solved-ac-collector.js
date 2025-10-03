// ==============================================================================
// Solved.ac API를 사용한 백준 문제 메타데이터 수집
// 저작권 문제 없음: 공식 API 사용, 메타데이터만 수집
// ==============================================================================

import axios from 'axios';
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

// Solved.ac API 기본 URL
const SOLVED_AC_API = 'https://solved.ac/api/v3';

// 회사별 추천 태그 (solved.ac에서 문제 검색용)
const COMPANY_TAGS = {
  '삼성': ['samsung', 'implementation', 'simulation'],
  '카카오': ['kakao'],
  '네이버': ['naver'],
  '라인': ['line'],
  'SK': ['sk'],
  'LG': ['lg'],
  '쿠팡': ['coupang'],
  '우아한형제들': ['woowahan']
};

// Solved.ac API로 문제 정보 가져오기
async function fetchProblemFromSolvedAc(problemId) {
  try {
    const response = await axios.get(`${SOLVED_AC_API}/problem/show`, {
      params: { problemId },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const problem = response.data;

    return {
      problem_id: problem.problemId.toString(),
      title: problem.titleKo,
      difficulty: getTierName(problem.level),
      tags: problem.tags.map(tag => tag.displayNames[0].name),
      acceptedUserCount: problem.acceptedUserCount,
      averageTries: problem.averageTries
    };

  } catch (error) {
    console.error(`문제 ${problemId} 조회 실패:`, error.message);
    return null;
  }
}

// Solved.ac 티어를 난이도로 변환
function getTierName(level) {
  const tiers = {
    0: 'Unrated',
    1: 'Bronze 5', 2: 'Bronze 4', 3: 'Bronze 3', 4: 'Bronze 2', 5: 'Bronze 1',
    6: 'Silver 5', 7: 'Silver 4', 8: 'Silver 3', 9: 'Silver 2', 10: 'Silver 1',
    11: 'Gold 5', 12: 'Gold 4', 13: 'Gold 3', 14: 'Gold 2', 15: 'Gold 1',
    16: 'Platinum 5', 17: 'Platinum 4', 18: 'Platinum 3', 19: 'Platinum 2', 20: 'Platinum 1',
    21: 'Diamond 5', 22: 'Diamond 4', 23: 'Diamond 3', 24: 'Diamond 2', 25: 'Diamond 1',
    26: 'Ruby 5', 27: 'Ruby 4', 28: 'Ruby 3', 29: 'Ruby 2', 30: 'Ruby 1'
  };
  return tiers[level] || 'Unrated';
}

// 태그로 문제 검색
async function searchProblemsByTag(tag, page = 1) {
  try {
    const response = await axios.get(`${SOLVED_AC_API}/search/problem`, {
      params: {
        query: `tag:${tag}`,
        page,
        sort: 'level',
        direction: 'desc'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.items;

  } catch (error) {
    console.error(`태그 ${tag} 검색 실패:`, error.message);
    return [];
  }
}

// DB에 문제 메타데이터 저장 (링크만 제공)
async function saveProblemMetadata(companyName, problemData) {
  try {
    // 회사 ID 조회
    const [companies] = await pool.execute(
      'SELECT id FROM companies WHERE name = ?',
      [companyName]
    );

    let companyId;
    if (companies.length === 0) {
      const [result] = await pool.execute(
        'INSERT INTO companies (name, description) VALUES (?, ?)',
        [companyName, `${companyName} 코딩테스트 문제`]
      );
      companyId = result.insertId;
    } else {
      companyId = companies[0].id;
    }

    // 문제 존재 여부 확인
    const [existing] = await pool.execute(
      'SELECT id FROM baekjoon_problems WHERE problem_id = ?',
      [problemData.problem_id]
    );

    if (existing.length > 0) {
      console.log(`문제 ${problemData.problem_id} 이미 존재함`);
      return;
    }

    // 메타데이터만 저장 (문제 전문은 저장하지 않음)
    const metadata = {
      notice: '문제 전체 내용은 백준 온라인 저지에서 확인하세요.',
      tags: problemData.tags,
      acceptedUserCount: problemData.acceptedUserCount,
      averageTries: problemData.averageTries
    };

    await pool.execute(
      `INSERT INTO baekjoon_problems
       (problem_id, title, content, difficulty, time_limit, memory_limit,
        company_id, url, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        problemData.problem_id,
        problemData.title,
        JSON.stringify(metadata),
        problemData.difficulty,
        '정보 없음',
        '정보 없음',
        companyId,
        `https://www.acmicpc.net/problem/${problemData.problem_id}`,
        'Solved.ac API'
      ]
    );

    console.log(`✅ 문제 ${problemData.problem_id} (${problemData.title}) 메타데이터 저장`);

  } catch (error) {
    console.error(`문제 저장 실패:`, error.message);
  }
}

// 특정 회사의 문제 수집
async function collectCompanyProblems(companyName, tags) {
  console.log('='.repeat(80));
  console.log(`${companyName} 문제 메타데이터 수집 시작`);
  console.log('='.repeat(80));

  for (const tag of tags) {
    console.log(`\n태그 "${tag}"로 검색 중...`);

    const problems = await searchProblemsByTag(tag, 1);
    console.log(`${problems.length}개 문제 발견`);

    for (const problem of problems) {
      await new Promise(resolve => setTimeout(resolve, 500)); // API Rate Limit 준수

      const problemData = await fetchProblemFromSolvedAc(problem.problemId);
      if (problemData) {
        await saveProblemMetadata(companyName, problemData);
      }
    }
  }

  console.log(`\n${companyName} 수집 완료\n`);
}

async function main() {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Solved.ac API를 사용한 문제 메타데이터 수집');
  console.log('저작권 문제 없음: 공식 API 사용, 링크만 제공');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 삼성 문제만 수집 (예시)
    await collectCompanyProblems('삼성', ['samsung']);

    console.log('='.repeat(80));
    console.log('✅ 전체 수집 완료');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

main();
