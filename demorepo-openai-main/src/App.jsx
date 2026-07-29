import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import './App.css';
import './styles/auth-animations.css';

// Auth
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { DarkModeProvider } from './context/DarkModeContext';

// Components - Import directly (not lazy)
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Pages - Import commonly used pages directly
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';

import DashboardLayout from './components/DashboardLayout';

// Pages - Lazy load secondary pages for better performance
const BillUpload = lazy(() => import('./pages/BillUpload'));
const BillDetails = lazy(() => import('./pages/BillDetails'));
const GSTForms = lazy(() => import('./pages/GSTForms'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Support = lazy(() => import('./pages/Support'));
const AIFinanceAgent = lazy(() => import('./pages/AIFinanceAgent'));
const Invoices = lazy(() => import('./pages/Invoices'));
const ComplianceCenter = lazy(() => import('./pages/ComplianceCenter'));
const BusinessHealth = lazy(() => import('./pages/BusinessHealth'));
const AuditCenter = lazy(() => import('./pages/AuditCenter'));
const TaxForecast = lazy(() => import('./pages/TaxForecast'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const ExpenseAnalytics = lazy(() => import('./pages/ExpenseAnalytics'));
const VendorIntelligence = lazy(() => import('./pages/VendorIntelligence'));
const BusinessDirectory = lazy(() => import('./pages/BusinessDirectory'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const DocumentAssistant = lazy(() => import('./pages/DocumentAssistant'));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch'));
const PenaltyCenter = lazy(() => import('./pages/PenaltyCenter'));
const PricingBilling = lazy(() => import('./pages/PricingBilling'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));

// Loading Component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-500 to-teal-500">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
        <p className="text-white text-xl font-semibold">Loading GST Buddy AI...</p>
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
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/agent" element={<AIFinanceAgent user={user} />} />
            <Route path="/bill-upload" element={<BillUpload user={user} />} />
            <Route path="/bill/:billId" element={<BillDetails user={user} />} />
            <Route path="/invoices" element={<Invoices user={user} />} />
            <Route path="/compliance" element={<ComplianceCenter user={user} />} />
            <Route path="/health" element={<BusinessHealth user={user} />} />
            <Route path="/audit" element={<AuditCenter user={user} />} />
            <Route path="/forecast" element={<TaxForecast user={user} />} />
            <Route path="/reports" element={<Reports user={user} />} />
            <Route path="/insights" element={<AIInsights user={user} />} />
            <Route path="/recommendations" element={<Recommendations user={user} />} />
            <Route path="/gst-forms" element={<GSTForms user={user} />} />
            <Route path="/expenses" element={<ExpenseAnalytics user={user} />} />
            <Route path="/vendors" element={<VendorIntelligence user={user} />} />
            <Route path="/business" element={<BusinessDirectory user={user} />} />
            <Route path="/notifications" element={<NotificationCenter user={user} />} />
            <Route path="/documents" element={<DocumentAssistant user={user} />} />
            <Route path="/chat" element={<ChatPage user={user} />} />
            <Route path="/search" element={<GlobalSearch user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="/penalty" element={<PenaltyCenter user={user} />} />
            <Route path="/pricing" element={<PricingBilling user={user} />} />
            <Route path="/payment-success" element={<PaymentSuccess user={user} />} />
            <Route path="/support" element={<Support user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
          </Route>
        </Route>

        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <DarkModeProvider>
            <AppContent />
          </DarkModeProvider>
        </AuthProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <AppRoutes />
    </Router>
  );
}

export default App;
