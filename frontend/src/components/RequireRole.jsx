import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useCart from '../hooks/useCart';
import { getRoleHome } from '../utils/roleUtils';

export default function RequireRole({ roles = [], children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useCart();
  const location = useLocation();

  const isRoleAllowed = !roles.length || (user && roles.includes(user.role));

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isRoleAllowed) {
      const msg = roles.includes('customer')
        ? 'That page is for customers only'
        : roles.includes('vendor')
        ? 'That page is for vendors only'
        : 'That page is for administrators only';
      showToast(msg, 'error');
    }
  }, [isLoading, isAuthenticated, isRoleAllowed, roles, showToast]);

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner"></div>
        <p>Verifying role authorization...</p>
      </div>
    );
  }

  // If not logged in, remember location and send to login
  if (!isAuthenticated) {
    // Save to sessionStorage for persistence across redirects
    sessionStorage.setItem('post_login_redirect', location.pathname + location.search);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is not allowed, redirect to their role home with toast
  if (!isRoleAllowed) {
    const roleHome = getRoleHome(user?.role);
    return <Navigate to={roleHome} replace />;
  }

  return children;
}
