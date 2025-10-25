import mysql from 'mysql2/promise';

const createUser = async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'admin',
      password: 'Woolim114-RDS',
      database: 'appdb'
    });

    console.log('RDS 연결 성공');

    // 기존 사용자 삭제 (있다면)
    try {
      await connection.execute("DROP USER IF EXISTS 'appuser'@'%'");
      console.log('기존 appuser 삭제 완료');
    } catch (e) {
      console.log('기존 appuser 없음');
    }

    // 새 사용자 생성
    await connection.execute(
      "CREATE USER 'appuser'@'%' IDENTIFIED BY 'Woolim114!'"
    );
    console.log('✅ appuser 생성 완료');

    // 권한 부여
    await connection.execute(
      "GRANT ALL PRIVILEGES ON appdb.* TO 'appuser'@'%'"
    );
    console.log('✅ appdb 권한 부여 완료');

    // 권한 적용
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ 권한 적용 완료');

    // 확인
    const [users] = await connection.execute(
      "SELECT User, Host FROM mysql.user WHERE User='appuser'"
    );
    console.log('생성된 사용자:', users);

    await connection.end();
    console.log('작업 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
};

createUser();
