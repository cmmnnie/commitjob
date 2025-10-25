import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import '../style/problem.scss';
import { Editor } from '@monaco-editor/react';
import { useLocation } from 'react-router-dom';
import Modal from '../component/modal';

function Problem() {
  const base = process.env.REACT_APP_CODINGTEST_BASE_URL;
  const location = useLocation();

  const [problem, setProblem] = useState(location?.state); //백문 문제
  // const samples = JSON.parse(problem?.samples_json); //백준 입출력 예시

  let samples = [];

  try {
    if (problem?.samples_json) {
      samples = JSON.parse(problem.samples_json);
    }
  } catch (e) {
    console.error('Invalid JSON in samples_json:', e);
    samples = []; // fallback
  }

  const [code, setCode] = useState(''); //코드 작성
  const [answer, setAnswer] = useState(''); //코드 제출 응답
  const [feedback, setFeedback] = useState('코드 작성 후, 피드백 요청시 보여집니다.'); //피드백 응답
  const [option, setOption] = useState('question'); //챕터 선택
  const [newProblem, setNewProblem] = useState(''); //새로운 문제 응답
  const [codeLoading, setCodeLoading] = useState(false); //코드 제출 대기
  const [feedbackLoading, setFeedbackLoading] = useState(false); //피드백 대기
  const [newLoading, setNewLoading] = useState(false); //새로운 문제 대기

  const [showAssist, setShowAssist] = useState(false);
  const [buttonPos, setButtonPos] = useState(null); // 버튼 위치 저장
  const [selectedText, setSelectedText] = useState(''); // 선택된 코드 저장
  const [prevSelectedText, setPrevSelectedText] = useState(''); //이전 선택된 코드와 비교

  const [messages, setMessages] = useState([{ sender: 'system', text: '해당 코드에 대한 질문을 작성해주세요.' }]);
  const [question, setQuestion] = useState(''); //어시스턴트 사용자 질문

  const [id, setId] = useState(problem?.problem_id);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [showPrompt, setShowPrompt] = useState(false); //자동생성 입력창
  const [prompt, setPrompt] = useState(''); //자동생성 사용자 질문
  const [promptPos, setPromptPos] = useState({ top: 0, left: 0 });

  // ====== 어시스턴트 액티브 감지 ======
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // cmd+i 으로 입력창 띄우기
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      setShowPrompt((prev) => !prev);
    });

    // 드래그 종료 시 (마우스 뗄 때)
    editor.onMouseUp((e) => {
      const selection = editor.getSelection();
      if (!selection) return;

      const text = editor.getModel().getValueInRange(selection);

      // 드래그된 코드가 있는 경우
      if (text.trim()) {
        const event = e.event.browserEvent; // 원래 브라우저 이벤트
        const { clientX, clientY } = event; // 실제 화면 좌표

        // 커서 근처에 버튼 표시
        setButtonPos({
          top: clientY, // 커서 위쪽 약간
          left: clientX + 10, // 오른쪽 약간
        });

        setSelectedText(text);
      } else {
        setButtonPos(null);
        setSelectedText('');
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      const position = editor.getPosition(); // 커서 위치 (lineNumber, column)
      const cursorCoords = editor.getScrolledVisiblePosition(position); // 좌표 변환

      if (cursorCoords) {
        const editorDomNode = editor.getDomNode();
        const editorRect = editorDomNode.getBoundingClientRect();

        // 커서 위치를 실제 화면 좌표로 변환
        const top = editorRect.top + cursorCoords.top;
        const left = editorRect.left + cursorCoords.left;

        // 입력창 위치 설정
        setPromptPos({ top, left });
        setShowPrompt((prev) => !prev);
      }
    });
  };

  // ====== 코드 생성 키눌림 감지 ======
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowPrompt((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ====== 코드 생성 입력 위치 감지 ======
  const insertAtCursor = (newCode) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const position = editor.getPosition();
    editor.executeEdits('', [
      {
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: newCode + '\n',
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  };

  // ====== 코드 생성 요청 ======
  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setShowPrompt(false);

    try {
      // const res = await axios.post("/api/generate-code", { prompt });
      // const aiCode = res.data.code || "# (AI 응답 없음)";
      const aiCode = 'test generate code';
      insertAtCursor(aiCode);
      setPrompt('');
    } catch (err) {
      console.error('AI 응답 실패:', err);
    }
  };

  // ====== 어시스턴트 제출 ======
  const postAssist = async () => {
    if (!question.trim()) return;

    // 🧍‍♀️ 사용자 메시지 추가
    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setQuestion('');

    // 💬 "잠시만 기다려주세요..." 메시지 추가
    setMessages((prev) => [...prev, { sender: 'assistant', text: '잠시만 기다려주세요...' }]);

    try {
      const res = await axios.post(`${base}/assist`, {
        problem_id: id,
        question: question,
        selectedText,
        problem_text: 'problem_text',
      });
      console.log(selectedText);

      // ✅ 마지막 "잠시만 기다려주세요..." 메시지를 실제 응답으로 교체
      setMessages((prev) => [
        ...prev.slice(0, prev.length - 1),
        { sender: 'assistant', text: res.data.answer || '응답을 받을 수 없습니다.' },
      ]);
    } catch (err) {
      console.error(err);

      // ❌ 오류 발생 시 "잠시만 기다려주세요..." → 오류 메시지로 교체
      setMessages((prev) => [
        ...prev.slice(0, prev.length - 1),
        { sender: 'assistant', text: '서버 요청 중 오류가 발생했습니다.' },
      ]);
    }
  };

  // ====== 코드 제출 ======
  const postCode = async () => {
    if (!code) return;
    if (answer) setAnswer('');

    try {
      setCodeLoading(true);
      const res = await axios.post(`${base}/submit`, {
        problem_id: id,
        code: code,
      });

      setAnswer(res.data);
      setCodeLoading(false);
    } catch (err) {
      console.log(err);
      setCodeLoading(false);
      alert('잠시 후에 다시 요청해주세요.');
    }
  };

  // ====== 피드백 요청 ======
  const getFeedback = async () => {
    if (!code) return;

    try {
      setFeedbackLoading(true);
      const res = await axios.post(`${base}/feedback`, { problem_id: id, code: code });
      setFeedback(res.data.feedback);
      setOption('feedback');
      setAnswer('');
      setFeedbackLoading(false);
    } catch (err) {
      console.log(err);
      setFeedbackLoading(false);
      alert('잠시 후에 다시 요청해주세요.');
    }
  };

  const sections = feedback ? feedback.split(/\n(?=[가-힣]+\s*\(?.*?\)?\s*-\s*)/) : [];

  // ====== 새로운 문제 생성 ======
  const postNewProblem = async () => {
    if (feedback === '코드 작성 후, 피드백 요청시 보여집니다.') return;

    try {
      setNewLoading(true);

      const res = await axios.post(`${base}/new_problem`, { feedback: 'feedback' });
      setCode('');
      setAnswer('');
      setFeedback('코드 작성 후, 피드백 요청시 보여집니다.');
      setOption('question');
      setId(0);
      setNewProblem(res.data.problem);
      setNewLoading(false);
    } catch (err) {
      console.log(err);
      setNewLoading(false);
      alert('잠시 후에 다시 요청해주세요.');
    }
  };

  return (
    <div className="problem">
      <div className="left-container">
        {/* 옵션 선택 영역 */}
        <div className="option-select">
          <div
            className={`option-select-item ${option === 'question' ? 'select' : ''}`}
            onClick={() => setOption('question')}
          >
            문제
          </div>
          <div
            className={`option-select-item ${option === 'feedback' ? 'select' : ''}`}
            onClick={() => setOption('feedback')}
          >
            피드백
          </div>
          <div
            className={`option-select-item ${option === 'assist' ? 'select' : ''}`}
            onClick={() => setOption('assist')}
          >
            어시스턴트
          </div>
        </div>

        {option === 'question' &&
          (newProblem ? (
            <div className="questionBox">{newProblem}</div>
          ) : (
            <div className="questionBox">
              <div className="question-info">
                <div className="question-id">{problem?.problem_id}</div>
                <div className="question-title">{problem?.title}</div>
              </div>

              <div className="question-limit">
                <div className="question-limit-header">
                  <div>시간제한</div>
                  <div>메모리제한</div>
                  <div>제출</div>
                  <div>정답</div>
                  <div>맞힌사람</div>
                  <div>정답비율</div>
                </div>
                <div className="question-limit-body">
                  <div>{problem?.time_limit}</div>
                  <div>{problem?.memory_limit}</div>
                  <div>{problem?.submissions}</div>
                  <div>{problem?.accepted}</div>
                  <div>{problem?.solved_people}</div>
                  <div>{problem?.ratio}</div>
                </div>
              </div>

              <h2>문제</h2>
              <div dangerouslySetInnerHTML={{ __html: problem?.description_html }} />
              <h2>입력</h2>
              <div dangerouslySetInnerHTML={{ __html: problem?.input_html }} />
              <h2>출력</h2>
              <div dangerouslySetInnerHTML={{ __html: problem?.output_html }} />

              <div>
                {samples.map((sample, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: '20px',
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'space-evenly',
                    }}
                  >
                    <div>
                      <h3>예제 입력</h3>
                      <pre>{sample.input}</pre>
                    </div>
                    <div>
                      <h3>예제 출력</h3>
                      <pre>{sample.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
              <div dangerouslySetInnerHTML={{ __html: problem?.source_html }} />
            </div>
          ))}

        {option === 'feedback' && (
          <div className="feedbackBox">
            {sections.map((section, idx) => {
              const [firstLine, ...rest] = section.split('\n');
              const restContent = rest.join('\n').trim();

              return (
                <div key={idx} className="response-section">
                  <p className="response-content">
                    <strong>{firstLine}</strong>
                    <br />
                    {restContent}
                  </p>
                </div>
              );
            })}
            {feedback !== '코드 작성 후, 피드백 요청시 보여집니다.' && (
              <div
                className={`code-btn-new ${feedback === '코드 작성 후, 피드백 요청시 보여집니다.' ? '' : 'active'}`}
                onClick={postNewProblem}
              >
                피드백 기반으로 새로운 문제 생성하기
              </div>
            )}
          </div>
        )}

        {option === 'assist' &&
          (showAssist ? (
            <div className="assistBox">
              <div className="assist-content">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`message ${msg.sender}`}
                    style={{
                      textAlign: msg.sender === 'user' ? 'right' : 'left',
                      margin: '8px 0',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        background: msg.sender === 'user' ? '#73946B' : '#eee',
                        color: msg.sender === 'user' ? 'white' : 'black',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        maxWidth: '70%',
                      }}
                    >
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="assist-textarea">
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
                <button onClick={postAssist}>전송</button>
              </div>
            </div>
          ) : (
            <div className="assistBox">
              <div className="response-section">코드를 선택 해주세요</div>
            </div>
          ))}
      </div>

      <div className="right-container" style={{ position: 'relative' }}>
        <div className="codeBox">
          <Editor
            width="49vw"
            height="55vh"
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorMount}
            defaultLanguage="python"
            options={{
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 18,
              readOnly: false,
              tabSize: 2,
              insertSpaces: true,
            }}
          />

          {buttonPos && (
            <button
              className="floating-run-btn"
              style={{
                position: 'fixed',
                top: `${buttonPos.top}px`,
                left: `${buttonPos.left}px`,
                background: '#C71E64',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '13px',
                fontFamily: 'SansMid',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                transition: 'background 0.2s ease',
                zIndex: 1000,
              }}
              onClick={() => {
                setOption('assist');
                console.log(selectedText);
                if (selectedText !== prevSelectedText) {
                  setMessages([{ sender: 'assistant', text: '선택된 코드에 대해 질문을 입력해주세요.' }]);
                  setPrevSelectedText(selectedText);
                }
                setShowAssist(true);
                setButtonPos(null);
              }}
            >
              어시스턴트로 질문하기
            </button>
          )}

          <div className="codeBox-bottom">
            <div>ctrl + i 를 누르면 코드 자동 생성을 시작할 수 있습니다.</div>
            <div className="code-btn-send" onClick={postCode}>
              코드 제출하기
            </div>
          </div>
        </div>

        <div className="answerBox">
          {answer.detail}
          {answer.result === '오답' && (
            <div className="code-btn-feedback" onClick={getFeedback}>
              피드백 받기
            </div>
          )}
        </div>

        <Modal isOpen={codeLoading} setIsOpen={setCodeLoading}>
          코드 확인 중입니다. <br />
          잠시만 기다려주세요.
        </Modal>
        <Modal isOpen={feedbackLoading} setIsOpen={setFeedbackLoading}>
          피드백 생성 중입니다. <br />
          잠시만 기다려주세요.
        </Modal>
        <Modal isOpen={newLoading} setIsOpen={setNewLoading}>
          피드백 기반으로 새로운 문제를 생성 중입니다. <br />
          잠시만 기다려주세요.
        </Modal>
      </div>
    </div>
  );
}

export default Problem;
