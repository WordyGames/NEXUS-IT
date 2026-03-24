import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeSupportChatThread, subscribeSupportChatThreads } from '@nexus-it/shared';
import { NotificationBell } from './NotificationBell';
import styles from './Navbar.module.css';

const getCompanyBadgeVariant = (company: string) => {
  const normalized = company.toUpperCase();
  if (normalized.includes('ESPECIAS')) return styles.companyEspecias;
  if (normalized.includes('AMEX')) return styles.companyAmex;
  if (normalized.includes('OSENAL')) return styles.companyOsenal;
  return styles.companyDefault;
};

const Navbar = () => {
  const { userData, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleOpenChat = () => {
    const isPortalRoute = location.pathname.startsWith('/portal');
    navigate(isPortalRoute ? '/portal/chat' : '/chat');
  };

  useEffect(() => {
    if (!userData?.id) {
      setChatUnreadCount(0);
      return;
    }

    if (isAdmin) {
      const unsubscribe = subscribeSupportChatThreads(
        (threads) => {
          setChatUnreadCount(threads.filter((thread) => thread.hasUnreadForAdmin).length);
        },
        {
          onError: () => setChatUnreadCount(0)
        }
      );

      return () => unsubscribe();
    }

    const unsubscribe = subscribeSupportChatThread(
      userData.id,
      (thread) => {
        setChatUnreadCount(thread?.hasUnreadForUser ? 1 : 0);
      },
      () => {
        setChatUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, userData?.id]);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Bienvenido, {userData?.name}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleOpenChat}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 relative"
            title="Abrir chat de soporte"
          >
            <MessageCircle size={16} />
            Chat
            {chatUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center border border-white">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </button>

          {/* Notificaciones */}
          <NotificationBell />

          {/* Empresa */}
          {userData?.company && (
            <div
              aria-label={`Empresa: ${userData.company}`}
              title={userData.company}
              className={`${styles.companyBadge} ${getCompanyBadgeVariant(userData.company)}`}
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
