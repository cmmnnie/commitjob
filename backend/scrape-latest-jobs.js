/**
 * Catch.co.kr 최신 채용공고 30건 스크래핑 (JavaScript/Puppeteer)
 * 사용법: node scrape-latest-jobs.js
 * 또는 함수 import: import { scrapeLatestJobs } from './scrape-latest-jobs.js'
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

const BASE_URL = 'https://www.catch.co.kr/';

async function scrapeLatestJobs(pool = null) {
  let browser = null;
  let connection = null;
  let shouldCloseConnection = false;

  const stats = {
    total_scraped: 0,
    total_inserted: 0,
    duplicates: 0,
    errors: 0
  };

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🚀 Catch.co.kr 채용공고 스크래핑 시작');
    console.log('   목표: 최신 채용공고 30건');
    console.log('='.repeat(60) + '\n');

    // MySQL 연결
    if (pool) {
      connection = pool;
      console.log('✅ 기존 DB pool 사용\n');
    } else {
      connection = await mysql.createConnection(DB_CONFIG);
      shouldCloseConnection = true;
      console.log('✅ MySQL 연결 성공\n');
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
    page.setDefaultNavigationTimeout(60000);

    // 이미지 로딩 비활성화 (성능 향상)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() === 'image') {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('✅ Chrome 드라이버 초기화 성공\n');

    // 채용 검색 페이지로 이동
    console.log('📍 채용 검색 페이지로 이동 중...');
    await page.goto(`${BASE_URL}NCS/RecruitSearch`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    console.log('✅ 채용 검색 페이지 진입 성공\n');

    // IT개발 카테고리 스크래핑 (최대 2페이지)
    await scrapeCategoryJobs(page, connection, 'IT개발', 'IT', 2, stats);

    // 30건 미만이면 빅데이터·AI 카테고리도 스크래핑
    if (stats.total_scraped < 30) {
      console.log(`\n📊 남은 목표: ${30 - stats.total_scraped}건\n`);
      // 채용 검색 페이지로 다시 이동
      await page.goto(`${BASE_URL}NCS/RecruitSearch`, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));
      await scrapeCategoryJobs(page, connection, '빅데이터·AI', 'BIGDATA_AI', 2, stats);
    }

    // 최종 통계
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 최종 통계');
    console.log('='.repeat(60));
    console.log(`총 수집: ${stats.total_scraped}건`);
    console.log(`신규 저장: ${stats.total_inserted}건`);
    console.log(`중복 제외: ${stats.duplicates}건`);
    console.log(`오류: ${stats.errors}건`);
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

  return stats;
}

async function scrapeCategoryJobs(page, connection, categoryName, categoryCode, maxPages, stats) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${categoryName} 카테고리 스크래핑 시작`);
  console.log('='.repeat(60) + '\n');

  try {
    // 카테고리 선택
    console.log(`📂 카테고리 선택: ${categoryName}`);

    // 직무 버튼 클릭 (XPath 사용)
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button.bt'));
      return buttons.some(btn => btn.textContent.includes('직무'));
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.bt'));
      const jobBtn = buttons.find(btn => btn.textContent.includes('직무'));
      if (jobBtn) jobBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 카테고리 선택
    const categoryText = categoryCode === 'IT' ? 'IT개발' : '빅데이터·AI';

    await page.waitForFunction((text) => {
      const buttons = Array.from(document.querySelectorAll('button.bt'));
      return buttons.some(btn => btn.textContent.includes(text));
    }, { timeout: 10000 }, categoryText);

    await page.evaluate((text) => {
      const buttons = Array.from(document.querySelectorAll('button.bt'));
      const categoryBtn = buttons.find(btn => btn.textContent.includes(text));
      if (categoryBtn) categoryBtn.click();
    }, categoryText);
    await new Promise(r => setTimeout(r, 2000));
    console.log(`✅ ${categoryName} 카테고리 선택 완료\n`);

    let pageNum = 1;
    let categoryScraped = 0;

    while (pageNum <= maxPages && stats.total_scraped < 30) {
      console.log(`📄 페이지 ${pageNum} 스크래핑 중...`);

      // 페이지 로딩 대기
      await new Promise(r => setTimeout(r, 2000));

      // 채용공고 데이터 추출
      const jobs = await page.$$eval('tbody tr', (rows, category) => {
        return rows.map(row => {
          try {
            const companyElem = row.querySelector('td:nth-child(1) a');
            const titleElem = row.querySelector('td:nth-child(2) a');
            const jobInfoElems = row.querySelectorAll('td:nth-child(3) p');
            const conditionsElems = row.querySelectorAll('td:nth-child(4) p');
            const regInfoElems = row.querySelectorAll('td:nth-child(5) p');

            const company = companyElem?.textContent.trim();
            const title = titleElem?.textContent.trim();
            const url = titleElem?.href;

            const job_info = Array.from(jobInfoElems).map(el => el.textContent.trim()).filter(t => t);
            const conditions = Array.from(conditionsElems).map(el => el.textContent.trim()).filter(t => t);
            const registration_info = Array.from(regInfoElems).map(el => el.textContent.trim()).filter(t => t);

            if (company && title && url) {
              return {
                company,
                title,
                url,
                job_info,
                conditions,
                registration_info,
                category
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        }).filter(job => job !== null);
      }, categoryCode);

      if (jobs.length === 0) {
        console.log('  ⚠️ 데이터 없음\n');
        break;
      }

      // DB에 저장
      const inserted = await insertJobs(connection, jobs, pageNum, stats);
      categoryScraped += jobs.length;
      stats.total_scraped += jobs.length;

      console.log(`  ✅ ${jobs.length}건 수집, ${inserted}건 저장 (중복: ${jobs.length - inserted}건)`);
      console.log(`  📊 전체 진행: ${stats.total_scraped}/30건\n`);

      // 30건 도달 시 중단
      if (stats.total_scraped >= 30) {
        console.log('\n✅ 목표 30건 도달! 스크래핑 종료\n');
        break;
      }

      // 다음 페이지로 이동
      try {
        const nextBtn = await page.$('p.page3 a.ico.next');
        if (nextBtn) {
          await nextBtn.click();
          await new Promise(r => setTimeout(r, 2000));
          pageNum++;
        } else {
          console.log('  ⏭️ 다음 페이지 없음\n');
          break;
        }
      } catch (e) {
        console.log('  ⏭️ 다음 페이지 없음\n');
        break;
      }
    }

    console.log(`\n${categoryName} 카테고리: ${categoryScraped}건 수집 완료\n`);

  } catch (error) {
    console.error(`❌ ${categoryName} 카테고리 스크래핑 실패:`, error.message);
  }
}

async function insertJobs(connection, jobs, pageNum, stats) {
  if (!jobs || jobs.length === 0) return 0;

  let inserted = 0;

  for (const job of jobs) {
    try {
      // 중복 체크
      const [existing] = await connection.execute(
        'SELECT id FROM jobs WHERE url = ? AND category = ?',
        [job.url, job.category]
      );

      if (existing.length > 0) {
        stats.duplicates++;
        continue;
      }

      // 회사명 정규화 (검색용)
      const company_search_key = job.company.toLowerCase().replace(/\s/g, '').replace(/\u00A0/g, '');

      // INSERT
      await connection.execute(
        `INSERT INTO jobs
        (company, title, url, category, page, job_info, conditions, registration_info, scraped_at, company_search_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          job.company,
          job.title,
          job.url,
          job.category,
          pageNum,
          JSON.stringify(job.job_info),
          JSON.stringify(job.conditions),
          JSON.stringify(job.registration_info),
          company_search_key
        ]
      );

      inserted++;
      stats.total_inserted++;

    } catch (error) {
      stats.errors++;
      console.error(`  ⚠️ DB 저장 실패: ${error.message}`);
      continue;
    }
  }

  return inserted;
}

// Export function for use as module
export { scrapeLatestJobs };

// 커맨드 라인에서 직접 실행된 경우에만 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeLatestJobs()
    .then((stats) => {
      console.log('✅ 스크래핑 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('실행 실패:', error);
      process.exit(1);
    });
}
