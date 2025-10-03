// ==============================================================================
// 프로그래머스 문제 API
// ==============================================================================

import express from 'express';

const router = express.Router();

// 프로그래머스 회사 목록 조회
router.get('/companies', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const [companies] = await pool.execute(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.description,
        COUNT(pp.id) as problem_count
      FROM companies c
      INNER JOIN programmers_problems pp ON pp.company_id = c.id
      GROUP BY c.id, c.name, c.description
      ORDER BY problem_count DESC
    `);

    res.json({
      success: true,
      data: companies
    });

  } catch (error) {
    console.error('프로그래머스 회사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '회사 목록 조회에 실패했습니다.'
    });
  }
});

// 프로그래머스 문제 목록 조회 (필터링 + 페이징)
router.get('/problems', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const {
      company,      // 회사명 필터 (예: '카카오')
      difficulty,   // 난이도 필터 (예: 'Level 1', 'Level 2')
      page = 1,
      limit = 20
    } = req.query;

    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const offset = (pageInt - 1) * limitInt;

    // WHERE 조건 동적 구성
    const conditions = [];
    const params = [];

    if (company) {
      conditions.push('c.name = ?');
      params.push(company);
    }

    if (difficulty) {
      conditions.push('pp.difficulty = ?');
      params.push(difficulty);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 문제 목록 조회
    const query = `
      SELECT
        pp.id,
        pp.problem_id,
        pp.title,
        pp.difficulty,
        pp.url,
        pp.source,
        c.name as company_name,
        c.id as company_id,
        pp.created_at
      FROM programmers_problems pp
      INNER JOIN companies c ON c.id = pp.company_id
      ${whereClause}
      ORDER BY pp.created_at DESC
      LIMIT ${limitInt} OFFSET ${offset}
    `;

    const [problems] = await pool.execute(query, params);

    // 전체 개수 조회
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM programmers_problems pp
      INNER JOIN companies c ON c.id = pp.company_id
      ${whereClause}
    `, params);

    const total = countResult[0].total;

    res.json({
      success: true,
      data: problems,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt)
      }
    });

  } catch (error) {
    console.error('프로그래머스 문제 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '문제 목록 조회에 실패했습니다.'
    });
  }
});

// 프로그래머스 특정 문제 상세 조회
router.get('/problems/:problemId', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { problemId } = req.params;

    const [problems] = await pool.execute(`
      SELECT
        pp.id,
        pp.problem_id,
        pp.title,
        pp.difficulty,
        pp.url,
        pp.metadata,
        pp.source,
        c.name as company_name,
        c.id as company_id,
        pp.created_at
      FROM programmers_problems pp
      INNER JOIN companies c ON c.id = pp.company_id
      WHERE pp.problem_id = ?
    `, [problemId]);

    if (problems.length === 0) {
      return res.status(404).json({
        success: false,
        error: '문제를 찾을 수 없습니다.'
      });
    }

    const problem = problems[0];

    // metadata JSON 파싱
    if (problem.metadata && typeof problem.metadata === 'string') {
      try {
        problem.metadata = JSON.parse(problem.metadata);
      } catch (e) {
        problem.metadata = {};
      }
    }

    res.json({
      success: true,
      data: problem
    });

  } catch (error) {
    console.error('프로그래머스 문제 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '문제 조회에 실패했습니다.'
    });
  }
});

// 프로그래머스 난이도 목록 조회
router.get('/difficulties', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const [difficulties] = await pool.execute(`
      SELECT DISTINCT
        difficulty,
        COUNT(*) as count
      FROM programmers_problems
      GROUP BY difficulty
      ORDER BY
        CASE difficulty
          WHEN 'Level 1' THEN 1
          WHEN 'Level 2' THEN 2
          WHEN 'Level 3' THEN 3
          WHEN 'Level 4' THEN 4
          WHEN 'Level 5' THEN 5
          ELSE 99
        END
    `);

    res.json({
      success: true,
      data: difficulties
    });

  } catch (error) {
    console.error('난이도 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '난이도 목록 조회에 실패했습니다.'
    });
  }
});

// 프로그래머스 통계 조회
router.get('/stats', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    // 전체 문제 수
    const [totalCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM programmers_problems'
    );

    // 회사별 문제 수
    const [companyStats] = await pool.execute(`
      SELECT
        c.name,
        COUNT(pp.id) as count
      FROM companies c
      INNER JOIN programmers_problems pp ON pp.company_id = c.id
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `);

    // 난이도별 문제 수
    const [difficultyStats] = await pool.execute(`
      SELECT
        difficulty,
        COUNT(*) as count
      FROM programmers_problems
      GROUP BY difficulty
      ORDER BY
        CASE difficulty
          WHEN 'Level 1' THEN 1
          WHEN 'Level 2' THEN 2
          WHEN 'Level 3' THEN 3
          WHEN 'Level 4' THEN 4
          WHEN 'Level 5' THEN 5
          ELSE 99
        END
    `);

    res.json({
      success: true,
      data: {
        totalProblems: totalCount[0].total,
        byCompany: companyStats,
        byDifficulty: difficultyStats
      }
    });

  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '통계 조회에 실패했습니다.'
    });
  }
});

export default router;
