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
    console.log('카카오 회사명 비교');
    console.log('='.repeat(80));
    console.log('');

    // jobs 테이블에서 카카오 검색
    console.log('[1] jobs 테이블에서 "카카오" 포함 회사명 검색:');
    const [jobsKakao] = await pool.execute(
        'SELECT DISTINCT company FROM jobs WHERE company LIKE "%카카오%" ORDER BY company'
    );
    console.log('  총', jobsKakao.length, '개');
    jobsKakao.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}"`);
    });
    console.log('');

    // catch_companies 테이블에서 카카오 검색
    console.log('[2] catch_companies 테이블에서 "카카오" 포함 회사명 검색:');
    const [companiesKakao] = await pool.execute(
        'SELECT company FROM catch_companies WHERE company LIKE "%카카오%" ORDER BY company'
    );
    console.log('  총', companiesKakao.length, '개');
    companiesKakao.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}"`);
    });
    console.log('');

    // catch_interview_questions 테이블에서 카카오 검색
    console.log('[3] catch_interview_questions 테이블에서 "카카오" 포함 회사명 검색:');
    const [interviewKakao] = await pool.execute(
        'SELECT DISTINCT company FROM catch_interview_questions WHERE company LIKE "%카카오%" ORDER BY company'
    );
    console.log('  총', interviewKakao.length, '개');
    interviewKakao.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}"`);
    });
    console.log('');

    // 정확한 매칭 확인
    console.log('='.repeat(80));
    console.log('정확한 매칭 확인');
    console.log('='.repeat(80));
    console.log('');

    for (const jobRow of jobsKakao) {
        const jobCompany = jobRow.company;

        const [companyMatch] = await pool.execute(
            'SELECT COUNT(*) as count FROM catch_companies WHERE company = ?',
            [jobCompany]
        );

        const [interviewMatch] = await pool.execute(
            'SELECT COUNT(*) as count FROM catch_interview_questions WHERE company = ?',
            [jobCompany]
        );

        const hasCompany = companyMatch[0].count > 0;
        const hasInterview = interviewMatch[0].count > 0;

        console.log(`"${jobCompany}":`);
        console.log(`  - catch_companies: ${hasCompany ? '✅ 매칭됨 (' + companyMatch[0].count + '건)' : '❌ 매칭 안 됨'}`);
        console.log(`  - catch_interview_questions: ${hasInterview ? '✅ 매칭됨 (' + interviewMatch[0].count + '건)' : '❌ 매칭 안 됨'}`);
        console.log('');
    }

    await pool.end();
})();
