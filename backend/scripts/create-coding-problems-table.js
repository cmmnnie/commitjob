import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'appuser',
  password: 'Woolim114!',
  database: 'appdb'
};

async function createCodingProblemsTable() {
  let connection;

  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        coding_problems 테이블 생성                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ AWS RDS MySQL 연결 성공\n');

    // coding_problems 테이블 생성
    console.log('📋 coding_problems 테이블 생성 중...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coding_problems (
        id BIGINT NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description MEDIUMTEXT,
        difficulty VARCHAR(20) DEFAULT 'medium',
        company_name VARCHAR(50),
        algorithm_type VARCHAR(100),
        time_limit INT DEFAULT 2000,
        memory_limit INT DEFAULT 256,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_company (company_name),
        INDEX idx_difficulty (difficulty),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ coding_problems 테이블 생성 완료\n');

    // test_cases 테이블 생성
    console.log('📋 test_cases 테이블 생성 중...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id BIGINT NOT NULL AUTO_INCREMENT,
        problem_id BIGINT NOT NULL,
        input TEXT,
        expected_output TEXT,
        is_sample BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_problem_id (problem_id),
        FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ test_cases 테이블 생성 완료\n');

    // submissions 테이블 생성
    console.log('📋 submissions 테이블 생성 중...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS submissions (
        id BIGINT NOT NULL AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        problem_id BIGINT NOT NULL,
        code TEXT NOT NULL,
        language VARCHAR(50) DEFAULT 'python',
        status VARCHAR(50) DEFAULT 'pending',
        result TEXT,
        submitted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_user_problem (user_id, problem_id),
        INDEX idx_submitted_at (submitted_at),
        FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ submissions 테이블 생성 완료\n');

    // 테이블 확인
    console.log('📊 생성된 테이블 확인\n');

    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM information_schema.tables
      WHERE table_schema = 'appdb' AND TABLE_NAME IN ('coding_problems', 'test_cases', 'submissions')
      ORDER BY TABLE_NAME
    `);

    console.log('생성된 테이블:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}: ${table.TABLE_ROWS}건`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ coding_problems 관련 테이블 생성 완료!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.code) {
      console.error(`오류 코드: ${error.code}`);
    }
    if (error.sqlMessage) {
      console.error(`SQL 오류: ${error.sqlMessage}`);
    }
    console.error('\n');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 프로그램 실행
createCodingProblemsTable();
