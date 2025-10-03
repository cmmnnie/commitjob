async function findOrCreateUser(providerKey, email, name, picture, provider) {
  try {
    // 기존 사용자 찾기
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE provider_key = ?',
      [providerKey]
    );

    if (existingUsers.length > 0) {
      // 기존 사용자 정보 업데이트
      const user = existingUsers[0];
      await pool.execute(
        'UPDATE users SET email = ?, name = ?, picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [email, name, picture, user.id]
      );
      return { ...user, email, name, picture };
    } else {
      // 새 사용자 생성
      const [result] = await pool.execute(
        'INSERT INTO users (provider_key, email, name, picture, provider) VALUES (?, ?, ?, ?, ?)',
        [providerKey, email, name, picture, provider]
      );
      return {
        id: result.insertId,
        provider_key: providerKey,
        email,
        name,
        picture,
        provider
      };
    }
  } catch (error) {
    console.error('[DB] Error in findOrCreateUser:', error);
    throw error;
  }
}

async function findUserById(userId) {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('[DB] Error in findUserById:', error);
    throw error;
  }
}

// 세션(개인화용) 저장소
const sessions = new Map(); // sessionId -> { user:{}, jobs:[], companies:[] }
const newSessionId = () => crypto.randomUUID();
const ensureSession = sid => {
  if (!sid || !sessions.has(sid)) throw new Error("NO_SESSION");
  return sessions.get(sid);
};

/* -------------------- 1) 구글 로그인 시작 ------------------ */
app.get("/auth/google", (req, res) => {
  const origin = req.query.origin?.toString();
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(400).send("Bad origin");
  }
  const state = crypto.randomUUID();
  stateStore.set(state, origin);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    include_granted_scopes: "true",
    state,
    prompt: "select_account",
    access_type: "offline",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/* --------- 2) 구글 콜백: code→token, 검증, 세션 쿠키 ------- */
app.get("/auth/google/callback", async (req, res) => {
  const fallback = allowedOrigins[0] || "http://localhost:5173";
  try {
    const { code, state } = req.query;

    const origin = stateStore.get(state);
    stateStore.delete(state);
    if (!origin) return res.status(403).json({ error: "INVALID_STATE" });

    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const { id_token } = tokenRes.data;

    const JWKS = jose.createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
    const { payload } = await jose.jwtVerify(id_token, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const email = payload.email ?? null;
    const name = payload.name ?? null;
    const picture = payload.picture ?? null;
    const sub = payload.sub;

    const providerKey = `google:${sub}`;
    const user = await findOrCreateUser(providerKey, email, name, picture, 'google');
    const uid = user.id;

    const appJwt = await new jose.SignJWT({ uid, email, provider: "google" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("app_session", appJwt, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.redirect(`${origin}/auth/callback?ok=1`);
  } catch (e) {
    console.error(e.response?.data || e);
    res.redirect(`${fallback}/auth/callback?ok=0`);
  }
});

/* -------------------- 1-2) 카카오 로그인 시작 ------------------ */
app.get("/auth/kakao", (req, res) => {
  const origin = req.query.origin?.toString();
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(400).send("Bad origin");
  }
  const state = crypto.randomUUID();
  stateStore.set(state, origin);

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    response_type: "code",
    state,
    scope: "profile_nickname profile_image account_email",
  });
  res.redirect(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
});

// 조정된 app.get("/auth/kakao/login-url") 라우트
app.get("/auth/kakao/login-url", (req, res) => {
  // 프론트엔드가 이 URL을 요청할 때 자신의 origin을 쿼리 파라미터로 전달해야 합니다.
  // 예: /auth/kakao/login-url?origin=http://localhost:5173
  const origin = req.query.origin?.toString(); 
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(400).json({ error: "Bad origin or missing origin query parameter" }); // JSON 응답으로 변경
  }

  const state = crypto.randomUUID();
  stateStore.set(state, origin); // 생성된 state와 프론트엔드의 origin을 연결하여 저장

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    response_type: "code",
    state, // 이 state 값을 카카오 인가 URL에 포함
    scope: "profile_nickname profile_image account_email",
  });
  const url = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  
  // 프론트엔드에 카카오 인가 URL과 함께 생성된 state 값을 반환합니다.
  res.json({ url, state }); 
});



/* --------- 2) 카카오 콜백: code→token, 사용자 조회, 세션 쿠키 ------- */
app.get("/auth/kakao/callback", async (req, res) => {
  const fallback = allowedOrigins[0] || "http://localhost:5173";
  try {
    const { code, state } = req.query;

    const origin = stateStore.get(state);
    stateStore.delete(state);
    if (!origin) return res.status(403).json({ error: "INVALID_STATE" });

    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code: String(code),
    });
    if (process.env.KAKAO_CLIENT_SECRET) {
      form.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
    }

    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      form.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenRes.data;

    const meRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const kakao = meRes.data;
    const sub = kakao.id?.toString();
    const emailRaw = kakao.kakao_account?.email ?? null;
    const email = emailRaw ?? (sub ? `kakao_${sub}@no-email.kakao` : null);
    const name = kakao.kakao_account?.profile?.nickname ?? null;
    const picture = kakao.kakao_account?.profile?.profile_image_url ?? null;

    const providerKey = `kakao:${sub}`;
    const user = await findOrCreateUser(providerKey, email, name, picture, 'kakao');
    const uid = user.id;

    const appJwt = await new jose.SignJWT({ uid, email, provider: "kakao" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("app_session", appJwt, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.redirect(`${origin}/auth/callback?ok=1`);
  } catch (e) {
    console.error("KAKAO_AUTH_FAIL", {
      msg: e.message,
      data: e.response?.data,
      status: e.response?.status,
    });
    res.redirect(`${fallback}/auth/callback?ok=0`);
  }
});
