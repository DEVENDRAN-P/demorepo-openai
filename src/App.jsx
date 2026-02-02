import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import './App.css';
import './styles/auth-animations.css';

// Auth
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Components - Import directly (not lazy)
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Import commonly used pages directly
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';

// Pages - Lazy load secondary pages for better performance
const BillUpload = lazy(() => import('./pages/BillUpload'));
const GSTForms = lazy(() => import('./pages/GSTForms'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

// Loading Component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
        <p className="text-white text-xl font-semibold">Loading...</p>
      </div>
    </div>
  );
}

// Main Routes Component
function AppRoutes() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />

        <Route element={<ProtectedRoute user={user} />}>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/bill-upload" element={<BillUpload user={user} />} />
          <Route path="/gst-forms" element={<GSTForms user={user} />} />
          <Route path="/reports" element={<Reports user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/chat" element={<ChatPage user={user} />} />
        </Route>

        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </Router>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
