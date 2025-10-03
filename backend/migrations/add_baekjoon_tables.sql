-- 백준 문제 수집을 위한 테이블 추가
-- appdb에 cote 관련 테이블 생성

USE appdb;

-- 회사 테이블 (기업별 코딩테스트 문제)
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 백준 문제 테이블 (크롤링된 문제 저장)
CREATE TABLE IF NOT EXISTS baekjoon_problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    time_limit VARCHAR(50),
    memory_limit VARCHAR(50),
    difficulty VARCHAR(50),
    source VARCHAR(100),
    url VARCHAR(500),
    company_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_problem_id (problem_id),
    INDEX idx_company (company_id),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 문제 분류 테이블 (알고리즘 유형별 분류)
CREATE TABLE IF NOT EXISTS baekjoon_problem_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_id INT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (problem_id) REFERENCES baekjoon_problems(id) ON DELETE CASCADE,
    INDEX idx_problem (problem_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 회사 데이터 삽입
INSERT IGNORE INTO companies (name, description) VALUES
('삼성', '삼성전자 코딩테스트 기출문제'),
('카카오', '카카오 코딩테스트 기출문제'),
('네이버', '네이버 코딩테스트 기출문제'),
('LG', 'LG 코딩테스트 기출문제'),
('현대자동차', '현대자동차 코딩테스트 기출문제'),
('라인', '라인 코딩테스트 기출문제'),
('쿠팡', '쿠팡 코딩테스트 기출문제'),
('배달의민족', '배달의민족 코딩테스트 기출문제');
