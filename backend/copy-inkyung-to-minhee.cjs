const mysql = require('mysql2/promise');

async function copyInkyungProfileToMinhee() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'autorack.proxy.rlwy.net',
    port: process.env.MYSQL_PORT || 25560,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'wjVHZHcqGnJjzbOOkLJVbLgZtdSYEedv',
    database: process.env.MYSQL_DATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000
  });

  try {
    console.log('[1] DB 연결 중...');
    const connection = await pool.getConnection();
    console.log('✅ DB 연결 성공');

    // 1. 이인경 사용자 찾기
    console.log('\n[2] 이인경 사용자 조회 중...');
    const [inkyungUsers] = await connection.execute(
      'SELECT * FROM users WHERE name LIKE ? OR email LIKE ?',
      ['%인경%', '%인경%']
    );

    if (inkyungUsers.length === 0) {
      console.log('❌ 이인경 사용자를 찾을 수 없습니다.');
      connection.release();
      return;
    }

    const inkyungUserId = inkyungUsers[0].id;
    console.log(`✅ 이인경 사용자 발견:`);
    console.log(`   ID: ${inkyungUserId}`);
    console.log(`   Email: ${inkyungUsers[0].email}`);
    console.log(`   Name: ${inkyungUsers[0].name}`);

    // 2. 이인경의 프로필 가져오기
    console.log('\n[3] 이인경 프로필 조회 중...');
    const [inkyungProfiles] = await connection.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [inkyungUserId]
    );

    if (inkyungProfiles.length === 0) {
      console.log('❌ 이인경의 프로필을 찾을 수 없습니다.');
      connection.release();
      return;
    }

    const inkyungProfile = inkyungProfiles[0];
    console.log('✅ 이인경 프로필 발견:');
    console.log('   - 기술 스택:', inkyungProfile.skills);
    console.log('   - 경력:', inkyungProfile.experience);
    console.log('   - 희망 지역:', inkyungProfile.preferred_regions);
    console.log('   - 희망 직무:', inkyungProfile.preferred_jobs);
    console.log('   - 희망 연봉:', inkyungProfile.expected_salary);

    // 3. 민희 사용자 찾기
    console.log('\n[4] 민희 사용자 조회 중...');
    const [minheeUsers] = await connection.execute(
      'SELECT * FROM users WHERE name LIKE ? OR email LIKE ?',
      ['%민희%', '%민희%']
    );

    if (minheeUsers.length === 0) {
      console.log('❌ 민희 사용자를 찾을 수 없습니다.');
      connection.release();
      return;
    }

    const minheeUserId = minheeUsers[0].id;
    console.log(`✅ 민희 사용자 발견:`);
    console.log(`   ID: ${minheeUserId}`);
    console.log(`   Email: ${minheeUsers[0].email}`);
    console.log(`   Name: ${minheeUsers[0].name}`);

    // 4. 민희의 기존 프로필 확인 및 삭제
    console.log('\n[5] 민희의 기존 프로필 확인 중...');
    const [existingMinheeProfiles] = await connection.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [minheeUserId]
    );

    if (existingMinheeProfiles.length > 0) {
      console.log('⚠️ 민희의 기존 프로필이 존재합니다. 삭제 후 복사합니다.');
      await connection.execute('DELETE FROM user_profiles WHERE user_id = ?', [minheeUserId]);
      console.log('✅ 기존 프로필 삭제 완료');
    }

    // 5. 이인경의 프로필을 민희에게 복사
    console.log('\n[6] 이인경의 프로필을 민희에게 복사 중...');
    const insertSQL = `
      INSERT INTO user_profiles (
        user_id, skills, experience, preferred_regions, preferred_jobs, expected_salary,
        education, languages, experiences, cover_letters, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      minheeUserId,
      inkyungProfile.skills,
      inkyungProfile.experience,
      inkyungProfile.preferred_regions,
      inkyungProfile.preferred_jobs,
      inkyungProfile.expected_salary,
      inkyungProfile.education || null,
      inkyungProfile.languages || null,
      inkyungProfile.experiences || null,
      inkyungProfile.cover_letters || null
    ];

    const [result] = await connection.execute(insertSQL, params);

    console.log('\n✅ 프로필 복사 완료!');
    console.log('   New Profile ID:', result.insertId);

    // 6. 복사된 프로필 확인
    console.log('\n[7] 복사된 민희 프로필 확인:');
    const [newMinheeProfile] = await connection.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [minheeUserId]
    );

    console.log('\n복사된 프로필 정보:');
    console.log('   - 기술 스택:', newMinheeProfile[0].skills);
    console.log('   - 경력:', newMinheeProfile[0].experience);
    console.log('   - 희망 지역:', newMinheeProfile[0].preferred_regions);
    console.log('   - 희망 직무:', newMinheeProfile[0].preferred_jobs);
    console.log('   - 희망 연봉:', newMinheeProfile[0].expected_salary);
    if (newMinheeProfile[0].education) {
      console.log('   - 학력:', newMinheeProfile[0].education);
    }
    if (newMinheeProfile[0].languages) {
      console.log('   - 언어:', newMinheeProfile[0].languages);
    }
    if (newMinheeProfile[0].experiences) {
      console.log('   - 경험:', newMinheeProfile[0].experiences);
    }
    if (newMinheeProfile[0].cover_letters) {
      console.log('   - 자기소개서:', newMinheeProfile[0].cover_letters);
    }

    connection.release();

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

copyInkyungProfileToMinhee();
