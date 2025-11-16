import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ user }) {
  const { loading, isAuthenticated } = useAuth();

  // While loading auth state, show nothing (app will redirect when ready)
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

  // If authenticated, show the component
  if (isAuthenticated || user) {
    return <Outlet />;
  }

  // Otherwise redirect to login
  return <Navigate to="/login" replace />;
}

export default ProtectedRoute;
