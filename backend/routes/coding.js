// 코딩 테스트 API - 간단하고 명확하게 새로 작성
import express from 'express';

const router = express.Router();

// 1. 회사 목록 및 문제 수 조회
router.get('/companies', async (req, res) => {
  try {
    console.log('[CODING] 회사 목록 조회 시작');
    const pool = req.app.get('pool');

    const [rows] = await pool.execute(`
      SELECT company, COUNT(*) as count
      FROM company_workbook_problem
      GROUP BY company
      ORDER BY company
    `);

    console.log('[CODING] 조회 결과:', rows);
    res.json({ success: true, companies: rows });
  } catch (error) {
    console.error('[CODING] 회사 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. 특정 회사의 문제 목록 조회
router.get('/problems', async (req, res) => {
  try {
    const { company } = req.query;
    console.log('[CODING] 문제 목록 조회 시작:', company);

    const pool = req.app.get('pool');

    let query = 'SELECT * FROM company_workbook_problem';
    let params = [];

    if (company) {
      query += ' WHERE company = ?';
      params.push(company);
    }

    query += ' ORDER BY problem_number';

    const [rows] = await pool.execute(query, params);
    console.log('[CODING] 문제 목록:', rows.length, '개');

    res.json({ success: true, problems: rows });
  } catch (error) {
    console.error('[CODING] 문제 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. 문제 상세 정보 조회
router.get('/problem/:number', async (req, res) => {
  try {
    const { number } = req.params;
    console.log('[CODING] 문제 상세 조회:', number);

    const pool = req.app.get('pool');

    const [rows] = await pool.execute(
      'SELECT * FROM problem_detail WHERE problem_number = ?',
      [number]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '문제를 찾을 수 없습니다' });
    }

    console.log('[CODING] 문제 상세 조회 완료');
    res.json({ success: true, detail: rows[0] });
  } catch (error) {
    console.error('[CODING] 문제 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
