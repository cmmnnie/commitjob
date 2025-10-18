import axios from 'axios';
import { useEffect, useState } from 'react';
import '../style/codeList.scss';
import { useNavigate } from 'react-router-dom';

function CodeList() {
  const base = process.env.REACT_APP_CODINGTEST_BASE_URL;

  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  useEffect(() => {
    const getList = async () => {
      try {
        const res = await axios.get(`${base}/problems?company=${'삼성페이'}`);
        // const res = await axios.get(`${base}/problems?company=${encodeURIComponent('토스')}`);

        console.log(res);
        setName(res.data.company);
        setList(res.data.problems);
      } catch (err) {
        console.log(err);
      }
    };

    getList();
  }, []);

  const getListDetail = async (id) => {
    try {
      const res = await axios.get(`${base}/problem/details?problem_id=${id}`);
      console.log(res);
      nav(`/codeproblem/${id}`, { state: res.data });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="problem-list">
      <div className="problem-list-company">{name} 코딩 테스트 </div>
      <div className="testList-item-header">
        <div>문제 번호</div>
        <div>제목</div>
        <div>정답 비율</div>
        <div>정답 수</div>
        <div>제출 수</div>
        <div>기타</div>
      </div>
      <div className="testList">
        {list?.map((q) => (
          <div className="testList-item" key={q.problem_id} onClick={() => getListDetail(q.problem_id)}>
            <div className="testList-item-id">{q.problem_id}</div>
            <div className="testList-item-title">{q.title}</div>

            <div className="testList-item-ratio">{q.ratio}</div>
            <div className="testList-item-solve-cnt">{q.solved_count}</div>
            <div className="testList-item-submit-cnt">{q.submission_count}</div>
            {q.info && <div className="testList-item-info">{q.info}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CodeList;
