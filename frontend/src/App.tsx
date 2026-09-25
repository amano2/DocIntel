import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReviewConsolePage from './pages/ReviewConsolePage';
import AskPage from './pages/AskPage';
import BenchmarkPage from './pages/BenchmarkPage';

// Simple protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!session) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/review" element={
            <ProtectedRoute>
              <ReviewConsolePage />
            </ProtectedRoute>
          } />
          
          <Route path="/ask" element={
            <ProtectedRoute>
              <AskPage />
            </ProtectedRoute>
          } />
          
          <Route path="/benchmark" element={<BenchmarkPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
