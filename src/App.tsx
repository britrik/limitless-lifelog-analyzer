import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard, Lifelogs, Settings, ApiTest, NotFound, ComponentDemo } from './pages';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Router>
          <Layout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lifelogs" element={<Lifelogs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/api-test" element={<ApiTest />} />
              <Route path="/demo" element={<ComponentDemo />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Router>
      </div>
    </ErrorBoundary>
  );
};

export default App;