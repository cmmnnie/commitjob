#!/usr/bin/env node
/**
 * 데이터베이스 컬럼명 변경 마이그레이션 (직접 연결)
 */

const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;

  try {
    console.log('🔄 데이터베이스 연결 중...');

    connection = await mysql.createConnection({
      host: 'database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'appuser',
      password: 'Woolim114!',
      database: 'appdb'
    });

    console.log('✅ 데이터베이스 연결 성공');

    // 1. catch_companies 테이블의 name 컬럼을 company로 변경
    console.log('\n📝 catch_companies.name -> company 변경 중...');
    try {
      await connection.execute('ALTER TABLE catch_companies CHANGE COLUMN name company VARCHAR(255)');
      console.log('✅ catch_companies 컬럼 변경 완료');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️  catch_companies.name 컬럼이 이미 존재하지 않거나 이미 변경됨');
      } else {
        throw error;
      }
    }

    // 2. catch_reviews 테이블의 company_name 컬럼을 company로 변경
    console.log('\n📝 catch_reviews.company_name -> company 변경 중...');
    try {
      await connection.execute('ALTER TABLE catch_reviews CHANGE COLUMN company_name company VARCHAR(255)');
      console.log('✅ catch_reviews 컬럼 변경 완료');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️  catch_reviews.company_name 컬럼이 이미 존재하지 않거나 이미 변경됨');
      } else {
        throw error;
      }
    }

    // 3. catch_interview_questions 테이블의 company_name 컬럼을 company로 변경
    console.log('\n📝 catch_interview_questions.company_name -> company 변경 중...');
    try {
      await connection.execute('ALTER TABLE catch_interview_questions CHANGE COLUMN company_name company VARCHAR(255)');
      console.log('✅ catch_interview_questions 컬럼 변경 완료');
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️  catch_interview_questions.company_name 컬럼이 이미 존재하지 않거나 이미 변경됨');
      } else {
        throw error;
      }
    }

    // 변경 확인
    console.log('\n🔍 변경 결과 확인 중...');

    const [companiesColumns] = await connection.execute(
      "SHOW COLUMNS FROM catch_companies WHERE Field = 'company'"
    );
    console.log('catch_companies.company:', companiesColumns.length > 0 ? '✅ 존재' : '❌ 없음');

    const [reviewsColumns] = await connection.execute(
      "SHOW COLUMNS FROM catch_reviews WHERE Field = 'company'"
    );
    console.log('catch_reviews.company:', reviewsColumns.length > 0 ? '✅ 존재' : '❌ 없음');

    const [questionsColumns] = await connection.execute(
      "SHOW COLUMNS FROM catch_interview_questions WHERE Field = 'company'"
    );
    console.log('catch_interview_questions.company:', questionsColumns.length > 0 ? '✅ 존재' : '❌ 없음');

    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

// 실행
runMigration();
