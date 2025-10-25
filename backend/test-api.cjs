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

    const testCompany = '카카오 ';  // jobs 테이블의 실제 회사명

    console.log('='.repeat(80));
    console.log(`API 시뮬레이션 테스트: "${testCompany}"`);
    console.log('='.repeat(80));
    console.log('');

    // 1. Company Info API 시뮬레이션
    console.log('[1] GET /api/company/:companyName');
    console.log(`    URL: /api/company/${encodeURIComponent(testCompany)}`);

    const [companyResults] = await pool.execute(
        'SELECT * FROM catch_companies WHERE company = ? LIMIT 1',
        [testCompany]
    );

    if (companyResults.length === 0) {
        console.log('    Response: { success: false, message: "회사 정보를 찾을 수 없습니다." }');
    } else {
        const company = companyResults[0];
        console.log('    Response: {');
        console.log('      success: true,');
        console.log('      company: {');
        console.log(`        company: "${company.company}",`);
        console.log(`        industry: "${company.industry || ''}",`);
        console.log(`        ...`);
        console.log('      }');
        console.log('    }');
    }
    console.log('');

    // 2. Interview Questions API 시뮬레이션
    console.log('[2] GET /api/company/:companyName/interview-questions?limit=5');
    console.log(`    URL: /api/company/${encodeURIComponent(testCompany)}/interview-questions?limit=5`);

    const [interviewResults] = await pool.execute(
        'SELECT * FROM catch_interview_questions WHERE company = ? ORDER BY id DESC LIMIT 5',
        [testCompany]
    );

    console.log('    Response: {');
    console.log('      success: true,');
    console.log(`      questions: [ ${interviewResults.length}건 ],`);
    console.log(`      total: ${interviewResults.length}`);
    console.log('    }');

    if (interviewResults.length > 0) {
        console.log('    Questions:');
        interviewResults.forEach((q, idx) => {
            console.log(`      ${idx + 1}. ${q.question.substring(0, 60)}...`);
        });
    }
    console.log('');

    // 3. Reviews API 시뮬레이션
    console.log('[3] GET /api/company/:companyName/reviews?limit=5');
    console.log(`    URL: /api/company/${encodeURIComponent(testCompany)}/reviews?limit=5`);

    const [reviewResults] = await pool.execute(
        'SELECT * FROM catch_reviews WHERE company = ? ORDER BY id DESC LIMIT 5',
        [testCompany]
    );

    console.log('    Response: {');
    console.log('      success: true,');
    console.log(`      reviews: [ ${reviewResults.length}건 ],`);
    console.log(`      total: ${reviewResults.length}`);
    console.log('    }');
    console.log('');

    console.log('='.repeat(80));
    console.log('결론');
    console.log('='.repeat(80));
    console.log('');

    if (companyResults.length > 0) {
        console.log('✅ Company Info: 데이터 있음');
    } else {
        console.log('❌ Company Info: 데이터 없음');
    }

    if (interviewResults.length > 0) {
        console.log(`✅ Interview Questions: ${interviewResults.length}건`);
    } else {
        console.log('❌ Interview Questions: 데이터 없음');
    }

    if (reviewResults.length > 0) {
        console.log(`✅ Reviews: ${reviewResults.length}건`);
    } else {
        console.log('❌ Reviews: 데이터 없음');
    }

    console.log('');
    console.log('📝 프론트엔드 체크리스트:');
    console.log('   1. API_BASE_URL이 올바른 서버를 가리키는지 확인');
    console.log('   2. 브라우저 콘솔에서 [JobDetail] 로그 확인');
    console.log('   3. companyData.success와 questionsData.success 값 확인');
    console.log('   4. 브라우저 캐시 클리어 후 재시도');

    await pool.end();
})();
