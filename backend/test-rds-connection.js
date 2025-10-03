import mysql from 'mysql2/promise';

const testConnection = async () => {
  try {
    console.log('RDS 연결 시도 중...');

    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'admin',
      password: 'Woolim114-RDS', // RDS 생성 시 입력한 암호
      connectTimeout: 10000
    });

    console.log('✅ RDS 연결 성공!');

    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('쿼리 테스트:', rows);

    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('데이터베이스 목록:', databases);

    await connection.end();
    console.log('연결 종료');
  } catch (error) {
    console.error('❌ RDS 연결 실패:', error.message);
    console.error('Error code:', error.code);
  }
};

testConnection();
