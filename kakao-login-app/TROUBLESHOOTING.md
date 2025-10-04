# 카카오 로그인 앱 - 문제 해결 가이드

## ✅ 해결된 문제들

### 1. `Failed to fetch` 오류
**원인:** `127.0.0.1`과 `localhost`는 브라우저에서 다른 도메인으로 인식됩니다.

**해결:**
- ❌ `http://127.0.0.1:5500/kakao-login-app/index.html`
- ✅ `http://localhost:5500/kakao-login-app/index.html`

**반드시 `localhost`로 접속하세요!**

---

### 2. `401 Unauthorized` 오류
**원인:** 도메인이 다르면 쿠키가 전송되지 않습니다.

**해결:**
- 프론트엔드: `http://localhost:5500`
- 백엔드: `http://localhost:4001`
- 둘 다 `localhost`를 사용해야 쿠키가 정상 전송됨

---

### 3. `Cannot GET /auth/callback` 오류
**원인:** 백엔드가 `/auth/callback`로 리다이렉트하는데 프론트엔드에 해당 경로가 없음

**해결:** 백엔드 리다이렉트 경로를 `/kakao-login-app/callback.html`로 수정
```javascript
res.redirect(`${origin}/kakao-login-app/callback.html?ok=1`);
```

---

### 4. `Cannot GET /index.html` 오류
**원인:** `callback.html`에서 상대 경로로 리다이렉트 시도

**해결:** 절대 경로 사용
```javascript
window.location.href = window.location.origin + '/kakao-login-app/index.html';
```

---

## 🚀 올바른 실행 방법

### 백엔드 실행:
```bash
cd backend
npm start
```

### 프론트엔드 실행:
```bash
cd kakao-login-app
npx http-server -p 5500 -c-1
```

또는 VS Code Live Server 사용

### 접속:
```
http://localhost:5500/kakao-login-app/index.html
```

⚠️ **중요:** `localhost`로 접속! (`127.0.0.1` 사용하지 말 것)

---

## 🔧 디버깅 도구

### 1. 백엔드 연결 테스트:
```
http://localhost:5500/kakao-login-app/test-connection.html
```

### 2. 쿠키 전송 테스트:
```
http://localhost:5500/kakao-login-app/cookie-test.html
```

### 3. 간단한 테스트:
```
http://localhost:5500/kakao-login-app/simple-test.html
```

---

## 📋 체크리스트

로그인이 안 되면 다음을 확인하세요:

- [ ] 백엔드 서버가 실행 중인가? (`http://localhost:4001/health`)
- [ ] `localhost`로 접속했는가? (주소창 확인)
- [ ] 브라우저 콘솔(F12)에 오류가 있는가?
- [ ] 백엔드 터미널에 오류 로그가 있는가?
- [ ] 브라우저 쿠키가 차단되어 있지 않은가?
- [ ] `.env` 파일에 카카오 API 키가 설정되어 있는가?

---

## 🌐 CORS 허용 목록 (백엔드)

백엔드 `.env` 파일의 `FRONTEND_ORIGIN`:
```
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,...
```

`http://127.0.0.1:5500`과 `http://localhost:5500` 모두 포함되어 있어야 합니다.

---

## 🔐 카카오 개발자 콘솔 설정

### Redirect URI 등록:
```
http://localhost:4001/auth/kakao/callback
http://localhost:5173/auth/kakao/callback
https://commitjob.site/auth/kakao/callback
```

### 웹 사이트 도메인:
```
http://localhost:5173
http://localhost:5500
https://commitjob.site
```

---

## 💡 Tips

### 브라우저 캐시/쿠키 삭제:
1. F12 → Application → Cookies
2. `localhost:4001` 및 `localhost:5500`의 모든 쿠키 삭제
3. 페이지 새로고침 (Ctrl+Shift+R)

### 백엔드 로그 확인:
로그인 시도 시 백엔드 터미널에서 다음 로그가 보여야 합니다:
```
[KAKAO-LOGIN-URL] Request origin: http://localhost:5500
[KAKAO-CALLBACK] Success! Redirecting to: http://localhost:5500/kakao-login-app/callback.html?ok=1
[KAKAO-CALLBACK] 쿠키 설정 완료: { httpOnly: true, sameSite: 'lax' }
```

### 프론트엔드 콘솔 확인:
```
[CALLBACK] 콜백 처리 시작
[CALLBACK] 사용자 정보 응답 상태: 200
[CALLBACK] 사용자 정보: { user: {...} }
```

---

## 🆘 여전히 문제가 있다면

1. 모든 서버 중지
2. 브라우저 완전히 종료
3. 백엔드 재시작
4. 브라우저 새로 열기
5. `http://localhost:5500/kakao-login-app/index.html` 접속
6. 개발자 도구(F12) 열어두고 로그인 시도
7. 콘솔 오류 확인
