import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import RedirectLogin from './RedirectLogin';
import HomePage from './HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 카카오/구글 콜백 처리 */}
        <Route path="/auth/callback" element={<RedirectLogin />} />

        {/* 메인 페이지 */}
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
