import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function queryUser() {
  try {
    console.log('이인경 사용자 정보 조회 중...\n');

    const [users] = await pool.execute(
      `SELECT * FROM users WHERE name LIKE ?`,
      ['%이인경%']
    );

    if (users.length === 0) {
      console.log('이인경 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log('=== Users 테이블 ===');
    users.forEach(user => {
      console.log('ID:', user.id);
      console.log('Provider Key:', user.provider_key);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Picture:', user.picture);
      console.log('Provider:', user.provider);
      console.log('Created At:', user.created_at);
      console.log('Updated At:', user.updated_at);
      console.log('---');
    });

    // user_profiles 조회
    const userId = users[0].id;
    const [profiles] = await pool.execute(
      `SELECT * FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (profiles.length > 0) {
      console.log('\n=== User Profiles 테이블 ===');
      profiles.forEach(profile => {
        console.log('User ID:', profile.user_id);
        console.log('Skills:', profile.skills);
        console.log('Experience:', profile.experience);
        console.log('Preferred Regions:', profile.preferred_regions);
        console.log('Preferred Jobs:', profile.preferred_jobs);
        console.log('Expected Salary:', profile.expected_salary);
        console.log('Resume Path:', profile.resume_path);
        console.log('Created At:', profile.created_at);
        console.log('Updated At:', profile.updated_at);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

queryUser();
