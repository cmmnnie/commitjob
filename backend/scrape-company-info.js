/**
 * Catch.co.kr 기업정보 스크래핑 (JavaScript/Puppeteer)
 * 사용법: node scrape-company-info.js "회사명"
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

async function scrapeCompanyInfo(companyName, pool = null) {
  let browser = null;
  let connection = null;
  let shouldCloseConnection = false;

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 단일 회사 정보 스크래핑 시작: ${companyName}`);
    console.log('='.repeat(60) + '\n');

    // 디버깅: pool 파라미터 확인
    console.log(`[DEBUG] pool 파라미터 전달됨: ${pool ? 'YES' : 'NO'}`);
    console.log(`[DEBUG] pool 타입: ${typeof pool}`);

    // MySQL 연결 (pool이 있으면 사용, 없으면 새로 생성)
    if (pool) {
      connection = pool;
      console.log('✅ 기존 DB pool 사용\n');
    } else {
      console.log('[DEBUG] pool이 없어서 새 연결 생성 시도...');
      console.log(`[DEBUG] DB_HOST: ${process.env.DB_HOST ? '설정됨' : '없음'}`);
      console.log(`[DEBUG] DB_USER: ${process.env.DB_USER ? '설정됨' : '없음'}`);
      console.log(`[DEBUG] DB_PASSWORD: ${process.env.DB_PASSWORD ? '설정됨' : '없음'}`);
      connection = await mysql.createConnection(DB_CONFIG);
      shouldCloseConnection = true;
      console.log('✅ AWS RDS MySQL 연결 성공\n');
    }

    // Puppeteer 브라우저 실행
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-accelerated-2d-canvas',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // Use system chromium if available (Railway/nixpacks environment)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // User-Agent 설정 (정상 브라우저처럼 보이게)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 불필요한 리소스 차단하여 로딩 속도 향상
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 타임아웃 설정 (60초로 단축 - 빠르게 실패하고 다음으로)
    page.setDefaultNavigationTimeout(60000); // 60초

    console.log('✅ Chrome 드라이버 초기화 성공\n');

    // Catch.co.kr 로그인
    console.log(`🔐 Catch.co.kr 로그인 시도 (사용자: ${CATCH_LOGIN.id})\n`);

    let retryCount = 0;
    const maxRetries = 3;
    let pageLoaded = false;

    while (!pageLoaded && retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`  🔄 재시도 ${retryCount}/${maxRetries}...`);
        }
        await page.goto('https://www.catch.co.kr/', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        pageLoaded = true;
        console.log('  ✅ 페이지 로드 성공');
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`페이지 로드 실패 (${maxRetries}번 재시도): ${error.message}`);
        }
        console.log(`  ⚠️ 로드 실패, 재시도 중... (${error.message.substring(0, 50)}...)`);
        await new Promise(r => setTimeout(r, 3000)); // 3초 대기 후 재시도
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    // 로그인 버튼 클릭
    try {
      await page.waitForSelector('a:has-text("로그인")', { timeout: 5000 });
      await page.click('a:has-text("로그인")');
      console.log('  로그인 버튼 클릭 완료');
      await new Promise(r => setTimeout(r, 2000));
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
      await new Promise(r => setTimeout(r, 3000));
      console.log('✅ Catch.co.kr 로그인 성공\n');
    } catch (e) {
      console.log('  ⚠️ 로그인 폼을 찾을 수 없습니다 (이미 로그인 상태일 수 있음)\n');
    }

    // 회사 검색
    console.log(`\n[1/1] 🏢 ${companyName}`);
    console.log('-'.repeat(60));

    const searchUrl = 'https://www.catch.co.kr/Comp/CompMajor/SearchPage';
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    const searchTerm = companyName.trim();
    console.log(`  🔍 검색어: '${searchTerm}'`);

    // 검색창에 입력
    await page.waitForSelector('input[placeholder*="궁금한 기업을 검색"]', { timeout: 10000 });
    await page.type('input[placeholder*="궁금한 기업을 검색"]', searchTerm);

    // 검색 버튼 클릭
    await page.click('button.bt_sch');
    await new Promise(r => setTimeout(r, 3000));

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
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    console.log(`  🔗 회사 URL: ${targetUrl}`);

    // 기업정보 스크래핑
    const companyInfo = {
      company: companyName.trim(),
      url: targetUrl
    };

    // 업종
    try {
      const industry = await page.$eval('div.item.type3 p.t1', el => el.textContent.trim()).catch(() => '');
      companyInfo.industry = industry || '';
    } catch (e) {
      companyInfo.industry = '';
    }

    // 기업 규모
    try {
      const companyType = await page.$eval('div.item.type1 p.t1', el => el.textContent.trim()).catch(() => '');
      companyInfo.company_type = companyType || '';
    } catch (e) {
      companyInfo.company_type = '';
    }

    // 사원수
    try {
      const employeeCount = await page.$eval('div.item.type2 p.t1', el => el.textContent.trim()).catch(() => '');
      companyInfo.employee_count = employeeCount || '';
    } catch (e) {
      companyInfo.employee_count = '';
    }

    // 매출액
    try {
      const revenue = await page.$eval('div.item.type3 p.t1', el => el.textContent.trim()).catch(() => '');
      companyInfo.revenue = revenue || '';
    } catch (e) {
      companyInfo.revenue = '';
    }

    // 주소
    try {
      const location = await page.$eval("table tr th:has-text('주소') + td", el => el.textContent.replace('지도', '').trim()).catch(() => '');
      companyInfo.location = location || '';
    } catch (e) {
      companyInfo.location = '';
    }

    // 대표자
    try {
      const ceo = await page.$eval("table tr th:has-text('대표자') + td", el => el.textContent.trim()).catch(() => '');
      companyInfo.ceo = ceo || '';
    } catch (e) {
      companyInfo.ceo = '';
    }

    // 설립일
    try {
      const establishedDate = await page.$eval("table tr th:has-text('설립일') + td", el => el.textContent.trim()).catch(() => '');
      companyInfo.established_date = establishedDate || '';
    } catch (e) {
      companyInfo.established_date = '';
    }

    // 홈페이지
    try {
      const website = await page.$eval("table tr th:has-text('홈페이지') + td a", el => el.href).catch(() => '');
      companyInfo.website = website || '';
    } catch (e) {
      companyInfo.website = '';
    }

    // 회사 로고 이미지
    try {
      const companyLogo = await page.evaluate(() => {
        // 회사 로고를 찾기 위한 다양한 선택자 시도
        const selectors = [
          'div.logo_corp img',
          'div.comp_logo img',
          'div.company-logo img',
          'img.corp_logo',
          'img.company_logo',
          'div.info_corp img',
          'div.comp_info img[alt*="로고"]',
          'div.comp_info img[src*="logo"]',
          'img[alt*="로고"]',
          'img[src*="logo"]'
        ];

        for (const selector of selectors) {
          const img = document.querySelector(selector);
          if (img && img.src) {
            return img.src;
          }
        }
        return '';
      });
      companyInfo.company_logo_url = companyLogo || '';
      if (companyLogo) {
        console.log(`  🎨 회사 로고 발견: ${companyLogo.substring(0, 60)}...`);
      }
    } catch (e) {
      companyInfo.company_logo_url = '';
    }

    console.log(`  ✅ 기업정보 스크래핑 완료`);

    // DB 저장
    const [existing] = await connection.execute(
      'SELECT id FROM catch_companies WHERE company = ?',
      [companyInfo.company]
    );

    if (existing.length > 0) {
      // 업데이트
      await connection.execute(
        `UPDATE catch_companies SET
          company_url = ?, industry = ?, company_type = ?, employee_count = ?,
          revenue = ?, location = ?, ceo = ?, establishment_date = ?,
          company_logo_url = ?, updated_at = NOW()
        WHERE company = ?`,
        [
          companyInfo.url, companyInfo.industry, companyInfo.company_type,
          companyInfo.employee_count, companyInfo.revenue, companyInfo.location,
          companyInfo.ceo, companyInfo.established_date,
          companyInfo.company_logo_url,
          companyInfo.company
        ]
      );
      console.log(`  ✅ 회사 정보 업데이트`);
    } else {
      // 신규 저장
      await connection.execute(
        `INSERT INTO catch_companies (company, company_url, industry, company_type, employee_count,
          revenue, location, ceo, establishment_date, company_logo_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          companyInfo.company, companyInfo.url, companyInfo.industry,
          companyInfo.company_type, companyInfo.employee_count, companyInfo.revenue,
          companyInfo.location, companyInfo.ceo, companyInfo.established_date,
          companyInfo.company_logo_url
        ]
      );
      console.log(`  ✅ 회사 정보 신규 저장`);
    }

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
export { scrapeCompanyInfo };

// 커맨드 라인에서 직접 실행된 경우에만 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const companyName = process.argv.slice(2).join(' ');

  if (!companyName) {
    console.error('사용법: node scrape-company-info.js "회사명"');
    process.exit(1);
  }

  scrapeCompanyInfo(companyName)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('실행 실패:', error);
      process.exit(1);
    });
}
