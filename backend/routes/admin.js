// ==============================================================================
// Admin API - Job Update Operations
// ==============================================================================

import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

// Helper function to scrape job details
async function scrapeJobDetails(page, url) {
  try {
    console.log(`🌐 페이지 접속: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await new Promise(r => setTimeout(r, 3000));

    const detailInfo = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      let registrationInfo = '';

      // 방법 0: "채용시 마감", "상시채용" 등 텍스트 찾기 (최우선)
      const urgentPatterns = [
        /채용시\s*마감/i,
        /상시\s*채용/i,
        /수시\s*채용/i,
        /채용\s*시\s*마감/i
      ];

      for (const pattern of urgentPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          registrationInfo = match[0].replace(/\s+/g, ' ').trim();
          break;
        }
      }

      // 방법 1: "접수기간" 텍스트 검색
      if (!registrationInfo) {
        const receptionPatterns = [
          /접수기간\s*[:：]\s*([^\n\r<>]+)/i,
          /접수기간\s*및\s*방법[\s\S]*?접수기간\s*[:：]\s*([^\n\r<>]+)/i,
          /채용기간\s*[:：]\s*([^\n\r<>]+)/i,
          /마감\s*[:：]\s*([^\n\r<>]+)/i
        ];

        for (const pattern of receptionPatterns) {
          const match = bodyText.match(pattern);
          if (match && match[1]) {
            let cleaned = match[1]
              .replace(/<[^>]*>/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            cleaned = cleaned.split('※')[0].split('본 채용정보')[0].trim();

            if (cleaned.length > 0 && cleaned.length < 100) {
              registrationInfo = cleaned;
              break;
            }
          }
        }
      }

      // 방법 2: 기간 형식 날짜 찾기
      if (!registrationInfo) {
        const dateRangeMatch = bodyText.match(/\d{4}[./-]\d{2}[./-]\d{2}\s*~\s*\d{4}[./-]\d{2}[./-]\d{2}/);
        if (dateRangeMatch) {
          registrationInfo = dateRangeMatch[0];
        }
      }

      // 방법 3: 단일 날짜 찾기
      if (!registrationInfo) {
        const singleDateMatch = bodyText.match(/\d{4}\.\d{2}\.\d{2}/);
        if (singleDateMatch) {
          registrationInfo = singleDateMatch[0];
        }
      }

      const cleanHtml = (text) => {
        if (!text) return '';
        return text
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .replace(/※.*/g, '')
          .trim();
      };

      return {
        registration_info: cleanHtml(registrationInfo),
        success: !!registrationInfo
      };
    });

    return detailInfo;

  } catch (error) {
    console.error('❌ 스크래핑 오류:', error.message);
    return { registration_info: '', success: false };
  }
}

// Update missing registration_info for jobs
router.post('/update-registration-info', async (req, res) => {
  let browser = null;

  try {
    const { limit = 10 } = req.body;
    const pool = req.app.get('pool');

    console.log(`\n📝 최대 ${limit}건의 registration_info 업데이트 시작`);

    // Find jobs with empty registration_info
    const [jobs] = await pool.execute(
      `SELECT id, company, title, url, registration_info
       FROM jobs
       WHERE registration_info IS NULL
          OR registration_info = ''
          OR registration_info = '[]'
       ORDER BY scraped_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    if (jobs.length === 0) {
      return res.json({
        success: true,
        message: '업데이트할 공고가 없습니다.',
        stats: { total: 0, updated: 0, failed: 0 }
      });
    }

    console.log(`✅ ${jobs.length}건의 공고 발견\n`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    const stats = {
      total: jobs.length,
      updated: 0,
      failed: 0,
      details: []
    };

    // Process each job
    for (const job of jobs) {
      console.log(`\n🔍 [${job.id}] ${job.company} - ${job.title}`);
      console.log(`   URL: ${job.url}`);

      try {
        const detailInfo = await scrapeJobDetails(page, job.url);

        if (detailInfo.registration_info) {
          // Convert to JSON array format
          const jsonArrayInfo = JSON.stringify([detailInfo.registration_info]);

          await pool.execute(
            'UPDATE jobs SET registration_info = ? WHERE id = ?',
            [jsonArrayInfo, job.id]
          );

          console.log(`✅ 업데이트 완료: ${jsonArrayInfo}`);
          stats.updated++;
          stats.details.push({
            id: job.id,
            company: job.company,
            status: 'success',
            registration_info: jsonArrayInfo
          });
        } else {
          console.log(`⚠️  registration_info를 찾지 못했습니다`);
          stats.failed++;
          stats.details.push({
            id: job.id,
            company: job.company,
            status: 'failed',
            reason: 'No registration info found'
          });
        }

        // Delay between requests
        await new Promise(r => setTimeout(r, 2000));

      } catch (error) {
        console.error(`❌ 오류: ${error.message}`);
        stats.failed++;
        stats.details.push({
          id: job.id,
          company: job.company,
          status: 'error',
          reason: error.message
        });
      }
    }

    console.log(`\n✅ 처리 완료: 성공 ${stats.updated}건, 실패 ${stats.failed}건\n`);

    res.json({
      success: true,
      message: `처리 완료: 성공 ${stats.updated}건, 실패 ${stats.failed}건`,
      stats
    });

  } catch (error) {
    console.error('❌ API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
