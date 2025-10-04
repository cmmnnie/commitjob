# 카카오 개발자 콘솔 설정 가이드

## 배포된 도메인
- **프론트엔드**: https://commitjob-frontend.vercel.app
- **백엔드**: https://commitjob-backend.up.railway.app

---

## 카카오 개발자 콘솔 설정

### 1. 카카오 개발자 콘솔 접속
https://developers.kakao.com/console/app

### 2. 애플리케이션 선택
기존 앱을 선택하거나 새로 생성

---

## 필수 설정 항목

### ✅ 1. 플랫폼 설정

**내 애플리케이션 → 앱 설정 → 플랫폼 → Web 플랫폼 등록**

추가할 도메인:
```
https://commitjob-frontend.vercel.app
http://localhost:5173
http://localhost:3000
```

![플랫폼 설정](https://i.imgur.com/example.png)

---

### ✅ 2. Redirect URI 설정

**내 애플리케이션 → 제품 설정 → 카카오 로그인 → Redirect URI**

추가할 URI:
```
https://commitjob-backend.up.railway.app/auth/kakao/callback
http://localhost:4001/auth/kakao/callback
```

⚠️ **주의사항:**
- 프로토콜(`https://` 또는 `http://`)을 정확히 입력
- 마지막에 슬래시(`/`) 없이 입력
- 백엔드 URL 사용 (프론트엔드 아님!)

---

### ✅ 3. 카카오 로그인 활성화

**제품 설정 → 카카오 로그인**

- **활성화 설정**: ON
- **OpenID Connect 활성화**: ON (선택)

---

### ✅ 4. 동의 항목 설정

**제품 설정 → 카카오 로그인 → 동의 항목**

필수로 설정할 항목:
- ✅ **닉네임** (필수 동의)
- ✅ **프로필 사진** (선택 동의)
- ✅ **카카오계정(이메일)** (선택 동의)

---

### ✅ 5. 앱 키 확인

**내 애플리케이션 → 앱 설정 → 앱 키**

필요한 키:
- **REST API 키**: Railway 환경변수 `KAKAO_CLIENT_ID`에 사용
- **JavaScript 키**: 프론트엔드 `config.js`의 `KAKAO_JS_KEY`에 사용

---

### ✅ 6. Client Secret 발급 (선택)

**제품 설정 → 카카오 로그인 → 보안**

- "Client Secret" 생성
- **활성화 상태**: 사용함
- 생성된 값을 Railway 환경변수 `KAKAO_CLIENT_SECRET`에 설정

---

## Railway 환경변수 업데이트

카카오 앱 키를 확인한 후 Railway에서 설정:

```bash
KAKAO_CLIENT_ID=your_rest_api_key_here
KAKAO_CLIENT_SECRET=your_client_secret_here
```

---

## 프론트엔드 config.js 확인

`kakao-login-app/src/config.js` 파일:

```javascript
export const CONFIG = {
    BACKEND_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:4001'
        : 'https://commitjob-backend.up.railway.app',

    KAKAO_JS_KEY: 'your_javascript_key_here',

    // ... 나머지 설정
};
```

JavaScript 키가 올바르게 설정되어 있는지 확인하세요.

---

## 설정 확인 체크리스트

- [ ] Web 플랫폼에 Vercel 도메인 추가됨
- [ ] Redirect URI에 Railway 백엔드 콜백 URL 추가됨
- [ ] 카카오 로그인 활성화됨
- [ ] 동의 항목(닉네임, 프로필 사진) 설정됨
- [ ] Railway에 `KAKAO_CLIENT_ID` 설정됨
- [ ] Railway에 `KAKAO_CLIENT_SECRET` 설정됨 (선택)
- [ ] 프론트엔드 `config.js`에 JavaScript 키 설정됨

---

## 테스트

1. **프론트엔드 접속**
   https://commitjob-frontend.vercel.app

2. **"카카오로 로그인" 버튼 클릭**
   - 카카오 로그인 페이지로 리다이렉트되어야 함
   - 로그인 후 프론트엔드로 돌아와야 함

3. **로그인 성공 확인**
   - 사용자 프로필 표시
   - 이름, 프로필 사진 등 정보 확인

---

## 트러블슈팅

### "Redirect URI mismatch" 오류
- 카카오 개발자 콘솔의 Redirect URI 확인
- 정확히 `https://commitjob-backend.up.railway.app/auth/kakao/callback`인지 확인
- 프로토콜, 도메인, 경로 모두 정확해야 함

### "Invalid client_id" 오류
- Railway `KAKAO_CLIENT_ID`가 올바른지 확인
- REST API 키를 사용해야 함 (JavaScript 키 아님!)

### CORS 오류
- Railway `FRONTEND_ORIGIN`에 Vercel 도메인 포함되어 있는지 확인
- 백엔드 재배포 필요할 수 있음

---

## 다음 단계

모든 설정 완료 후:
1. https://commitjob-frontend.vercel.app 접속
2. 카카오 로그인 테스트
3. 정상 작동 확인!
