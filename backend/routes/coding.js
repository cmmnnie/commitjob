// ==============================================================================
// 코딩 테스트 API 라우터
// ==============================================================================

import express from 'express';
import axios from 'axios';

const router = express.Router();
const MCP_RECS_BASE = process.env.MCP_RECS_BASE || 'http://localhost:4002';

// 임시 user_id (인증 기능 구현 전까지 사용)
const TEMP_USER_ID = 1;

// ==============================================================================
// 1. 문제 생성 API
// ==============================================================================
router.post('/generate-problem', async (req, res) => {
  try {
    const { company_name, difficulty, algorithm_type } = req.body;
    const userId = TEMP_USER_ID;

    console.log('[CODING-TEST] 문제 생성 요청:', { company_name, difficulty, algorithm_type, userId });

    // MCP 서비스에서 GPT로 문제 생성
    const mcpResponse = await axios.post(`${MCP_RECS_BASE}/tools/generate_coding_problem`, {
      company_name,
      difficulty: difficulty || 'medium',
      algorithm_type: algorithm_type || '자료구조',
      user_profile: { user_id: userId }
    });

    const generatedProblem = mcpResponse.data.problem;

    // DB에 문제 저장
    const pool = req.app.get('pool');
    const [result] = await pool.execute(
      `INSERT INTO coding_problems
       (title, description, difficulty, company_name, algorithm_type, time_limit, memory_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedProblem.title,
        JSON.stringify({
          description: generatedProblem.description,
          inputFormat: generatedProblem.inputFormat,
          outputFormat: generatedProblem.outputFormat,
          constraints: generatedProblem.constraints,
          examples: generatedProblem.examples
        }),
        difficulty || 'medium',
        company_name,
        algorithm_type,
        generatedProblem.timeLimit || 2000,
        generatedProblem.memoryLimit || 256
      ]
    );

    const problemId = result.insertId;

    // 테스트 케이스 저장
    if (generatedProblem.testCases && generatedProblem.testCases.length > 0) {
      for (const testCase of generatedProblem.testCases) {
        await pool.execute(
          `INSERT INTO test_cases (problem_id, input, expected_output, is_sample)
           VALUES (?, ?, ?, ?)`,
          [problemId, testCase.input, testCase.expected_output, testCase.is_sample || false]
        );
      }
    }

    res.json({
      success: true,
      problem_id: problemId,
      problem: {
        id: problemId,
        ...generatedProblem
      }
    });

  } catch (error) {
    console.error('[CODING-TEST] 문제 생성 오류:', error);
    res.status(500).json({ error: '문제 생성 중 오류가 발생했습니다', details: error.message });
  }
});

// ==============================================================================
// 2. 문제 목록 조회 API
// ==============================================================================
router.get('/problems', async (req, res) => {
  try {
    const { company, difficulty, algorithm_type, limit = 20, offset = 0 } = req.query;

    let query = 'SELECT * FROM coding_problems WHERE 1=1';
    const params = [];

    if (company) {
      query += ' AND company_name = ?';
      params.push(company);
    }
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    if (algorithm_type) {
      query += ' AND algorithm_type = ?';
      params.push(algorithm_type);
    }

    const limitInt = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);
    query += ` ORDER BY created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;

    const pool = req.app.get('pool');
    const [problems] = await pool.execute(query, params);

    // JSON 필드 파싱
    const parsedProblems = problems.map(p => {
      try {
        const desc = typeof p.description === 'string' ? JSON.parse(p.description) : p.description;
        return { ...p, description: desc };
      } catch (e) {
        return p;
      }
    });

    res.json({
      success: true,
      problems: parsedProblems,
      count: problems.length
    });

  } catch (error) {
    console.error('[CODING-TEST] 문제 목록 조회 오류:', error);
    res.status(500).json({ error: '문제 목록 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 3. 특정 문제 조회 API
// ==============================================================================
router.get('/problems/:id', async (req, res) => {
  try {
    const problemId = req.params.id;
    const pool = req.app.get('pool');

    const [problems] = await pool.execute(
      'SELECT * FROM coding_problems WHERE id = ?',
      [problemId]
    );

    if (problems.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    const problem = problems[0];

    // description JSON 파싱
    try {
      problem.description = typeof problem.description === 'string'
        ? JSON.parse(problem.description)
        : problem.description;
    } catch (e) {
      console.error('Description 파싱 오류:', e);
    }

    // 테스트 케이스 조회 (샘플만)
    const [testCases] = await pool.execute(
      'SELECT * FROM test_cases WHERE problem_id = ? AND is_sample = TRUE',
      [problemId]
    );

    res.json({
      success: true,
      problem,
      testCases
    });

  } catch (error) {
    console.error('[CODING-TEST] 문제 조회 오류:', error);
    res.status(500).json({ error: '문제 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 4. 코드 제출 API
// ==============================================================================
router.post('/submit', async (req, res) => {
  try {
    const { problem_id, code, language = 'javascript' } = req.body;
    const userId = TEMP_USER_ID;

    console.log('[CODING-TEST] 코드 제출:', { problem_id, userId, language, code_length: code?.length });

    const pool = req.app.get('pool');

    // 제출 기록 저장
    const [result] = await pool.execute(
      `INSERT INTO code_submissions
       (user_id, problem_id, code, language, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, problem_id, code, language]
    );

    const submissionId = result.insertId;

    // 실제 코드 실행은 Judge0 API 연동 후 구현 예정
    // 현재는 제출만 저장

    res.json({
      success: true,
      submission_id: submissionId,
      status: 'pending',
      message: '코드가 제출되었습니다. 채점 중...'
    });

  } catch (error) {
    console.error('[CODING-TEST] 코드 제출 오류:', error);
    res.status(500).json({ error: '코드 제출 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 5. 힌트 요청 API
// ==============================================================================
router.post('/hint', async (req, res) => {
  try {
    const { problem_id, current_code, hint_level = 1 } = req.body;
    const userId = TEMP_USER_ID;

    console.log('[CODING-TEST] 힌트 요청:', { problem_id, userId, hint_level });

    const pool = req.app.get('pool');

    // 문제 정보 조회
    const [problems] = await pool.execute(
      'SELECT * FROM coding_problems WHERE id = ?',
      [problem_id]
    );

    if (problems.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    const problem = problems[0];
    const problemDescription = typeof problem.description === 'string'
      ? JSON.parse(problem.description)
      : problem.description;

    // MCP 서비스에서 GPT로 힌트 생성
    const mcpResponse = await axios.post(`${MCP_RECS_BASE}/tools/generate_hint`, {
      problem_description: JSON.stringify(problemDescription),
      user_code: current_code,
      hint_level
    });

    const hint = mcpResponse.data.hint;

    // 힌트 요청 기록 저장
    await pool.execute(
      `INSERT INTO hint_requests (user_id, problem_id, current_code, hint_level, hint_content)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problem_id, current_code, hint_level, hint]
    );

    res.json({
      success: true,
      hint,
      hint_level
    });

  } catch (error) {
    console.error('[CODING-TEST] 힌트 요청 오류:', error);
    res.status(500).json({ error: '힌트 생성 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 6. 코드 리뷰 요청 API
// ==============================================================================
router.post('/review', async (req, res) => {
  try {
    const { problem_id, code, language = 'javascript' } = req.body;
    const userId = TEMP_USER_ID;

    console.log('[CODING-TEST] 코드 리뷰 요청:', { problem_id, userId, language });

    const pool = req.app.get('pool');

    // 문제 정보 조회
    const [problems] = await pool.execute(
      'SELECT * FROM coding_problems WHERE id = ?',
      [problem_id]
    );

    if (problems.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    const problem = problems[0];
    const problemDescription = typeof problem.description === 'string'
      ? JSON.parse(problem.description)
      : problem.description;

    // MCP 서비스에서 GPT로 코드 리뷰
    const mcpResponse = await axios.post(`${MCP_RECS_BASE}/tools/review_code`, {
      problem_description: JSON.stringify(problemDescription),
      user_code: code,
      language
    });

    const review = mcpResponse.data.review;

    // 제출 ID 찾기 (가장 최근 제출)
    const [submissions] = await pool.execute(
      'SELECT id FROM code_submissions WHERE user_id = ? AND problem_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [userId, problem_id]
    );

    if (submissions.length > 0) {
      const submissionId = submissions[0].id;

      // 리뷰 저장
      await pool.execute(
        `INSERT INTO code_reviews (submission_id, review_content, suggestions, code_quality_score)
         VALUES (?, ?, ?, ?)`,
        [
          submissionId,
          review.summary || JSON.stringify(review),
          JSON.stringify(review.improvements || []),
          review.codeQualityScore || 70
        ]
      );
    }

    res.json({
      success: true,
      review
    });

  } catch (error) {
    console.error('[CODING-TEST] 코드 리뷰 오류:', error);
    res.status(500).json({ error: '코드 리뷰 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 7. 사용자 통계 조회 API
// ==============================================================================
router.get('/stats', async (req, res) => {
  try {
    const userId = TEMP_USER_ID;
    const pool = req.app.get('pool');

    const [stats] = await pool.execute(
      'SELECT * FROM user_coding_stats WHERE user_id = ?',
      [userId]
    );

    if (stats.length === 0) {
      // 통계가 없으면 초기화
      await pool.execute(
        'INSERT INTO user_coding_stats (user_id) VALUES (?)',
        [userId]
      );

      return res.json({
        success: true,
        stats: {
          user_id: userId,
          total_problems_attempted: 0,
          total_problems_solved: 0,
          easy_solved: 0,
          medium_solved: 0,
          hard_solved: 0,
          weak_algorithms: [],
          strong_algorithms: []
        }
      });
    }

    const userStats = stats[0];

    // JSON 필드 파싱
    try {
      userStats.weak_algorithms = typeof userStats.weak_algorithms === 'string'
        ? JSON.parse(userStats.weak_algorithms)
        : userStats.weak_algorithms;
      userStats.strong_algorithms = typeof userStats.strong_algorithms === 'string'
        ? JSON.parse(userStats.strong_algorithms)
        : userStats.strong_algorithms;
    } catch (e) {
      console.error('통계 JSON 파싱 오류:', e);
    }

    res.json({
      success: true,
      stats: userStats
    });

  } catch (error) {
    console.error('[CODING-TEST] 통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 8. 백준 문제 목록 조회 API (회사별)
// ==============================================================================
router.get('/baekjoon/companies', async (req, res) => {
  try {
    const pool = req.app.get('pool');

    const [companies] = await pool.execute(
      'SELECT * FROM companies ORDER BY name'
    );

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    console.error('[CODING-TEST] 회사 목록 조회 오류:', error);
    res.status(500).json({ error: '회사 목록 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 9. 백준 문제 목록 조회 API (회사별 필터링)
// ==============================================================================
router.get('/baekjoon/problems', async (req, res) => {
  try {
    const { company, difficulty, limit = 20, offset = 0 } = req.query;
    const pool = req.app.get('pool');

    let query = `
      SELECT p.*, c.name as company_name
      FROM baekjoon_problems p
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (company) {
      query += ' AND c.name = ?';
      params.push(company);
    }
    if (difficulty) {
      query += ' AND p.difficulty = ?';
      params.push(difficulty);
    }

    const limitInt = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);
    query += ` ORDER BY p.created_at DESC LIMIT ${limitInt} OFFSET ${offsetInt}`;

    const [problems] = await pool.execute(query, params);

    res.json({
      success: true,
      problems,
      count: problems.length
    });

  } catch (error) {
    console.error('[CODING-TEST] 백준 문제 목록 조회 오류:', error);
    res.status(500).json({ error: '백준 문제 목록 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 10. 백준 특정 문제 조회 API (백준 문제 번호로 조회)
// ==============================================================================
router.get('/baekjoon/problems/:problemId', async (req, res) => {
  try {
    const { problemId } = req.params;
    const pool = req.app.get('pool');

    const [problems] = await pool.execute(
      `SELECT p.*, c.name as company_name
       FROM baekjoon_problems p
       LEFT JOIN companies c ON p.company_id = c.id
       WHERE p.problem_id = ?`,
      [problemId]
    );

    if (problems.length === 0) {
      return res.status(404).json({ error: '문제를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      problem: problems[0]
    });

  } catch (error) {
    console.error('[CODING-TEST] 백준 문제 조회 오류:', error);
    res.status(500).json({ error: '백준 문제 조회 중 오류가 발생했습니다' });
  }
});

// ==============================================================================
// 11. 회사별 백준 문제 조회 API
// ==============================================================================
router.get('/baekjoon/companies/:companyName/problems', async (req, res) => {
  try {
    const { companyName } = req.params;
    const pool = req.app.get('pool');

    const [problems] = await pool.execute(
      `SELECT p.*, c.name as company_name
       FROM baekjoon_problems p
       JOIN companies c ON p.company_id = c.id
       WHERE c.name = ?
       ORDER BY p.problem_id`,
      [companyName]
    );

    res.json({
      success: true,
      company: companyName,
      problems,
      count: problems.length
    });

  } catch (error) {
    console.error('[CODING-TEST] 회사별 백준 문제 조회 오류:', error);
    res.status(500).json({ error: '회사별 문제 조회 중 오류가 발생했습니다' });
  }
});

export default router;