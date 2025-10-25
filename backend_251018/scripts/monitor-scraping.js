import mysql from 'mysql2/promise';

const monitorScraping = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('📊 실시간 데이터베이스 모니터링\n');

    // 모든 테이블 목록
    const tables = [
      { name: 'users', icon: '👤', labelKo: '사용자', labelEn: 'users' },
      { name: 'user_profiles', icon: '👥', labelKo: '프로필', labelEn: 'user_profiles' },
      { name: 'jobs', icon: '📋', labelKo: '채용공고', labelEn: 'jobs' },
      { name: 'applications', icon: '📝', labelKo: '지원내역', labelEn: 'applications' },
      { name: 'saved_jobs', icon: '⭐', labelKo: '관심공고', labelEn: 'saved_jobs' },
      { name: 'catch_companies', icon: '🏢', labelKo: '기업정보', labelEn: 'catch_companies' },
      { name: 'catch_reviews', icon: '💬', labelKo: '기업리뷰', labelEn: 'catch_reviews' },
      { name: 'catch_interview_questions', icon: '💼', labelKo: '면접질문', labelEn: 'catch_interview_questions' }
    ];

    const interval = setInterval(async () => {
      try {
        console.clear();
        console.log('📊 실시간 데이터베이스 모니터링');
        console.log('='.repeat(80));
        console.log(`${'테이블 (Table)'.padEnd(45)} | ${'전체 건수'.padStart(10)} | ${'오늘 INSERT'.padStart(12)}`);
        console.log('-'.repeat(80));

        for (const table of tables) {
          try {
            // 전체 건수 조회
            const [totalCount] = await connection.execute(
              `SELECT COUNT(*) as count FROM ${table.name}`
            );
            const total = totalCount[0].count;

            // 오늘 INSERT된 건수 조회 (jobs 테이블은 scraped_at, 나머지는 created_at 기준)
            let todayInsertCount = 0;
            try {
              const dateColumn = table.name === 'jobs' ? 'scraped_at' : 'created_at';
              const [todayResult] = await connection.execute(
                `SELECT COUNT(*) as count FROM ${table.name}
                 WHERE DATE(${dateColumn}) = CURDATE()`
              );
              todayInsertCount = todayResult[0].count;
            } catch {
              todayInsertCount = 0;
            }

            const tableName = `${table.icon} ${table.labelKo} (${table.labelEn})`;
            console.log(
              `${tableName.padEnd(45)} | ${total.toLocaleString().padStart(10)} | ${todayInsertCount.toLocaleString().padStart(12)}`
            );

          } catch (error) {
            const tableName = `${table.icon} ${table.labelKo} (${table.labelEn})`;
            console.log(
              `${tableName.padEnd(45)} | ${'N/A'.padStart(10)} | ${'N/A'.padStart(12)}`
            );
          }
        }

        console.log('='.repeat(80));
        console.log(`⏱️  ${new Date().toLocaleString('ko-KR')} | Ctrl+C로 종료`);

      } catch (error) {
        console.error('오류:', error.message);
      }
    }, 5000); // 5초마다 업데이트

    // Ctrl+C 핸들러
    process.on('SIGINT', async () => {
      clearInterval(interval);
      await connection.end();
      console.log('\n\n✅ 모니터링 종료');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

monitorScraping();
