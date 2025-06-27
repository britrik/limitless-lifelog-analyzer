import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import DashboardPage from '@/pages/DashboardPage';
import LifelogsPage from '@/pages/LifelogsPage';
import InsightsPage from '@/pages/InsightsPage';
import SettingsPage from '@/pages/SettingsPage';
// import NotFoundPage from '@/pages/NotFoundPage'; // To be created

// The old Header and Footer components might be deprecated or reused within specific pages if needed.
// For now, they are not part of the main layout structure.

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/lifelogs" element={<LifelogsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* <Route path="*" element={<NotFoundPage />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Basic fallback */}
        </Route>
      </Routes>
    </Router>
  );
};

export default App;