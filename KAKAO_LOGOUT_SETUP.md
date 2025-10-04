# 카카오 로그아웃 Redirect URI 설정

로그아웃 후 자동 로그인을 방지하기 위해 카카오 개발자 콘솔에서 Logout Redirect URI를 설정해야 합니다.

## 설정 방법

### 1. 카카오 개발자 콘솔 접속
https://developers.kakao.com/console/app

### 2. 애플리케이션 선택

### 3. Logout Redirect URI 설정

**제품 설정 → 카카오 로그인 → Logout Redirect URI**

추가할 URI:
```
https://commitjob-frontend.vercel.app
http://localhost:5173
http://localhost:3000
```

⚠️ **주의사항:**
- 프로토콜(`https://` 또는 `http://`)을 정확히 입력
- 마지막에 슬래시(`/`) 없이 입력
- 프론트엔드 URL 사용

### 4. 저장

"저장" 버튼을 클릭하여 변경사항 저장

---

## 작동 방식

1. 사용자가 "로그아웃" 버튼 클릭
2. 백엔드 로그아웃 API 호출
3. localStorage 및 sessionStorage 삭제
4. 카카오 로그아웃 페이지로 리다이렉트:
   ```
   https://kauth.kakao.com/oauth/logout?client_id=YOUR_KEY&logout_redirect_uri=YOUR_FRONTEND_URL
   ```
5. 카카오에서 세션 완전 삭제
6. 설정한 Logout Redirect URI로 자동 리다이렉트
7. 다음 로그인 시 계정 선택 화면 표시

---

## 설정 확인

Logout Redirect URI가 올바르게 설정되었는지 확인:
1. 카카오 개발자 콘솔 → 제품 설정 → 카카오 로그인
2. "Logout Redirect URI" 섹션에 다음 URI가 있는지 확인:
   - `https://commitjob-frontend.vercel.app`
   - `http://localhost:5173`

---

## 트러블슈팅

### "Invalid logout_redirect_uri" 오류
- Logout Redirect URI가 카카오 개발자 콘솔에 등록되지 않음
- 위 설정 단계를 따라 URI 추가 필요

### 로그아웃 후에도 자동 로그인됨
- 브라우저 쿠키 확인 및 삭제
- 시크릿/프라이빗 모드에서 테스트
- Logout Redirect URI가 올바르게 설정되었는지 확인
