# Railway 배포 가이드 (단계별)

## 🎯 가장 쉬운 방법: Railway Dashboard 사용

### 준비물:
- GitHub 계정
- Railway 계정 (GitHub으로 로그인 가능)

---

## 📦 1. GitHub 리포지토리 생성 (필수)

### 옵션 A: GitHub Desktop 사용

1. **GitHub Desktop 다운로드:**
   ```
   https://desktop.github.com
   ```

2. **리포지토리 생성:**
   - File → New Repository
   - Name: `commitjob-backend`
   - Local Path: `C:\AI\mini\project`
   - Create Repository

3. **파일 추가 및 커밋:**
   - 좌측에서 변경된 파일 확인
   - Summary: `Initial commit: Backend with Kakao login`
   - Commit to main

4. **GitHub에 푸시:**
   - Publish repository
   - Keep this code private (선택)
   - Publish repository

### 옵션 B: 명령줄 사용

```bash
# 프로젝트 루트로 이동
cd C:\AI\mini\project

# Git 초기화
git init

# .gitignore 확인 (있어야 함)
# backend/.env가 제외되어 있는지 확인!

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: Backend with Kakao login"

# GitHub에서 새 리포지토리 생성 후
# (https://github.com/new)

# 리모트 추가
git remote add origin https://github.com/YOUR_USERNAME/commitjob-backend.git

# 푸시
git branch -M main
git push -u origin main
```

---

## 🚂 2. Railway 배포

### 2-1. Railway 회원가입

1. **Railway 사이트 접속:**
   ```
   https://railway.app
   ```

2. **Login with GitHub** 클릭

3. **GitHub 연동 허용**

### 2-2. 새 프로젝트 생성

1. **Dashboard에서 "New Project" 클릭**

2. **"Deploy from GitHub repo" 선택**

3. **GitHub 리포지토리 선택:**
   - `commitjob-backend` (또는 생성한 리포지토리명)

4. **"Deploy Now" 클릭**

### 2-3. Root Directory 설정 (중요!)

백엔드 코드가 `backend/` 폴더에 있으므로:

1. **Settings 탭 클릭**

2. **"Root Directory" 섹션 찾기**

3. **값 입력:**
   ```
   backend
   ```

4. **Save 클릭**

### 2-4. 환경 변수 설정

1. **Variables 탭 클릭**

2. **"Raw Editor" 버튼 클릭**

3. **다음 내용 붙여넣기:**

```bash
NODE_ENV=production
PORT=4001

# 프론트엔드 Origin (나중에 Vercel 도메인으로 업데이트)
FRONTEND_ORIGIN=http://localhost:5500,https://commitjob.site,https://www.commitjob.site

# Google OAuth (Google Cloud Console에서 발급)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/google/callback

# Kakao OAuth (카카오 개발자 콘솔에서 발급)
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
KAKAO_REDIRECT_URI=https://YOUR_RAILWAY_DOMAIN.railway.app/auth/kakao/callback

# JWT Secret - 아래 명령어로 생성한 랜덤 키 사용
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING

# AWS RDS Database
DB_HOST=database-1.czcg4o8cytan.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=appuser
DB_PASS=Woolim114!
DB_NAME=appdb

# MCP Services
MCP_INGEST_BASE=https://YOUR_RAILWAY_DOMAIN.railway.app
MCP_RECS_BASE=https://YOUR_RAILWAY_DOMAIN.railway.app
```

4. **Add 클릭**

### 2-5. JWT Secret 생성

**Windows PowerShell에서:**
```powershell
# 랜덤 문자열 생성
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

**또는 Node.js에서:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

생성된 문자열을 `JWT_SECRET`에 복사

### 2-6. Railway 도메인 확인

1. **Settings 탭 → Networking**

2. **Public Networking 섹션에서 도메인 확인:**
   ```
   https://YOUR_PROJECT_NAME.up.railway.app
   ```

3. **이 도메인을 복사해서:**
   - `KAKAO_REDIRECT_URI` 업데이트
   - `GOOGLE_REDIRECT_URI` 업데이트
   - `MCP_INGEST_BASE` 업데이트
   - `MCP_RECS_BASE` 업데이트

### 2-7. 재배포

환경 변수 변경 후:

1. **Deployments 탭**
2. **최신 배포에서 "..." 메뉴 클릭**
3. **"Redeploy" 선택**

또는 자동 재배포 대기 (1-2분)

### 2-8. 배포 확인

브라우저에서 접속:
```
https://YOUR_PROJECT_NAME.up.railway.app/health
```

정상 응답:
```json
{
  "status": "ok",
  "message": "Backend is healthy!"
}
```

---

## 🌐 3. 카카오 개발자 콘솔 업데이트

### 3-1. Redirect URI 추가

1. **카카오 개발자 콘솔 접속:**
   ```
   https://developers.kakao.com
   ```

2. **내 애플리케이션 → CommitJob 선택**

3. **카카오 로그인 → Redirect URI:**

   **기존:**
   ```
   http://localhost:4001/auth/kakao/callback
   ```

   **추가:**
   ```
   https://YOUR_PROJECT_NAME.up.railway.app/auth/kakao/callback
   ```

4. **저장**

### 3-2. 웹 사이트 도메인 추가

1. **플랫폼 → Web**

2. **사이트 도메인 추가:**
   ```
   https://YOUR_PROJECT_NAME.up.railway.app
   ```

3. **저장**

---

## ✅ 백엔드 배포 완료 체크리스트

- [ ] GitHub 리포지토리 생성 및 푸시
- [ ] Railway 프로젝트 생성
- [ ] Root Directory를 `backend`로 설정
- [ ] 환경 변수 모두 설정
- [ ] JWT_SECRET 랜덤 키로 변경
- [ ] Railway 도메인으로 Redirect URI 업데이트
- [ ] 재배포 완료
- [ ] `/health` 엔드포인트 확인
- [ ] 카카오 개발자 콘솔 Redirect URI 추가
- [ ] 카카오 개발자 콘솔 웹 도메인 추가

---

## 🐛 문제 해결

### 배포 실패: "Cannot find module"

**원인:** `package.json`이 없거나 경로가 잘못됨

**해결:**
1. Settings → Root Directory를 `backend`로 설정
2. 재배포

### 배포 실패: "Port already in use"

**원인:** PORT 환경 변수 미설정

**해결:**
Variables에 `PORT=4001` 추가

### 500 Internal Server Error

**원인:** 환경 변수 누락 또는 데이터베이스 연결 실패

**해결:**
1. Railway Dashboard → Deployments → Logs 확인
2. 누락된 환경 변수 추가
3. 데이터베이스 연결 정보 확인

### 데이터베이스 연결 실패

**원인:** AWS RDS 보안 그룹 설정

**해결:**
1. AWS RDS Console → 보안 그룹
2. 인바운드 규칙에 Railway IP 추가
3. 또는 0.0.0.0/0 (임시, 보안 주의!)

---

## 🎉 다음 단계

백엔드 배포가 완료되면:

1. **프론트엔드 배포** (Vercel)
2. **프론트엔드 config.js에 백엔드 URL 업데이트**
3. **전체 시스템 테스트**

---

## 📞 추가 도움

배포 중 문제가 생기면:

1. **Railway Logs 확인:**
   - Dashboard → Deployments → 최신 배포 클릭 → Logs

2. **환경 변수 확인:**
   - Variables 탭에서 모든 변수 설정 확인

3. **GitHub 리포지토리 확인:**
   - `.gitignore`에 `.env` 포함 확인
   - `backend/` 폴더에 `package.json` 존재 확인
