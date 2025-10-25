import mysql from 'mysql2/promise';

const createInterviewQuestionsTable = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ RDS 연결 성공\n');

    // 기출문제 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS catch_interview_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT,
        company_name VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        period VARCHAR(100),
        position VARCHAR(200),
        experience VARCHAR(100),
        company_url VARCHAR(1024),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_company_name (company_name),
        INDEX idx_company_id (company_id),
        FOREIGN KEY (company_id) REFERENCES catch_companies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ catch_interview_questions 테이블 생성 완료\n');

    // 테이블 구조 확인
    const [columns] = await connection.execute('DESCRIBE catch_interview_questions');
    console.log('=== catch_interview_questions 테이블 구조 ===');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type}) ${col.Null} ${col.Key} ${col.Default || ''}`);
    });

    await connection.end();
    console.log('\n✅ 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

createInterviewQuestionsTable();
