# CommitJob

AI 채용 추천 플랫폼 - 카카오 소셜 로그인 기반

## 프로젝트 구조

```
commitjob/
├── kakao-login-app/    # Frontend (React + Vite)
└── backend/            # Backend (Express + PostgreSQL)
```

## 기술 스택

### Frontend
- React 19
- React Router DOM
- Vite
- CSS3

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Kakao OAuth 2.0

## 배포

### Frontend (Vercel)
- **자동 배포**: main 브랜치에 push하면 자동으로 Vercel에 배포됩니다
- **수동 배포**: Vercel 대시보드에서 수동 배포 가능
- **URL**: 배포 후 생성된 Vercel 도메인

### Backend (Railway)
- **배포 URL**: https://commitjob-backend.up.railway.app
- **자동 배포**: GitHub 연동 시 자동 배포

## 환경 설정

### Vercel (Frontend)
GitHub Actions에서 자동 배포를 위해 다음 Secrets 설정 필요:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 secrets 추가:
   - `VERCEL_TOKEN`: Vercel 개인 토큰
   - `VERCEL_ORG_ID`: Vercel Organization ID
   - `VERCEL_PROJECT_ID`: Vercel Project ID

**Vercel 토큰 발급 방법**:
1. https://vercel.com/account/tokens
2. "Create Token" 클릭
3. 토큰 복사하여 GitHub Secrets에 추가

**Organization ID & Project ID 확인**:
1. Vercel에서 프로젝트 생성 후
2. Settings → General에서 확인

### Railway (Backend)
필요한 환경변수:
- `DATABASE_URL`: PostgreSQL 연결 URL
- `KAKAO_CLIENT_ID`: 카카오 REST API 키
- `KAKAO_CLIENT_SECRET`: 카카오 Client Secret
- `JWT_SECRET`: JWT 서명용 비밀키
- `ALLOWED_ORIGINS`: CORS 허용 도메인 (Vercel 도메인 포함)

## 로컬 개발

### Frontend
```bash
cd kakao-login-app
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm start
```

## 배포 워크플로우

1. 코드 수정 후 commit
2. `git push origin main`
3. GitHub Actions가 자동으로 Vercel에 배포
4. Railway는 자동으로 백엔드 재배포 (GitHub 연동 시)

## 라우팅

- `/` - 메인 로그인 페이지
- `/callback` - 카카오 OAuth 콜백
- `/cookie-test` - 쿠키 전송 테스트
- `/simple-test` - 백엔드 연결 테스트
- `/test-connection` - 상세 연결 테스트

## 라이선스

MIT
