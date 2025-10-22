-- 경력 정보를 저장하기 위한 experiences 필드 추가
-- JSON 형식으로 저장: [{ company, location, start_date, end_date, is_current, position, rank, job_title, department, achievements }]

ALTER TABLE user_profiles
ADD COLUMN experiences JSON DEFAULT NULL
COMMENT '경력 정보 (회사명, 근무지역, 재직기간, 직무, 직급, 직책, 근무부서, 주요성과)';
