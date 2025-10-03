-- 코딩 테스트 플랫폼 테이블 생성

-- 1. 코딩 문제 테이블
CREATE TABLE IF NOT EXISTS coding_problems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  company_name VARCHAR(255),  -- 회사별 맞춤 문제를 위한 필드
  algorithm_type VARCHAR(100),  -- 알고리즘 유형 (예: 배열, 해시, DFS 등)
  time_limit INT DEFAULT 2000,  -- 시간 제한 (ms)
  memory_limit INT DEFAULT 256,  -- 메모리 제한 (MB)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company (company_name),
  INDEX idx_difficulty (difficulty),
  INDEX idx_algorithm (algorithm_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 테스트 케이스 테이블
CREATE TABLE IF NOT EXISTS test_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  problem_id INT NOT NULL,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT FALSE,  -- 샘플 케이스인지 여부
  is_hidden BOOLEAN DEFAULT FALSE,  -- 숨겨진 케이스인지 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
  INDEX idx_problem (problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 코드 제출 테이블
CREATE TABLE IF NOT EXISTS code_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  problem_id INT NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'javascript',  -- javascript, python, java 등
  status ENUM('pending', 'running', 'accepted', 'wrong_answer', 'time_limit', 'runtime_error', 'compile_error') DEFAULT 'pending',
  execution_time INT,  -- 실행 시간 (ms)
  memory_used INT,  -- 사용 메모리 (KB)
  passed_tests INT DEFAULT 0,  -- 통과한 테스트 케이스 수
  total_tests INT DEFAULT 0,  -- 전체 테스트 케이스 수
  error_message TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
  INDEX idx_user_problem (user_id, problem_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. AI 힌트 요청 테이블
CREATE TABLE IF NOT EXISTS hint_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  problem_id INT NOT NULL,
  current_code TEXT,
  hint_level INT DEFAULT 1,  -- 힌트 단계 (1: 작은 힌트, 2: 중간 힌트, 3: 큰 힌트)
  hint_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES coding_problems(id) ON DELETE CASCADE,
  INDEX idx_user_problem (user_id, problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. AI 코드 리뷰 테이블
CREATE TABLE IF NOT EXISTS code_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  review_content TEXT NOT NULL,  -- GPT가 생성한 리뷰 내용
  suggestions JSON,  -- 개선 제안 (JSON 형식)
  code_quality_score INT,  -- 코드 품질 점수 (1-100)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES code_submissions(id) ON DELETE CASCADE,
  INDEX idx_submission (submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 사용자 코딩 통계 테이블
CREATE TABLE IF NOT EXISTS user_coding_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  total_problems_attempted INT DEFAULT 0,
  total_problems_solved INT DEFAULT 0,
  easy_solved INT DEFAULT 0,
  medium_solved INT DEFAULT 0,
  hard_solved INT DEFAULT 0,
  weak_algorithms JSON,  -- 취약한 알고리즘 분야
  strong_algorithms JSON,  -- 강한 알고리즘 분야
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;