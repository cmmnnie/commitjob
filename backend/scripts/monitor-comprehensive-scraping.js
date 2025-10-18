import mysql from 'mysql2/promise';

const monitorComprehensiveScraping = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('📊 통합 스크래핑 모니터링\n');

    const interval = setInterval(async () => {
      try {
        // 기출문제
        const [interviewCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_interview_questions');
        const interviewTotal = interviewCount[0].count;

        // 회사 정보
        const [companiesCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_companies');
        const companiesTotal = companiesCount[0].count;

        // 리뷰
        const [reviewsCount] = await connection.execute('SELECT COUNT(*) as count FROM catch_reviews');
        const reviewsTotal = reviewsCount[0].count;

        // 최근 추가된 기출문제
        const [recentInterview] = await connection.execute(`
          SELECT company_name, COUNT(*) as count
          FROM catch_interview_questions
          GROUP BY company_name
          ORDER BY MAX(created_at) DESC
          LIMIT 5
        `);

        console.clear();
        console.log('📊 통합 스크래핑 모니터링');
        console.log('='.repeat(60));

        console.log(`\n💬 기출문제: ${interviewTotal}개`);
        console.log(`🏢 회사 정보: ${companiesTotal}개`);
        console.log(`⭐ 리뷰: ${reviewsTotal}개`);

        if (recentInterview.length > 0) {
          console.log('\n📝 최근 수집된 기출문제 (회사별):');
          recentInterview.forEach((row, i) => {
            console.log(`  ${i+1}. ${row.company_name}: ${row.count}개`);
          });
        }

        console.log('\n' + '='.repeat(60));
        console.log(`⏱️  ${new Date().toLocaleTimeString('ko-KR')} | Ctrl+C로 종료`);

      } catch (error) {
        console.error('오류:', error.message);
      }
    }, 5000); // 5초마다 업데이트

    // Ctrl+C 핸들러
    process.on('SIGINT', async () => {
      clearInterval(interval);
      await connection.end();
      console.log('\n\n모니터링 종료');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

monitorComprehensiveScraping();
