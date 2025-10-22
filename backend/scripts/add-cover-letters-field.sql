-- 자기소개서 필드 추가
ALTER TABLE user_profiles
ADD COLUMN cover_letters JSON DEFAULT NULL
COMMENT '자기소개서 정보 (문항, 내용)';
