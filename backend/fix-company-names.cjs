const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'commitjob',
        port: process.env.DB_PORT || 3306
    });

    console.log('='.repeat(80));
    console.log('회사명 Trailing Space 제거 스크립트');
    console.log('='.repeat(80));
    console.log('');

    // 1. jobs 테이블에서 trailing/leading space가 있는 회사 찾기
    const [jobsWithSpaces] = await pool.execute(
        `SELECT DISTINCT company, TRIM(company) as trimmed, COUNT(*) as count
         FROM jobs
         WHERE company != TRIM(company)
         GROUP BY company
         ORDER BY count DESC`
    );

    console.log(`[1] jobs 테이블에서 공백이 있는 회사명: ${jobsWithSpaces.length}개`);
    jobsWithSpaces.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}" → "${row.trimmed}" (${row.count}건)`);
    });
    console.log('');

    if (jobsWithSpaces.length === 0) {
        console.log('✅ 공백이 있는 회사명이 없습니다.');
        await pool.end();
        return;
    }

    // 2. jobs 테이블 업데이트
    console.log('[2] jobs 테이블 업데이트 중...');
    const [result] = await pool.execute(
        'UPDATE jobs SET company = TRIM(company) WHERE company != TRIM(company)'
    );
    console.log(`  ✅ ${result.affectedRows}건 업데이트 완료`);
    console.log('');

    // 3. 검증
    console.log('[3] 검증: 업데이트 후 공백이 있는 회사명 확인');
    const [afterUpdate] = await pool.execute(
        'SELECT COUNT(*) as count FROM jobs WHERE company != TRIM(company)'
    );
    console.log(`  남은 공백 있는 레코드: ${afterUpdate[0].count}건`);
    console.log('');

    // 4. 카카오 재확인
    console.log('[4] 카카오 회사명 재확인');
    const [kakaoJobs] = await pool.execute(
        'SELECT DISTINCT company FROM jobs WHERE company LIKE "%카카오%" ORDER BY company'
    );
    kakaoJobs.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}" (길이: ${row.company.length})`);
    });
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ 완료');
    console.log('='.repeat(80));

    await pool.end();
})();
