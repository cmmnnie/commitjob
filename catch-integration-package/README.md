# Catch 통합 패키지

## 포함된 파일

```
catch-integration-package/
├── INTEGRATION_REPORT.md       # 상세 통합 보고서
├── README.md                    # 이 파일
├── catch-service/               # Catch 스크래핑 서비스
│   ├── catch_scraper.py        # 메인 스크래퍼
│   └── requirements.txt        # Python 의존성
├── backend/                     # 백엔드 서버 (수정된 파일)
│   ├── server.js               # 메인 서버 (Catch 연동 포함)
│   ├── package.json
│   └── .env                    # 환경 변수
└── mcp-service/                # MCP GPT 추천 서비스
    ├── server.js               # MCP 서버
    ├── package.json
    └── .env                    # OpenAI API 키

```

## 빠른 시작

### 1. Catch 서비스 설정
```bash
cd catch-service
pip install -r requirements.txt
python catch_scraper.py
```

### 2. MCP 서비스 시작
```bash
cd mcp-service
npm install
node server.js
```

### 3. 백엔드 서버 시작
```bash
cd backend
npm install
node server.js
```

### 4. 테스트
```bash
curl "http://localhost:4001/api/main-recommendations?user_id=1&jobType=IT"
```

##  주요 변경사항

### backend/server.js
- Catch 서비스 연동 추가 (init, login, homepage-jobs)
- 로그인 후 3초 대기 (브라우저 안정화)
- 타임아웃 60초로 증가

### catch-service/catch_scraper.py
- Headless 모드 비활성화
- Page load strategy: eager
- 랜덤 디버그 포트 사용
- 상세 디버그 로깅 추가

##  중요 사항

1. **Catch 계정 필요**: test0137 / #test0808
2. **Chrome 브라우저 필수**: ChromeDriver 자동 다운로드
3. **포트**: 3000(Catch), 4001(백엔드), 4002(MCP)
4. **처리 시간**: 첫 요청 시 3-4분 소요


상세 내용은 INTEGRATION_REPORT.md 참고
