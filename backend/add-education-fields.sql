-- Add education, certificates, and awards fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN education JSON COMMENT '학력 정보: [{school: "", major: "", degree: "", start_date: "", end_date: "", status: "졸업/재학중"}]',
ADD COLUMN certificates JSON COMMENT '자격증 정보: [{name: "", issuer: "", date: ""}]',
ADD COLUMN awards JSON COMMENT '수상 경력: [{title: "", organization: "", date: "", description: ""}]';
