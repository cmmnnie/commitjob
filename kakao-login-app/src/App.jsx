import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import CallbackPage from './pages/CallbackPage';
import CookieTestPage from './pages/CookieTestPage';
import SimpleTestPage from './pages/SimpleTestPage';
import TestConnectionPage from './pages/TestConnectionPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/cookie-test" element={<CookieTestPage />} />
                <Route path="/simple-test" element={<SimpleTestPage />} />
                <Route path="/test-connection" element={<TestConnectionPage />} />
            </Routes>
        </Router>
    );
}

export default App;
