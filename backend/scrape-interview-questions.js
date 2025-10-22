/**
 * Catch.co.kr 면접질문 스크래핑 (JavaScript/Puppeteer)
 * 사용법: node scrape-interview-questions.js "회사명"
 */

import puppeteer from 'puppeteer';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'commitjob',
  port: process.env.DB_PORT || 3306
};

const CATCH_LOGIN = {
  id: 'test0137',
  password: '#test0808'
};

async function scrapeInterviewQuestions(companyName, pool = null) {
  let browser = null;
  let connection = null;
  let shouldCloseConnection = false;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 단일 회사 면접질문 스크래핑 시작: ${companyName}`);
    console.log('='.repeat(60) + '\n');

    // MySQL 연결 (pool이 있으면 사용, 없으면 새로 생성)
    if (pool) {
      connection = pool;
      console.log('✅ 기존 DB pool 사용\n');
    } else {
      connection = await mysql.createConnection(DB_CONFIG);
      shouldCloseConnection = true;
      console.log('✅ AWS RDS MySQL 연결 성공\n');
    }

    // Puppeteer 브라우저 실행
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('✅ Chrome 드라이버 초기화 성공\n');

    // Catch.co.kr 로그인
    console.log(`🔐 Catch.co.kr 로그인 시도 (사용자: ${CATCH_LOGIN.id})\n`);
    await page.goto('https://www.catch.co.kr/');
    await page.waitForTimeout(2000);

    // 로그인 버튼 클릭
    try {
      await page.waitForSelector('a:has-text("로그인")', { timeout: 5000 });
      await page.click('a:has-text("로그인")');
      console.log('  로그인 버튼 클릭 완료');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('  ⚠️ 로그인 버튼을 찾을 수 없습니다 (이미 로그인 상태일 수 있음)');
    }

    // 로그인 폼 입력
    try {
      await page.waitForSelector('#id_login', { timeout: 5000 });
      await page.type('#id_login', CATCH_LOGIN.id);
      await page.type('#pw_login', CATCH_LOGIN.password);
      await page.keyboard.press('Enter');
      console.log('  로그인 정보 입력 및 제출 완료');
      await page.waitForTimeout(3000);
      console.log('✅ Catch.co.kr 로그인 성공\n');
    } catch (e) {
      console.log('  ⚠️ 로그인 폼을 찾을 수 없습니다 (이미 로그인 상태일 수 있음)\n');
    }

    // 회사 검색
    console.log(`\n[1/1] 🏢 ${companyName}`);
    console.log('-'.repeat(60));

    const searchUrl = 'https://www.catch.co.kr/Comp/CompMajor/SearchPage';
    await page.goto(searchUrl);
    await page.waitForTimeout(3000);

    const searchTerm = companyName.trim();
    console.log(`  🔍 검색어: '${searchTerm}'`);

    // 검색창에 입력
    await page.waitForSelector('input[placeholder*="궁금한 기업을 검색"]', { timeout: 10000 });
    await page.type('input[placeholder*="궁금한 기업을 검색"]', searchTerm);

    // 검색 버튼 클릭
    await page.click('button.bt_sch');
    await page.waitForTimeout(3000);

    // 검색 결과에서 정확한 회사 찾기
    const companyLinks = await page.$$('ul.list_corp_round li p.name a');

    console.log(`  📋 검색 결과 ${companyLinks.length}개`);

    // 정규화 함수
    const normalize = (name) => {
      return name.replace(/\s/g, '').replace(/\(주\)/g, '').replace(/주식회사/g, '')
        .replace(/㈜/g, '').replace(/\(\)/g, '').toLowerCase();
    };

    const normalizedInput = normalize(searchTerm);
    let targetUrl = null;

    // 정확한 매칭 찾기
    for (const link of companyLinks) {
      const text = await page.evaluate(el => el.textContent.trim(), link);
      const normalizedText = normalize(text);

      if (normalizedText === normalizedInput) {
        targetUrl = await page.evaluate(el => el.href, link);
        console.log(`  ✅ 정확한 기업명 매칭: '${searchTerm}' → '${text}'`);
        break;
      }
    }

    if (!targetUrl) {
      console.log(`  ❌ 회사를 찾을 수 없음`);
      return;
    }

    // 회사 상세 페이지로 이동
    await page.goto(targetUrl);
    await page.waitForTimeout(2000);

    console.log(`  🔗 회사 URL: ${targetUrl}`);

    // 면접기출 탭 클릭
    try {
      await page.waitForSelector('a[href*="InterviewQuestionList"]', { timeout: 5000 });
      await page.click('a[href*="InterviewQuestionList"]');
      await page.waitForTimeout(3000);
      console.log('  ✅ 면접기출 탭 클릭 완료');
    } catch (e) {
      console.log('  ❌ 면접기출 탭을 찾을 수 없음');
      return;
    }

    // 면접질문 스크래핑
    const questions = await page.$$eval('ul.list_inq li', items => {
      return items.map(item => {
        const questionEl = item.querySelector('p.desc');
        const dateEl = item.querySelector('p.date');
        const experienceEl = item.querySelector('span.exp');
        const resultEl = item.querySelector('span.pass, span.fail, span.etc');

        return {
          question: questionEl ? questionEl.textContent.trim() : '',
          date: dateEl ? dateEl.textContent.trim() : '',
          experience: experienceEl ? experienceEl.textContent.trim() : '',
          result: resultEl ? resultEl.textContent.trim() : ''
        };
      }).filter(q => q.question);
    });

    console.log(`  📋 면접질문 ${questions.length}개 발견`);

    if (questions.length === 0) {
      console.log(`  ⚠️ 면접질문이 없는 회사`);
      return;
    }

    // DB에 저장 (기존 질문 삭제 후 새로 insert)
    await connection.execute(
      'DELETE FROM catch_interview_questions WHERE company = ?',
      [companyName.trim()]
    );

    for (const q of questions) {
      await connection.execute(
        `INSERT INTO catch_interview_questions (company, question, interview_date, experience, result, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [companyName.trim(), q.question, q.date, q.experience, q.result]
      );
    }

    console.log(`  ✅ 면접질문 ${questions.length}개 저장 완료`);

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 스크래핑 완료');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 스크래핑 오류:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ 리소스 정리 완료\n');
    }
    if (connection && shouldCloseConnection) {
      await connection.end();
    }
  }
}

// Export function for use as module
export { scrapeInterviewQuestions };

// 커맨드 라인에서 직접 실행된 경우에만 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const companyName = process.argv.slice(2).join(' ');

  if (!companyName) {
    console.error('사용법: node scrape-interview-questions.js "회사명"');
    process.exit(1);
  }

  scrapeInterviewQuestions(companyName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('실행 실패:', error);
      process.exit(1);
    });
}
