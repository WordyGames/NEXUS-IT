import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserPermission } from '@nexus-it/shared';
import { AuthProvider } from './contexts/AuthContext';
import { UpdaterProvider } from './contexts/UpdaterContext';
import { UiFeedbackProvider } from './contexts/UiFeedbackContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import { PageSpinner } from './components/ui/Spinner';

const GlobalSearch = lazy(() => import('./components/GlobalSearch').then((module) => ({ default: module.GlobalSearch })));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Equipment = lazy(() => import('./pages/Equipment'));
const MyEquipment = lazy(() => import('./pages/MyEquipment'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Maintenances = lazy(() => import('./pages/Maintenances'));
const Reports = lazy(() => import('./pages/Reports'));
const NotificationsPage = lazy(() => import('./pages/Notifications').then((module) => ({ default: module.NotificationsPage })));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Chat = lazy(() => import('./pages/Chat'));
const WarrantyReport = lazy(() => import('./components/WarrantyReport').then((module) => ({ default: module.WarrantyReport })));

function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const isFileProtocol = window.location.protocol === 'file:';
  const RouterComponent = isFileProtocol ? HashRouter : BrowserRouter;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K o Cmd+K abre/cierra búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      // Esc cierra búsqueda
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <RouterComponent>
      <ThemeProvider>
      <AuthProvider>
        <UpdaterProvider>
          <UiFeedbackProvider>
            <Suspense fallback={null}>
              <GlobalSearch 
                isOpen={searchOpen} 
                onClose={() => setSearchOpen(false)}
              />
            </Suspense>

            <Suspense fallback={<PageSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/portal"
                  element={
                    <PrivateRoute>
                      <PortalLayout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="equipment" element={<MyEquipment />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="maintenance-confirmation" element={<Maintenances />} />
                </Route>
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="dashboard"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.DASHBOARD_ADMIN}>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="equipment"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.EQUIPMENT_VIEW}>
                        <Equipment />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="tickets"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.TICKETS_VIEW}>
                        <Tickets />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="tickets/:id"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.TICKETS_VIEW}>
                        <Tickets />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="maintenances"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.MAINTENANCES_VIEW}>
                        <Maintenances />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="maintenance-confirmation"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.TICKETS_VIEW}>
                        <Maintenances />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.REPORTS_VIEW}>
                        <Reports />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="warranty-report"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.WARRANTY_VIEW}>
                        <WarrantyReport />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.NOTIFICATIONS_VIEW}>
                        <NotificationsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.USERS_VIEW}>
                        <Users />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <PrivateRoute requiredPermission={UserPermission.SETTINGS_VIEW}>
                        <Settings />
                      </PrivateRoute>
                    }
                  />
                  <Route path="chat" element={<Chat />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </UiFeedbackProvider>
        </UpdaterProvider>
      </AuthProvider>
      </ThemeProvider>
    </RouterComponent>
  );
}

export default App;
