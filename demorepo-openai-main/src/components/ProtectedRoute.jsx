import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ user }) {
  const { loading, isAuthenticated, user: authUser } = useAuth();
  const location = useLocation();
  const currentUser = authUser || user;

  // While loading auth state, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, check profile completeness
  if (isAuthenticated || currentUser) {
    const hasCompletedProfile = currentUser && currentUser.name && currentUser.shopName && currentUser.gstin;

    if (!hasCompletedProfile) {
      // Allow visiting setup-related onboarding pages
      const allowedPaths = ['/profile', '/support', '/pricing', '/checkout', '/payment-success'];
      if (allowedPaths.includes(location.pathname)) {
        return <Outlet />;
      }
      // Otherwise redirect to profile for onboarding
      return <Navigate to="/profile?onboarding=true" replace />;
    }

    return <Outlet />;
  }

  // Otherwise redirect to the public Home page — never leave the user on a
  // protected screen after logout (browser Back must not reach Dashboard).
  return <Navigate to="/" replace />;
}

export default ProtectedRoute;
