# 배포 가이드

## 자동 배포 설정 (권장)

### 1단계: Vercel 프로젝트 생성

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Add New" → "Project" 클릭
4. `cmmnnie/commitjob` 저장소 선택
5. 다음 설정 입력:
   - **Project Name**: `commitjob` (또는 원하는 이름)
   - **Framework Preset**: Vite
   - **Root Directory**: `kakao-login-app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. "Deploy" 클릭

### 2단계: Vercel 토큰 및 ID 가져오기

#### Vercel Token 발급
1. https://vercel.com/account/tokens 접속
2. "Create Token" 클릭
3. 토큰 이름 입력 (예: `github-actions`)
4. Scope: "Full Account" 선택
5. 생성된 토큰 복사 (한 번만 표시됨!)

#### Organization ID 확인
1. Vercel 대시보드에서 Settings → General
2. "Your ID" 섹션에서 확인

#### Project ID 확인
1. 생성한 프로젝트 선택
2. Settings → General
3. "Project ID" 복사

### 3단계: GitHub Secrets 설정

1. GitHub 저장소 페이지 접속: https://github.com/cmmnnie/commitjob
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭하여 다음 3개 추가:

**VERCEL_TOKEN**
```
복사한 Vercel 토큰 입력
```

**VERCEL_ORG_ID**
```
복사한 Organization ID 입력
```

**VERCEL_PROJECT_ID**
```
복사한 Project ID 입력
```

### 4단계: Railway 백엔드 환경변수 업데이트

1. Railway 대시보드 접속: https://railway.app
2. 백엔드 프로젝트 선택
3. Variables 탭 이동
4. `ALLOWED_ORIGINS` 환경변수에 Vercel 도메인 추가:
   ```
   https://commitjob.vercel.app,http://localhost:5500,http://localhost:3000
   ```
   (실제 Vercel 도메인으로 교체)

5. 변경사항 저장하면 자동으로 재배포됨

### 5단계: 테스트

1. 코드 수정 후 커밋:
   ```bash
   git add .
   git commit -m "Test auto deployment"
   git push origin main
   ```

2. GitHub Actions 확인:
   - https://github.com/cmmnnie/commitjob/actions
   - 워크플로우 실행 확인

3. 배포 완료 후 Vercel 도메인 접속하여 테스트

---

## 수동 배포 (대안)

### Vercel CLI 사용

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 디렉토리로 이동
cd kakao-login-app

# 배포
vercel --prod
```

---

## 배포 후 체크리스트

- [ ] Vercel 도메인 확인 (예: https://commitjob.vercel.app)
- [ ] Railway ALLOWED_ORIGINS에 Vercel 도메인 추가됨
- [ ] 카카오 로그인 버튼 클릭 테스트
- [ ] 로그인/로그아웃 플로우 테스트
- [ ] 백엔드 API 연결 확인

---

## 트러블슈팅

### GitHub Actions 실패 시
- Secrets가 올바르게 설정되었는지 확인
- Vercel 토큰이 유효한지 확인
- 빌드 로그 확인

### CORS 오류 발생 시
- Railway 백엔드의 ALLOWED_ORIGINS 확인
- Vercel 도메인이 정확히 추가되었는지 확인

### 카카오 로그인 실패 시
- 카카오 개발자 콘솔에서 Redirect URI에 Vercel 도메인 추가:
  - https://commitjob.vercel.app/callback
- 플랫폼 설정에 Vercel 도메인 추가

---

## 추가 정보

- **Vercel 대시보드**: https://vercel.com/dashboard
- **Railway 대시보드**: https://railway.app/dashboard
- **GitHub Actions**: https://github.com/cmmnnie/commitjob/actions
