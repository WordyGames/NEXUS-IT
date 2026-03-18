import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getUnreadNotifications,
  getUserNotifications,
  NotificationType,
  Notification
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const typeEmojis = {
  [NotificationType.WARRANTY_EXPIRING]: '⚠️',
  [NotificationType.MAINTENANCE_UPCOMING]: '🔧',
  [NotificationType.TICKET_STATUS_CHANGED]: '📌',
  [NotificationType.TICKET_COMMENTED]: '💬',
  [NotificationType.MAINTENANCE_COMPLETED]: '✅'
};

const toDate = (value: any): Date => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export const NotificationBell: React.FC = () => {
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!userData?.id) return;
    try {
      const count = await getUnreadNotifications(userData.id);
      setUnreadCount(count);

      if (isOpen) {
        setLoading(true);
        const notifs = await getUserNotifications(userData.id);
        setNotifications(notifs.slice(0, 5)); // Mostrar últimas 5
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh cada 30s
    return () => clearInterval(interval);
  }, [userData?.id, isOpen]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge para notificaciones no leídas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                Sin notificaciones
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex gap-2">
                    <span className="text-lg flex-shrink-0">
                      {typeEmojis[notif.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {toDate(notif.createdAt as any).toLocaleTimeString()}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2"
            >
              Ver todas las notificaciones →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
