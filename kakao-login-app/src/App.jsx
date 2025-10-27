import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import MainPage from './pages/MainPage';
import CallbackPage from './pages/CallbackPage';
import AIRecommendationPage from './pages/AIRecommendationPage';
import AIInterviewPage from './pages/AIInterviewPage';
import AICoverLetterPage from './pages/AICoverLetterPage';
import JobsPage from './pages/JobsPage';
import AIJobsPage from './pages/AIJobsPage';
import ITJobsPage from './pages/ITJobsPage';
import JobDetailPage from './pages/JobDetailPage';
import ResumePage from './pages/ResumePage';
import MenuPage from './pages/MenuPage';
import CodingTestPage from './pages/CodingTestPage';
import LGCodingTestPage from './pages/LGCodingTestPage';
import HyundaiCodingTestPage from './pages/HyundaiCodingTestPage';
import SamsungCodingTestPage from './pages/SamsungCodingTestPage';
import KakaoCodingTestPage from './pages/KakaoCodingTestPage';
import CookieTestPage from './pages/CookieTestPage';
import SimpleTestPage from './pages/SimpleTestPage';
import TestConnectionPage from './pages/TestConnectionPage';

function App() {
    return (
        <Router>
            <Header />
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/auth/kakao/callback" element={<CallbackPage />} />
                <Route path="/ai-recommendation" element={<AIRecommendationPage />} />
                <Route path="/ai-interview" element={<AIInterviewPage />} />
                <Route path="/interview" element={<AIInterviewPage />} />
                <Route path="/ai-cover-letter" element={<AICoverLetterPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/ai" element={<AIJobsPage />} />
                <Route path="/jobs/it" element={<ITJobsPage />} />
                <Route path="/jobs/detail/:id" element={<JobDetailPage />} />
                <Route path="/resume" element={<ResumePage />} />
                <Route path="/coding-test" element={<CodingTestPage />} />
                <Route path="/lg-coding-test" element={<LGCodingTestPage />} />
                <Route path="/hyundai-coding-test" element={<HyundaiCodingTestPage />} />
                <Route path="/samsung-coding-test" element={<SamsungCodingTestPage />} />
                <Route path="/kakao-coding-test" element={<KakaoCodingTestPage />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/cookie-test" element={<CookieTestPage />} />
                <Route path="/simple-test" element={<SimpleTestPage />} />
                <Route path="/test-connection" element={<TestConnectionPage />} />
            </Routes>
            <Navigation />
        </Router>
    );
}

export default App;
