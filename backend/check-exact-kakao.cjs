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
    console.log('카카오 정확한 매칭 테스트');
    console.log('='.repeat(80));
    console.log('');

    // jobs에서 "카카오 " (공백 포함)으로 1건 선택
    const [jobKakao] = await pool.execute(
        'SELECT id, company, title FROM jobs WHERE company LIKE "카카오 %" LIMIT 1'
    );

    if (jobKakao.length === 0) {
        console.log('❌ "카카오 "로 시작하는 채용공고를 찾을 수 없습니다.');
        await pool.end();
        return;
    }

    const job = jobKakao[0];
    const companyName = job.company;

    console.log('[테스트 대상 채용공고]');
    console.log(`  ID: ${job.id}`);
    console.log(`  회사명: "${companyName}"`);
    console.log(`  회사명 길이: ${companyName.length}`);
    console.log(`  제목: ${job.title}`);
    console.log('');

    // API와 동일한 쿼리로 catch_companies 검색
    console.log('[1] catch_companies에서 정확히 매칭 (API 방식):');
    const [companyResults] = await pool.execute(
        'SELECT * FROM catch_companies WHERE company = ? LIMIT 1',
        [companyName]
    );
    console.log(`  매칭 결과: ${companyResults.length}건`);
    if (companyResults.length > 0) {
        console.log(`  ✅ 매칭됨: "${companyResults[0].company}"`);
    } else {
        console.log(`  ❌ 매칭 안 됨`);
    }
    console.log('');

    // API와 동일한 쿼리로 catch_interview_questions 검색
    console.log('[2] catch_interview_questions에서 정확히 매칭 (API 방식):');
    const [interviewResults] = await pool.execute(
        'SELECT * FROM catch_interview_questions WHERE company = ? LIMIT 5',
        [companyName]
    );
    console.log(`  매칭 결과: ${interviewResults.length}건`);
    if (interviewResults.length > 0) {
        console.log(`  ✅ 매칭됨`);
        interviewResults.forEach((q, idx) => {
            console.log(`    ${idx + 1}. ${q.question.substring(0, 50)}...`);
        });
    } else {
        console.log(`  ❌ 매칭 안 됨`);
    }
    console.log('');

    // TRIM 사용해서 검색
    console.log('[3] TRIM 사용해서 검색:');
    const [companyTrimmed] = await pool.execute(
        'SELECT * FROM catch_companies WHERE TRIM(company) = TRIM(?) LIMIT 1',
        [companyName]
    );
    console.log(`  catch_companies: ${companyTrimmed.length}건`);
    if (companyTrimmed.length > 0) {
        console.log(`    매칭된 회사명: "${companyTrimmed[0].company}" (길이: ${companyTrimmed[0].company.length})`);
    }

    const [interviewTrimmed] = await pool.execute(
        'SELECT COUNT(*) as count FROM catch_interview_questions WHERE TRIM(company) = TRIM(?)',
        [companyName]
    );
    console.log(`  catch_interview_questions: ${interviewTrimmed[0].count}건`);
    console.log('');

    // catch_companies의 모든 카카오 회사 조회
    console.log('[4] catch_companies의 모든 카카오 회사:');
    const [allKakao] = await pool.execute(
        'SELECT company, LENGTH(company) as len FROM catch_companies WHERE company LIKE "%카카오%" ORDER BY company'
    );
    allKakao.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.company}" (길이: ${row.len})`);
    });
    console.log('');

    console.log('='.repeat(80));
    console.log('결론');
    console.log('='.repeat(80));
    console.log('');

    if (companyResults.length === 0 && companyTrimmed.length > 0) {
        console.log('⚠️  문제: 정확한 매칭은 실패하지만 TRIM 사용 시 매칭됨');
        console.log('해결책: API에서 TRIM() 사용 필요');
    } else if (companyResults.length > 0) {
        console.log('✅ 정확한 매칭 성공 - API가 정상 작동해야 함');
    } else {
        console.log('❌ TRIM 사용해도 매칭 안 됨 - 데이터가 없는 것');
    }

    await pool.end();
})();
