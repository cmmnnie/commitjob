-- 컬럼명을 'company'로 통일
-- catch_companies: name -> company
-- catch_reviews: company_name -> company (이미 company일 수 있음)
-- catch_interview_questions: company_name -> company (이미 company일 수 있음)

-- catch_companies 테이블의 name 컬럼을 company로 변경
ALTER TABLE catch_companies CHANGE COLUMN name company VARCHAR(255);

-- catch_reviews 테이블의 company_name 컬럼을 company로 변경
ALTER TABLE catch_reviews CHANGE COLUMN company_name company VARCHAR(255);

-- catch_interview_questions 테이블의 company_name 컬럼을 company로 변경
ALTER TABLE catch_interview_questions CHANGE COLUMN company_name company VARCHAR(255);
