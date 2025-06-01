import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, let ProtectedRoute handle it
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role is in the allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    const redirectPath = user.role === 'delivery_partner' ? '/delivery-dashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Render content if role is allowed
  return children;
};

export default RoleBasedRoute; 