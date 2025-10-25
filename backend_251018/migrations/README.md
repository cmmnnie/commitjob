# 데이터베이스 마이그레이션 가이드

## 목적
Catch 테이블들의 회사명 컬럼을 모두 `company`로 통일

## 변경 내용
- `catch_companies.name` → `catch_companies.company`
- `catch_reviews.company_name` → `catch_reviews.company`
- `catch_interview_questions.company_name` → `catch_interview_questions.company`

## 실행 방법

### 방법 1: SQL 파일 직접 실행
AWS RDS 또는 MySQL 클라이언트에서 `rename_company_columns.sql` 파일을 실행하세요.

```bash
mysql -h your-host -u your-user -p your-database < rename_company_columns.sql
```

### 방법 2: MySQL Workbench 사용
1. MySQL Workbench에서 AWS RDS 연결
2. `rename_company_columns.sql` 파일 열기
3. 쿼리 실행

### 방법 3: Node.js 스크립트 사용 (Railway)
Railway 환경에서 실행:

```bash
cd backend
node migrations/run_migration.cjs
```

## SQL 명령어

```sql
-- catch_companies 테이블
ALTER TABLE catch_companies CHANGE COLUMN name company VARCHAR(255);

-- catch_reviews 테이블
ALTER TABLE catch_reviews CHANGE COLUMN company_name company VARCHAR(255);

-- catch_interview_questions 테이블
ALTER TABLE catch_interview_questions CHANGE COLUMN company_name company VARCHAR(255);
```

## 확인 방법

마이그레이션 후 다음 쿼리로 확인:

```sql
-- 컬럼 존재 확인
SHOW COLUMNS FROM catch_companies WHERE Field = 'company';
SHOW COLUMNS FROM catch_reviews WHERE Field = 'company';
SHOW COLUMNS FROM catch_interview_questions WHERE Field = 'company';

-- 데이터 확인
SELECT company FROM catch_companies LIMIT 5;
SELECT company FROM catch_reviews LIMIT 5;
SELECT company FROM catch_interview_questions LIMIT 5;
```

## 롤백 방법

만약 문제가 발생하면 다음 쿼리로 롤백:

```sql
-- 원상복구
ALTER TABLE catch_companies CHANGE COLUMN company name VARCHAR(255);
ALTER TABLE catch_reviews CHANGE COLUMN company company_name VARCHAR(255);
ALTER TABLE catch_interview_questions CHANGE COLUMN company company_name VARCHAR(255);
```

## 주의사항

⚠️ **반드시 프로덕션 실행 전에 백업하세요!**

```sql
-- 백업 생성
CREATE TABLE catch_companies_backup AS SELECT * FROM catch_companies;
CREATE TABLE catch_reviews_backup AS SELECT * FROM catch_reviews;
CREATE TABLE catch_interview_questions_backup AS SELECT * FROM catch_interview_questions;
```

## 마이그레이션 완료 후

1. 백엔드 API가 `company` 컬럼을 사용하도록 이미 업데이트됨
2. Railway에 푸시하면 자동으로 배포됨
3. 프론트엔드는 변경 필요 없음 (API 응답만 사용)
