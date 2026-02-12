import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { UpdaterProvider } from './contexts/UpdaterContext';
import PrivateRoute from './components/PrivateRoute';
import { GlobalSearch } from './components/GlobalSearch';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Tickets from './pages/Tickets';
import Maintenances from './pages/Maintenances';
import Reports from './pages/Reports';
import { NotificationsPage } from './pages/Notifications';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import { WarrantyReport } from './components/WarrantyReport';

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K o Cmd+K abre/cierra búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      // Esc cierra búsqueda
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <Router>
      <AuthProvider>
        <UpdaterProvider>
          <GlobalSearch 
            isOpen={searchOpen} 
            onClose={() => setSearchOpen(false)}
          />
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
              <Route path="tickets" element={<Tickets />} />
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/:id" element={<Tickets />} />
              <Route path="maintenances" element={<Maintenances />} />
              <Route path="reports" element={<Reports />} />
              <Route path="warranty-report" element={<WarrantyReport />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </UpdaterProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
