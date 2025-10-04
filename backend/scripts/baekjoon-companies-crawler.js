// ==============================================================================
// 백준 여러 회사 문제 크롤러
// 카카오, 네이버, 라인 등 다양한 회사의 기출문제를 크롤링하여 DB에 저장
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

// 회사별 기출문제 목록
const COMPANY_PROBLEMS = {
  '카카오': [
    { problem_id: '17676', title: '[1차] 추석 트래픽', difficulty: 'Gold 3' },
    { problem_id: '17677', title: '[1차] 뉴스 클러스터링', difficulty: 'Silver 4' },
    { problem_id: '17678', title: '[1차] 셔틀버스', difficulty: 'Silver 2' },
    { problem_id: '17679', title: '[1차] 프렌즈4블록', difficulty: 'Gold 4' },
    { problem_id: '17680', title: '[1차] 캐시', difficulty: 'Bronze 1' },
    { problem_id: '17681', title: '[1차] 비밀지도', difficulty: 'Bronze 1' },
    { problem_id: '17682', title: '[1차] 다트 게임', difficulty: 'Bronze 2' },
    { problem_id: '17683', title: '[3차] 방금그곡', difficulty: 'Silver 1' },
    { problem_id: '17684', title: '[3차] 압축', difficulty: 'Silver 2' },
    { problem_id: '17685', title: '[3차] 자동완성', difficulty: 'Gold 4' },
    { problem_id: '17686', title: '[3차] 파일명 정렬', difficulty: 'Silver 3' },
    { problem_id: '60057', title: '문자열 압축', difficulty: 'Silver 4' },
    { problem_id: '60058', title: '괄호 변환', difficulty: 'Silver 1' },
    { problem_id: '60059', title: '자물쇠와 열쇠', difficulty: 'Gold 3' },
    { problem_id: '60060', title: '가사 검색', difficulty: 'Gold 4' },
    { problem_id: '60061', title: '기둥과 보 설치', difficulty: 'Gold 3' },
    { problem_id: '60062', title: '외벽 점검', difficulty: 'Gold 4' },
    { problem_id: '60063', title: '블록 이동하기', difficulty: 'Gold 2' },
    { problem_id: '67256', title: '키패드 누르기', difficulty: 'Bronze 1' },
    { problem_id: '67257', title: '수식 최대화', difficulty: 'Silver 1' },
    { problem_id: '67258', title: '보석 쇼핑', difficulty: 'Gold 4' },
    { problem_id: '67259', title: '경주로 건설', difficulty: 'Gold 2' },
    { problem_id: '72410', title: '신규 아이디 추천', difficulty: 'Bronze 1' },
    { problem_id: '72411', title: '메뉴 리뉴얼', difficulty: 'Silver 1' },
    { problem_id: '72412', title: '순위 검색', difficulty: 'Gold 4' },
    { problem_id: '72413', title: '합승 택시 요금', difficulty: 'Gold 2' },
    { problem_id: '72414', title: '광고 삽입', difficulty: 'Gold 3' },
    { problem_id: '72415', title: '카드 짝 맞추기', difficulty: 'Gold 1' },
    { problem_id: '72416', title: '매출 하락 최소화', difficulty: 'Gold 1' },
    { problem_id: '81301', title: '숫자 문자열과 영단어', difficulty: 'Bronze 2' }
  ],
  '네이버': [
    { problem_id: '1092', title: '배', difficulty: 'Gold 5' },
    { problem_id: '1148', title: '단어 만들기', difficulty: 'Gold 4' },
    { problem_id: '1241', title: '머리 톡톡', difficulty: 'Silver 3' },
    { problem_id: '1270', title: '전쟁 - 땅따먹기', difficulty: 'Silver 4' },
    { problem_id: '1693', title: '트리 색칠하기', difficulty: 'Gold 1' },
    { problem_id: '2161', title: '카드1', difficulty: 'Silver 5' },
    { problem_id: '2437', title: '저울', difficulty: 'Gold 3' },
    { problem_id: '3107', title: 'IPv6', difficulty: 'Gold 5' },
    { problem_id: '4097', title: '수익', difficulty: 'Gold 5' },
    { problem_id: '5397', title: '키로거', difficulty: 'Silver 2' },
    { problem_id: '6087', title: '레이저 통신', difficulty: 'Gold 3' },
    { problem_id: '13549', title: '숨바꼭질 3', difficulty: 'Gold 5' },
    { problem_id: '13913', title: '숨바꼭질 4', difficulty: 'Gold 4' },
    { problem_id: '14427', title: '수열과 쿼리 15', difficulty: 'Gold 1' },
    { problem_id: '16235', title: '나무 재테크', difficulty: 'Gold 4' }
  ],
  '라인': [
    { problem_id: '5419', title: '북서풍', difficulty: 'Platinum 5' },
    { problem_id: '11400', title: '단절선', difficulty: 'Platinum 4' },
    { problem_id: '12784', title: '인하니카 공화국', difficulty: 'Gold 2' },
    { problem_id: '12785', title: '토쟁이의 등굣길', difficulty: 'Silver 1' },
    { problem_id: '12786', title: 'INHA SUIT', difficulty: 'Gold 3' },
    { problem_id: '12787', title: '지금 밥이 문제냐', difficulty: 'Gold 5' },
    { problem_id: '12788', title: '제 2회 IUPC는 잘 개최될 수 있을까?', difficulty: 'Bronze 2' },
    { problem_id: '12789', title: '도키도키 간식드리미', difficulty: 'Silver 3' },
    { problem_id: '12790', title: 'Mini Fantasy War', difficulty: 'Bronze 1' }
  ],
  'SK': [
    { problem_id: '2064', title: 'IP 주소', difficulty: 'Gold 5' },
    { problem_id: '2232', title: '지뢰', difficulty: 'Silver 2' },
    { problem_id: '3425', title: '고스택', difficulty: 'Gold 3' },
    { problem_id: '5430', title: 'AC', difficulty: 'Gold 5' },
    { problem_id: '12018', title: 'Yonsei TOTO', difficulty: 'Silver 3' },
    { problem_id: '14719', title: '빗물', difficulty: 'Gold 5' },
    { problem_id: '15686', title: '치킨 배달', difficulty: 'Gold 5' }
  ],
  'LG': [
    { problem_id: '1094', title: '막대기', difficulty: 'Silver 5' },
    { problem_id: '2422', title: '한윤정이 이탈리아에 가서 아이스크림을 사먹는데', difficulty: 'Silver 3' },
    { problem_id: '11502', title: '세 개의 소수 문제', difficulty: 'Silver 5' },
    { problem_id: '15953', title: '상금 헌터', difficulty: 'Bronze 3' },
    { problem_id: '17224', title: 'APC는 왜 서브태스크 대회가 되었을까?', difficulty: 'Bronze 3' }
  ],
  '쿠팡': [
    { problem_id: '1034', title: '램프', difficulty: 'Gold 5' },
    { problem_id: '3077', title: '임진왜란', difficulty: 'Silver 1' },
    { problem_id: '6068', title: '시간 관리하기', difficulty: 'Silver 3' },
    { problem_id: '14225', title: '부분수열의 합', difficulty: 'Silver 1' }
  ],
  '우아한형제들': [
    { problem_id: '1068', title: '트리', difficulty: 'Gold 5' },
    { problem_id: '2885', title: '초콜릿 식사', difficulty: 'Silver 4' },
    { problem_id: '15961', title: '회전 초밥', difficulty: 'Gold 4' },
    { problem_id: '17609', title: '회문', difficulty: 'Gold 5' }
  ]
};

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
async function saveProblemToDB(companyName, problemInfo, problemDetail) {
  try {
    // 회사 ID 조회 또는 생성
    const [companies] = await pool.execute(
      'SELECT id FROM companies WHERE name = ?',
      [companyName]
    );

    let companyId;
    if (companies.length === 0) {
      // 회사 정보가 없으면 생성
      const [result] = await pool.execute(
        'INSERT INTO companies (name, description) VALUES (?, ?)',
        [companyName, `${companyName} 코딩테스트 기출문제`]
      );
      companyId = result.insertId;
      console.log(`${companyName} 회사 정보 생성됨 (ID: ${companyId})`);
    } else {
      companyId = companies[0].id;
    }

    // 문제가 이미 존재하는지 확인
    const [existing] = await pool.execute(
      'SELECT id FROM baekjoon_problems WHERE problem_id = ?',
      [problemInfo.problem_id]
    );

    if (existing.length > 0) {
      console.log(`문제 ${problemInfo.problem_id} 이미 존재함 - 스킵`);
      return existing[0].id;
    }

    // 문제 저장
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

    // 예제 테스트 케이스 저장 (스킵 - Foreign Key 제약 조건 때문)
    // if (problemDetail?.examples && problemDetail.examples.length > 0) {
    //   for (let i = 0; i < problemDetail.examples.length; i++) {
    //     const example = problemDetail.examples[i];
    //     await pool.execute(
    //       `INSERT INTO test_cases
    //        (problem_id, input, expected_output, is_sample)
    //        VALUES (?, ?, ?, TRUE)`,
    //       [problemDbId, example.input, example.output]
    //     );
    //   }
    //   console.log(`  → 예제 ${problemDetail.examples.length}개 저장 완료`);
    // }

    return problemDbId;

  } catch (error) {
    console.error(`문제 ${problemInfo.problem_id} 저장 실패:`, error.message);
    throw error;
  }
}

// 특정 회사의 문제 크롤링
async function crawlCompanyProblems(companyName, problems) {
  console.log('='.repeat(80));
  console.log(`${companyName} 기출문제 크롤링 시작 (총 ${problems.length}개)`);
  console.log('='.repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const problemInfo of problems) {
    try {
      // 백준 서버 부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 문제 상세 정보 크롤링
      const problemDetail = await crawlProblemDetail(problemInfo.problem_id);

      if (!problemDetail) {
        console.log(`⚠️  문제 ${problemInfo.problem_id} 크롤링 실패 - 기본 정보만 저장`);
      }

      // DB에 저장
      await saveProblemToDB(companyName, problemInfo, problemDetail);
      successCount++;

    } catch (error) {
      console.error(`❌ 문제 ${problemInfo.problem_id} 처리 실패:`, error.message);
      failCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(`${companyName} 크롤링 완료`);
  console.log(`성공: ${successCount}개, 실패: ${failCount}개`);
  console.log('='.repeat(80));
  console.log('');

  return { successCount, failCount };
}

// 모든 회사 문제 크롤링
async function crawlAllCompanies() {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('여러 회사 백준 문제 크롤링 시작');
  console.log('='.repeat(80));
  console.log('');

  const totalStats = {
    companies: 0,
    totalSuccess: 0,
    totalFail: 0
  };

  for (const [companyName, problems] of Object.entries(COMPANY_PROBLEMS)) {
    const { successCount, failCount } = await crawlCompanyProblems(companyName, problems);
    totalStats.companies++;
    totalStats.totalSuccess += successCount;
    totalStats.totalFail += failCount;
  }

  console.log('='.repeat(80));
  console.log('전체 크롤링 완료');
  console.log(`처리한 회사: ${totalStats.companies}개`);
  console.log(`총 성공: ${totalStats.totalSuccess}개`);
  console.log(`총 실패: ${totalStats.totalFail}개`);
  console.log('='.repeat(80));
}

// 스크립트 실행
async function main() {
  try {
    await crawlAllCompanies();
    process.exit(0);
  } catch (error) {
    console.error('크롤러 실행 오류:', error);
    process.exit(1);
  }
}

main();
