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

async function queryAllUsers() {
  try {
    const [users] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');

    console.log('=== Users 테이블 전체 데이터 ===\n');
    console.log('총', users.length, '명의 사용자\n');

    users.forEach((user, index) => {
      console.log(`[${index + 1}]`);
      console.log('ID:', user.id);
      console.log('Provider Key:', user.provider_key);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Picture:', user.picture);
      console.log('Provider:', user.provider);
      console.log('생성일:', user.created_at);
      console.log('수정일:', user.updated_at);
      console.log('최근 접속일:', user.last_login || '(없음)');
      console.log('---\n');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

queryAllUsers();
