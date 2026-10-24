import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Restoring your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
