import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { hasSession } from './api/client';

import LanguageSwitcher from './components/LanguageSwitcher';
import JoinPage from './pages/JoinPage';
import BriefingPage from './pages/BriefingPage';
import OpeningBriefingPage from './pages/OpeningBriefingPage';
import HubPage from './pages/HubPage';
import Gate1Page from './pages/Gate1Page';
import Gate2Page from './pages/Gate2Page';
import Gate3Page from './pages/Gate3Page';
import Gate4Page from './pages/Gate4Page';
import FeedbackPage from './pages/FeedbackPage';
import ScenarioPage from './pages/ScenarioPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!hasSession()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/opening" element={<RequireAuth><OpeningBriefingPage /></RequireAuth>} />
        <Route path="/hub" element={<RequireAuth><HubPage /></RequireAuth>} />
        <Route path="/gate/1" element={<RequireAuth><Gate1Page /></RequireAuth>} />
        <Route path="/gate/2" element={<RequireAuth><Gate2Page /></RequireAuth>} />
        <Route path="/gate/3" element={<RequireAuth><Gate3Page /></RequireAuth>} />
        <Route path="/gate/4" element={<RequireAuth><Gate4Page /></RequireAuth>} />
        <Route path="/feedback/:gateNumber" element={<RequireAuth><FeedbackPage /></RequireAuth>} />
        <Route path="/scenario" element={<RequireAuth><ScenarioPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
