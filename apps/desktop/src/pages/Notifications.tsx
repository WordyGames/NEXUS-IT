import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadNotifications,
  NotificationType,
  Notification,
  Equipment,
  getEquipmentById,
  getTicketById,
  getMaintenanceById,
  Ticket,
  Maintenance
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const typeIcons = {
  [NotificationType.WARRANTY_EXPIRING]: '⚠️',
  [NotificationType.MAINTENANCE_UPCOMING]: '🔧',
  [NotificationType.TICKET_STATUS_CHANGED]: '📌',
  [NotificationType.TICKET_COMMENTED]: '💬',
  [NotificationType.MAINTENANCE_COMPLETED]: '✅'
};

const typeColors = {
  [NotificationType.WARRANTY_EXPIRING]: 'text-orange-600',
  [NotificationType.MAINTENANCE_UPCOMING]: 'text-blue-600',
  [NotificationType.TICKET_STATUS_CHANGED]: 'text-purple-600',
  [NotificationType.TICKET_COMMENTED]: 'text-green-600',
  [NotificationType.MAINTENANCE_COMPLETED]: 'text-emerald-600'
};

const typeBgColors = {
  [NotificationType.WARRANTY_EXPIRING]: 'bg-orange-50 border-orange-200',
  [NotificationType.MAINTENANCE_UPCOMING]: 'bg-blue-50 border-blue-200',
  [NotificationType.TICKET_STATUS_CHANGED]: 'bg-purple-50 border-purple-200',
  [NotificationType.TICKET_COMMENTED]: 'bg-green-50 border-green-200',
  [NotificationType.MAINTENANCE_COMPLETED]: 'bg-emerald-50 border-emerald-200'
};

type FilterType = 'all' | NotificationType;

export const NotificationsPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [relatedData, setRelatedData] = useState<{
    [key: string]: Equipment | Ticket | Maintenance | null;
  }>({});

  const loadNotifications = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(userData.id);
      setNotifications(notifs);
      
      const unread = await getUnreadNotifications(userData.id);
      setUnreadCount(unread);

      // Cargar datos relacionados (sin reventar si falla)
      const related: { [key: string]: Equipment | Ticket | Maintenance | null } = {};
      for (const notif of notifs) {
        if (notif.references?.equipmentId && !related[notif.references.equipmentId]) {
          try {
            related[notif.references.equipmentId] = await getEquipmentById(
              notif.references.equipmentId
            );
          } catch (e) {
            related[notif.references.equipmentId] = null;
          }
        }
        if (notif.references?.ticketId && !related[notif.references.ticketId]) {
          try {
            related[notif.references.ticketId] = await getTicketById(
              notif.references.ticketId
            );
          } catch (e) {
            related[notif.references.ticketId] = null;
          }
        }
        if (notif.references?.maintenanceId && !related[notif.references.maintenanceId]) {
          try {
            related[notif.references.maintenanceId] = await getMaintenanceById(
              notif.references.maintenanceId
            );
          } catch (e) {
            related[notif.references.maintenanceId] = null;
          }
        }
      }
      setRelatedData(related);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userData?.id]);

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

  const handleNotificationClick = (notif: Notification) => {
    if (notif.references.ticketId) {
      navigate(`/tickets/${notif.references.ticketId}`);
    } else if (notif.references.equipmentId) {
      navigate(`/equipment/${notif.references.equipmentId}`);
    } else if (notif.references.maintenanceId) {
      navigate(`/maintenances/${notif.references.maintenanceId}`);
    }
  };

  // Filtrar notificaciones
  let filteredNotifications = notifications;
  if (filter !== 'all') {
    filteredNotifications = filteredNotifications.filter(n => n.type === filter);
  }
  if (showUnreadOnly) {
    filteredNotifications = filteredNotifications.filter(n => !n.read);
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Notificaciones</h1>
            {unreadCount > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-blue-400">
                  {unreadCount} {unreadCount === 1 ? 'no leída' : 'no leídas'}
                </span>
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Marcar todas leídas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            Todas ({notifications.length})
          </button>
          {Object.values(NotificationType).map(type => {
            const count = notifications.filter(n => n.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {typeIcons[type as NotificationType]} {count}
              </button>
            );
          })}

          <div className="ml-auto">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={e => setShowUnreadOnly(e.target.checked)}
                className="rounded"
              />
              Solo no leídas
            </label>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Cargando notificaciones...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-gray-300">Sin notificaciones</div>
            <p className="text-sm text-gray-500 mt-2">
              Las notificaciones aparecerán aquí cuando cambien equipos, tickets o mantenimientos
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-6 rounded-lg border-l-4 cursor-pointer transition-all bg-gray-800 border-gray-700 hover:bg-gray-750 ${
                  notif.read ? 'opacity-60' : 'font-semibold'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={`text-2xl ${typeColors[notif.type]}`}>
                      {typeIcons[notif.type]}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {notif.title}
                      </h3>
                      <p className="text-gray-300 mt-1">{notif.message}</p>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(notif.id);
                    }}
                    className="text-gray-400 hover:text-red-400 text-sm ml-4"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-400 mt-3">
                  <span>
                    {new Date(notif.createdAt as any).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    {!notif.read && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Marcar como leída
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleNotificationClick(notif);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-medium ml-2"
                    >
                      Ver detalles →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
