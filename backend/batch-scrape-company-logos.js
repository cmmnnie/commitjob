/**
 * 배치 프로그램: jobs 테이블의 모든 회사 로고 스크래핑
 *
 * 사용법: node batch-scrape-company-logos.js [limit]
 * 예시:
 *   node batch-scrape-company-logos.js        # 모든 회사 스크래핑
 *   node batch-scrape-company-logos.js 10     # 최대 10개 회사만 스크래핑
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { scrapeCompanyInfo } from './scrape-company-info.js';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'commitjob',
  port: process.env.DB_PORT || 3306
};

async function batchScrapeCompanyLogos(limit = null) {
  let pool = null;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 회사 로고 배치 스크래핑 시작');
    console.log('='.repeat(80) + '\n');

    // MySQL 연결
    pool = mysql.createPool(DB_CONFIG);
    console.log('✅ MySQL 연결 성공\n');

    // jobs 테이블에서 고유한 회사 목록 조회
    console.log('🔍 jobs 테이블에서 고유한 회사 목록 조회 중...\n');

    let query = `
      SELECT DISTINCT TRIM(company) as company, COUNT(*) as job_count
      FROM jobs
      WHERE company IS NOT NULL AND TRIM(company) != ''
      GROUP BY TRIM(company)
      ORDER BY job_count DESC, company ASC
    `;

    if (limit && limit > 0) {
      query += ` LIMIT ${limit}`;
    }

    const [companies] = await pool.execute(query);

    console.log(`📋 총 ${companies.length}개의 고유한 회사를 발견했습니다.\n`);

    if (companies.length === 0) {
      console.log('⚠️  스크래핑할 회사가 없습니다.\n');
      return;
    }

    // 이미 로고가 있는 회사와 없는 회사 구분
    const [companiesWithLogo] = await pool.execute(`
      SELECT TRIM(company) as company
      FROM catch_companies
      WHERE company_logo_url IS NOT NULL AND company_logo_url != ''
    `);

    const companiesWithLogoSet = new Set(
      companiesWithLogo.map(c => c.company.trim())
    );

    const companiesNeedingLogo = companies.filter(
      c => !companiesWithLogoSet.has(c.company.trim())
    );

    console.log(`✅ 이미 로고가 있는 회사: ${companies.length - companiesNeedingLogo.length}개`);
    console.log(`❌ 로고가 필요한 회사: ${companiesNeedingLogo.length}개\n`);

    if (companiesNeedingLogo.length === 0) {
      console.log('🎉 모든 회사의 로고가 이미 스크래핑되었습니다!\n');
      return;
    }

    // 스크래핑 시작
    console.log('='.repeat(80));
    console.log(`🚀 ${companiesNeedingLogo.length}개 회사의 로고 스크래핑 시작`);
    console.log('='.repeat(80) + '\n');

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < companiesNeedingLogo.length; i++) {
      const company = companiesNeedingLogo[i].company.trim();
      const jobCount = companiesNeedingLogo[i].job_count;

      console.log(`\n[${ i + 1}/${companiesNeedingLogo.length}] 🏢 ${company} (채용공고: ${jobCount}건)`);
      console.log('-'.repeat(80));

      try {
        // scrapeCompanyInfo 함수 호출 (pool 전달)
        await scrapeCompanyInfo(company, pool);

        // 로고가 실제로 저장되었는지 확인
        const [logoCheck] = await pool.execute(
          'SELECT company_logo_url FROM catch_companies WHERE company = ?',
          [company]
        );

        if (logoCheck.length > 0 && logoCheck[0].company_logo_url) {
          console.log(`  ✅ 로고 스크래핑 성공`);
          successCount++;
        } else {
          console.log(`  ⚠️  회사 정보는 저장되었으나 로고를 찾지 못함`);
          skipCount++;
        }

        // 요청 간 딜레이 (서버 부하 방지)
        if (i < companiesNeedingLogo.length - 1) {
          const delaySeconds = 2;
          console.log(`  ⏳ ${delaySeconds}초 대기 중...`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

      } catch (error) {
        console.error(`  ❌ 스크래핑 실패: ${error.message}`);
        failCount++;
      }
    }

    // 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 배치 스크래핑 완료');
    console.log('='.repeat(80));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⚠️  로고 없음: ${skipCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log(`📋 총 처리: ${successCount + skipCount + failCount}개`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ 배치 작업 오류:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      console.log('✅ MySQL 연결 종료\n');
    }
  }
}

// 커맨드 라인에서 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : null;

  if (limit && limit > 0) {
    console.log(`\n⚙️  최대 ${limit}개의 회사만 처리합니다.\n`);
  }

  batchScrapeCompanyLogos(limit)
    .then(() => {
      console.log('🎉 배치 작업이 성공적으로 완료되었습니다!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 배치 작업이 실패했습니다:', error);
      process.exit(1);
    });
}

export { batchScrapeCompanyLogos };
