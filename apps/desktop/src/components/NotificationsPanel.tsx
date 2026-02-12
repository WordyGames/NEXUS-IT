import React, { useState, useEffect } from 'react';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  NotificationType,
  Notification,
  getUnreadNotifications
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeColors = {
  [NotificationType.WARRANTY_EXPIRING]: 'bg-orange-50',
  [NotificationType.MAINTENANCE_UPCOMING]: 'bg-blue-50',
  [NotificationType.TICKET_STATUS_CHANGED]: 'bg-purple-50',
  [NotificationType.TICKET_COMMENTED]: 'bg-green-50',
  [NotificationType.MAINTENANCE_COMPLETED]: 'bg-emerald-50'
};

const typeBorders = {
  [NotificationType.WARRANTY_EXPIRING]: 'border-orange-200',
  [NotificationType.MAINTENANCE_UPCOMING]: 'border-blue-200',
  [NotificationType.TICKET_STATUS_CHANGED]: 'border-purple-200',
  [NotificationType.TICKET_COMMENTED]: 'border-green-200',
  [NotificationType.MAINTENANCE_COMPLETED]: 'border-emerald-200'
};

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(userData.id);
      setNotifications(notifs);
      
      const unread = await getUnreadNotifications(userData.id);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Refresh cada 30s
      return () => clearInterval(interval);
    }
  }, [isOpen, userData?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    await markNotificationAsRead(notifId);
    await loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (userData?.id) {
      await markAllAsRead(userData.id);
      await loadNotifications();
    }
  };

  const handleDelete = async (notifId: string) => {
    await deleteNotification(notifId);
    await loadNotifications();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Notificaciones</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">{unreadCount} no leídas</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        {unreadCount > 0 && (
          <div className="border-b border-gray-100 px-4 py-2">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Cargando...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <div>Sin notificaciones</div>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 border-l-4 border-transparent cursor-pointer transition-colors ${typeColors[notif.type]} ${typeBorders[notif.type]} ${
                    notif.read ? 'opacity-60' : 'font-semibold'
                  } hover:bg-gray-50`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm text-gray-900">
                      {notif.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notif.id);
                      }}
                      className="text-gray-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{notif.message}</p>

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>
                      {new Date(notif.createdAt as any).toLocaleString()}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
