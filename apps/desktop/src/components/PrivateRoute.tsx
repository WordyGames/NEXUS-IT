import React from 'react';
import { Navigate } from 'react-router-dom';
import { UserPermission } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredPermission?: UserPermission;
  requireAdminPanel?: boolean;
}

const PrivateRoute = ({ children, requiredPermission, requireAdminPanel = false }: PrivateRouteProps) => {
  const { currentSession, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentSession) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdminPanel && !hasPermission(UserPermission.DASHBOARD_ADMIN)) {
    return <Navigate to="/portal" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (hasPermission(UserPermission.DASHBOARD_ADMIN)) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
