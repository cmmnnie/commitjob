const mysql = require('mysql2/promise');

async function createMinheeProfile() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'autorack.proxy.rlwy.net',
    port: process.env.MYSQL_PORT || 25560,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'wjVHZHcqGnJjzbOOkLJVbLgZtdSYEedv',
    database: process.env.MYSQL_DATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // 1. 민희 사용자 찾기
    console.log('[1] 민희 사용자 조회 중...');
    const [users] = await pool.execute('SELECT * FROM users WHERE name LIKE ?', ['%민희%']);

    if (users.length === 0) {
      console.log('❌ 민희 사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`✅ 민희 사용자 발견: ID=${users[0].id}, Email=${users[0].email}, Name=${users[0].name}`);
    const userId = users[0].id;

    // 2. 기존 프로필 확인
    console.log('\n[2] 기존 프로필 확인 중...');
    const [existingProfiles] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

    if (existingProfiles.length > 0) {
      console.log('⚠️ 이미 프로필이 존재합니다:');
      console.log(JSON.stringify(existingProfiles[0], null, 2));
      console.log('\n기존 프로필을 삭제하고 새로 생성하시겠습니까? (y/n)');
      // 일단 삭제하고 새로 생성
      await pool.execute('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
      console.log('✅ 기존 프로필 삭제 완료');
    }

    // 3. 새 프로필 생성
    console.log('\n[3] 새 프로필 생성 중...');
    const profileData = {
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'MySQL'],
      experience: '신입',
      preferred_regions: ['서울', '경기'],
      preferred_jobs: '프론트엔드 개발자',
      expected_salary: 3000
    };

    const insertSQL = `
      INSERT INTO user_profiles (user_id, skills, experience, preferred_regions, preferred_jobs, expected_salary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    console.log('SQL:', insertSQL);
    console.log('Params:', [
      userId,
      JSON.stringify(profileData.skills),
      profileData.experience,
      JSON.stringify(profileData.preferred_regions),
      profileData.preferred_jobs,
      profileData.expected_salary
    ]);

    const [result] = await pool.execute(insertSQL, [
      userId,
      JSON.stringify(profileData.skills),
      profileData.experience,
      JSON.stringify(profileData.preferred_regions),
      profileData.preferred_jobs,
      profileData.expected_salary
    ]);

    console.log('\n✅ 프로필 생성 완료!');
    console.log('Profile ID:', result.insertId);
    console.log('\n생성된 프로필 정보:');
    console.log('- 기술 스택:', profileData.skills.join(', '));
    console.log('- 경력:', profileData.experience);
    console.log('- 희망 지역:', profileData.preferred_regions.join(', '));
    console.log('- 희망 직무:', profileData.preferred_jobs);
    console.log('- 희망 연봉:', profileData.expected_salary + '만원');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

createMinheeProfile();
