-- Add languages field to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN languages JSON COMMENT '어학 정보: [{language: "", level: "", score: "", date: ""}]';
