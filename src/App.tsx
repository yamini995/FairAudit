import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import AuditPage from './pages/AuditPage';
import RemediationPage from './pages/RemediationPage';
import ExportPage from './pages/ExportPage';
import AuthPage from './pages/AuthPage';
import { Layout } from './components/Layout';

import { useApp } from './AppContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute>
                <AuditPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/remediation" 
            element={
              <ProtectedRoute>
                <RemediationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/export" 
            element={
              <ProtectedRoute>
                <ExportPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}
