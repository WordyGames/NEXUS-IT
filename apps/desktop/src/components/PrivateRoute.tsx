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

  const getFallbackRoute = () => {
    if (hasPermission(UserPermission.DASHBOARD_ADMIN)) return '/dashboard';
    if (hasPermission(UserPermission.EQUIPMENT_VIEW)) return '/equipment';
    if (hasPermission(UserPermission.TICKETS_VIEW)) return '/tickets';
    if (hasPermission(UserPermission.MAINTENANCES_VIEW)) return '/maintenances';
    if (hasPermission(UserPermission.NOTIFICATIONS_VIEW)) return '/notifications';
    return '/portal';
  };

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
    return <Navigate to={getFallbackRoute()} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={getFallbackRoute()} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
