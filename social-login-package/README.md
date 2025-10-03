# 소셜 로그인 연동 패키지

##  패키지 내용

```
social-login-package/
├── README.md                           # 이 파일
├── docs/                              # 문서
│   ├── SOCIAL_LOGIN_GUIDE.md         # 프론트엔드 연동 가이드
│   └── API_EXAMPLES.md               # API 예시 및 테스트
└── backend-code/                      # 백엔드 코드
    ├── README.md                      # 백엔드 통합 가이드
    └── social-login-routes.js         # 소셜 로그인 라우트 코드
```

##  빠른 시작

### 프론트엔드 개발자
1. `docs/SOCIAL_LOGIN_GUIDE.md` 읽기
2. `docs/API_EXAMPLES.md`의 React 예시 참고
3. 로그인 페이지 구현

### 백엔드 개발자
1. `backend-code/README.md` 읽기
2. `social-login-routes.js` 코드 통합
3. 환경 변수 설정
4. 데이터베이스 테이블 생성

##  지원 기능

-  Google OAuth 2.0 로그인
-  Kakao OAuth 2.0 로그인
-  JWT 기반 세션 관리 (7일 유지)
-  HttpOnly 쿠키 (보안)
-  CSRF 방지 (state 파라미터)

##  API 엔드포인트

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/auth/google?origin={URL}` | GET | Google 로그인 시작 |
| `/auth/kakao?origin={URL}` | GET | Kakao 로그인 시작 |
| `/auth/kakao/login-url?origin={URL}` | GET | Kakao 로그인 URL 받기 |
| `/api/user/profile` | GET | 사용자 프로필 조회 |
| `/api/logout` | POST | 로그아웃 |

##  필요한 환경 변수

```bash
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4001/auth/google/callback
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_REDIRECT_URI=http://localhost:4001/auth/kakao/callback
```

##  데이터베이스 스키마

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_key VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  picture TEXT,
  provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

##  주의사항

1. **origin 파라미터**: 백엔드 허용 목록에 프론트엔드 URL 추가 필요
2. **credentials: 'include'**: 모든 API 요청에 포함
3. **HTTPS**: 프로덕션 환경에서 필수
4. **CORS**: 백엔드에서 CORS 설정 필요

##  문의

- 프론트엔드: `docs/SOCIAL_LOGIN_GUIDE.md` 참고
- 백엔드: `backend-code/README.md` 참고
- API 테스트: `docs/API_EXAMPLES.md` 참고
