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

    const [companies] = await pool.execute(
        'SELECT DISTINCT company FROM jobs WHERE DATE(scraped_at) = CURDATE() ORDER BY company'
    );

    console.log('Total companies:', companies.length);
    console.log('');

    let missingCount = 0;

    for (const row of companies) {
        const company = row.company;

        const [companyInfo] = await pool.execute(
            'SELECT COUNT(*) as count FROM catch_companies WHERE company = ?',
            [company]
        );

        const [interviews] = await pool.execute(
            'SELECT COUNT(*) as count FROM catch_interview_questions WHERE company = ?',
            [company]
        );

        const hasCompanyInfo = companyInfo[0].count > 0;
        const hasInterviews = interviews[0].count > 0;

        const status = [];
        if (!hasCompanyInfo) status.push('NO_COMPANY_INFO');
        if (!hasInterviews) status.push('NO_INTERVIEWS');

        if (status.length > 0) {
            console.log('[MISSING]', company + ':', status.join(', '));
            missingCount++;
        } else {
            console.log('[OK]', company + ': ALL_EXIST');
        }
    }

    console.log('');
    console.log('Missing data for', missingCount, 'companies');

    await pool.end();
})();
