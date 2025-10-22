const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigration() {
    let connection;

    try {
        // MySQL 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'commitjob',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ 데이터베이스 연결 성공');

        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, 'scripts', 'add-experiences-field.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('📄 SQL 스크립트 읽기 완료');
        console.log('실행할 SQL:\n', sql);

        // SQL 실행
        await connection.execute(sql);

        console.log('✅ experiences 컬럼 추가 완료!');
        console.log('📊 user_profiles 테이블에 experiences 필드가 추가되었습니다.');

        // 테이블 구조 확인
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM user_profiles WHERE Field = 'experiences'"
        );

        console.log('\n📋 추가된 컬럼 정보:');
        console.log(columns);

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ 데이터베이스 연결 종료');
        }
    }
}

runMigration();
