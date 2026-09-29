import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReviewConsolePage from './pages/ReviewConsolePage';
import AskPage from './pages/AskPage';
import BenchmarkPage from './pages/BenchmarkPage';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
        [ Initializing Secure Session... ]
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review"
        element={
          <ProtectedRoute>
            <ReviewConsolePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ask"
        element={
          <ProtectedRoute>
            <AskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/benchmark"
        element={
          <ProtectedRoute>
            <BenchmarkPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
