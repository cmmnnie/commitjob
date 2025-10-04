// ==============================================================================
// 프로그래머스 문제 메타데이터 수집
// 저작권 안전: 문제 전문 없이 메타데이터 + 링크만 제공
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

// 프로그래머스 회사별 기출문제 리스트 (메타데이터만)
const PROGRAMMERS_PROBLEMS = {
  '카카오': [
    // 2024 KAKAO WINTER INTERNSHIP
    { problem_id: 'pg-258707', title: '가장 많이 받은 선물', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/258707' },
    { problem_id: 'pg-258709', title: '주사위 고르기', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/258709' },

    // 2024 KAKAO TECH INTERNSHIP
    { problem_id: 'pg-340198', title: '공원', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340198' },
    { problem_id: 'pg-340199', title: '시소 짝꿍', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340199' },
    { problem_id: 'pg-340200', title: '산 모양 타일링', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340200' },
    { problem_id: 'pg-340201', title: '동영상 재생기', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340201' },
    { problem_id: 'pg-340202', title: '지폐 접기', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340202' },
    { problem_id: 'pg-340203', title: '빛이 들어오는 양', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340203' },
    { problem_id: 'pg-340211', title: '충돌위험 찾기', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340211' },
    { problem_id: 'pg-340212', title: '가장 먼 노드', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340212' },
    { problem_id: 'pg-340213', title: '퍼즐 게임 챌린지', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/340213' },

    // 2023 KAKAO BLIND RECRUITMENT
    { problem_id: 'pg-150365', title: '미로 탈출 명령어', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150365' },
    { problem_id: 'pg-150366', title: '표 병합', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150366' },
    { problem_id: 'pg-150367', title: '표현 가능한 이진트리', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150367' },
    { problem_id: 'pg-150368', title: '이모티콘 할인행사', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150368' },
    { problem_id: 'pg-150369', title: '택배 배달과 수거하기', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150369' },
    { problem_id: 'pg-150370', title: '개인정보 수집 유효기간', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/150370' },

    // 2022 KAKAO TECH INTERNSHIP
    { problem_id: 'pg-118666', title: '성격 유형 검사하기', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/118666' },
    { problem_id: 'pg-118667', title: '두 큐 합 같게 만들기', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/118667' },
    { problem_id: 'pg-118668', title: '코딩 테스트 공부', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/118668' },
    { problem_id: 'pg-118669', title: '등산코스 정하기', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/118669' },

    // 2022 KAKAO BLIND RECRUITMENT
    { problem_id: 'pg-92334', title: '신고 결과 받기', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92334' },
    { problem_id: 'pg-92335', title: 'k진수에서 소수 개수 구하기', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92335' },
    { problem_id: 'pg-92341', title: '주차 요금 계산', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92341' },
    { problem_id: 'pg-92342', title: '양궁대회', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92342' },
    { problem_id: 'pg-92343', title: '양과 늑대', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92343' },
    { problem_id: 'pg-92344', title: '파괴되지 않은 건물', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92344' },
    { problem_id: 'pg-92345', title: '사라지는 발판', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/92345' },

    // 2021 KAKAO BLIND RECRUITMENT
    { problem_id: 'pg-72410', title: '신규 아이디 추천', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72410' },
    { problem_id: 'pg-72411', title: '메뉴 리뉴얼', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72411' },
    { problem_id: 'pg-72412', title: '순위 검색', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72412' },
    { problem_id: 'pg-72413', title: '합승 택시 요금', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72413' },
    { problem_id: 'pg-72414', title: '광고 삽입', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72414' },
    { problem_id: 'pg-72415', title: '카드 짝 맞추기', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72415' },
    { problem_id: 'pg-72416', title: '매출 하락 최소화', difficulty: 'Level 4', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/72416' },
  ],
  '네이버': [
    // NAVER 기출문제
    { problem_id: 'pg-60057', title: '문자열 압축', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/60057' },
    { problem_id: 'pg-60058', title: '괄호 변환', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/60058' },
    { problem_id: 'pg-42888', title: '오픈채팅방', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/42888' },
    { problem_id: 'pg-42889', title: '실패율', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/42889' },
    { problem_id: 'pg-42890', title: '후보키', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/42890' },
  ],
  '라인': [
    // LINE 기출문제
    { problem_id: 'pg-250134', title: '선입 선출 스케줄링', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/250134' },
    { problem_id: 'pg-250135', title: '아날로그 시계', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/250135' },
    { problem_id: 'pg-250136', title: '석유 시추', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/250136' },
    { problem_id: 'pg-250137', title: '붕대 감기', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/250137' },
  ],
  '쿠팡': [
    // Coupang 기출문제
    { problem_id: 'pg-64061', title: '크레인 인형뽑기 게임', difficulty: 'Level 1', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/64061' },
    { problem_id: 'pg-64062', title: '징검다리 건너기', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/64062' },
    { problem_id: 'pg-64063', title: '호텔 방 배정', difficulty: 'Level 4', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/64063' },
    { problem_id: 'pg-64064', title: '불량 사용자', difficulty: 'Level 3', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/64064' },
    { problem_id: 'pg-64065', title: '튜플', difficulty: 'Level 2', url: 'https://school.programmers.co.kr/learn/courses/30/lessons/64065' },
  ]
};

// DB에 프로그래머스 테이블 생성
async function createProgrammersTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS programmers_problems (
        id INT PRIMARY KEY AUTO_INCREMENT,
        problem_id VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        difficulty VARCHAR(50),
        company_id INT,
        url VARCHAR(500) NOT NULL,
        tags JSON,
        metadata JSON,
        source VARCHAR(100) DEFAULT '프로그래머스',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        INDEX idx_company (company_id),
        INDEX idx_difficulty (difficulty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ programmers_problems 테이블 생성/확인 완료');
  } catch (error) {
    console.error('테이블 생성 오류:', error.message);
    throw error;
  }
}

// DB에 프로그래머스 문제 저장
async function saveProgrammersProblem(companyName, problemData) {
  try {
    // 회사 ID 조회 또는 생성
    const [companies] = await pool.execute(
      'SELECT id FROM companies WHERE name = ?',
      [companyName]
    );

    let companyId;
    if (companies.length === 0) {
      const [result] = await pool.execute(
        'INSERT INTO companies (name, description) VALUES (?, ?)',
        [companyName, `${companyName} 코딩테스트 기출문제`]
      );
      companyId = result.insertId;
      console.log(`${companyName} 회사 정보 생성됨 (ID: ${companyId})`);
    } else {
      companyId = companies[0].id;
    }

    // 중복 확인
    const [existing] = await pool.execute(
      'SELECT id FROM programmers_problems WHERE problem_id = ?',
      [problemData.problem_id]
    );

    if (existing.length > 0) {
      console.log(`문제 ${problemData.problem_id} 이미 존재함 - 스킵`);
      return existing[0].id;
    }

    // 메타데이터 (저작권 안전)
    const metadata = {
      notice: '문제 전체 내용은 프로그래머스 사이트에서 확인하세요.',
      sourceAttribution: {
        source: '프로그래머스 (Programmers)',
        sourceUrl: problemData.url,
        originalProblemId: problemData.problem_id
      },
      educationalPurpose: '이 문제는 교육 목적의 졸업작품을 위해 링크만 제공됩니다.'
    };

    // 문제 저장
    const [result] = await pool.execute(
      `INSERT INTO programmers_problems
       (problem_id, title, difficulty, company_id, url, metadata, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        problemData.problem_id,
        problemData.title,
        problemData.difficulty,
        companyId,
        problemData.url,
        JSON.stringify(metadata),
        '프로그래머스'
      ]
    );

    console.log(`✅ ${problemData.title} (${problemData.difficulty}) 저장 완료`);
    return result.insertId;

  } catch (error) {
    console.error(`문제 ${problemData.problem_id} 저장 실패:`, error.message);
    throw error;
  }
}

// 회사별 프로그래머스 문제 수집
async function collectProgrammersProblems(companyName, problems) {
  console.log('='.repeat(80));
  console.log(`${companyName} 프로그래머스 문제 수집 시작 (총 ${problems.length}개)`);
  console.log('='.repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const problem of problems) {
    try {
      await saveProgrammersProblem(companyName, problem);
      successCount++;
    } catch (error) {
      console.error(`❌ 문제 ${problem.problem_id} 처리 실패:`, error.message);
      failCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(`${companyName} 수집 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
  console.log('='.repeat(80));
  console.log('');

  return { successCount, failCount };
}

// 메인 실행
async function main() {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('프로그래머스 문제 메타데이터 수집');
  console.log('저작권 안전: 문제 전문 없이 링크만 제공');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 테이블 생성
    await createProgrammersTable();

    const totalStats = {
      companies: 0,
      totalSuccess: 0,
      totalFail: 0
    };

    // 모든 회사 문제 수집
    for (const [companyName, problems] of Object.entries(PROGRAMMERS_PROBLEMS)) {
      const { successCount, failCount } = await collectProgrammersProblems(companyName, problems);
      totalStats.companies++;
      totalStats.totalSuccess += successCount;
      totalStats.totalFail += failCount;
    }

    console.log('='.repeat(80));
    console.log('전체 수집 완료');
    console.log(`처리한 회사: ${totalStats.companies}개`);
    console.log(`총 성공: ${totalStats.totalSuccess}개`);
    console.log(`총 실패: ${totalStats.totalFail}개`);
    console.log('='.repeat(80));

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ 오류:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
