import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanyColor } from '@nexus-it/shared';
import { NotificationBell } from './NotificationBell';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Bienvenido, {userData?.name}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notificaciones */}
          <NotificationBell />

          {/* Empresa */}
          {userData?.company && (
            <div
              aria-label={`Empresa: ${userData.company}`}
              title={userData.company}
              className={styles.companyBadge}
              style={{ '--company-color': getCompanyColor(userData.company) } as React.CSSProperties}
            >
              {userData.company}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
