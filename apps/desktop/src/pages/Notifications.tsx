import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ShieldAlert, Wrench, Tag, MessageSquare, CheckCircle2 } from 'lucide-react';
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
import { toDate } from '../utils/dateUtils';
import { Spinner, Button, EmptyState } from '../components/ui';

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; color: string; border: string }> = {
  [NotificationType.WARRANTY_EXPIRING]:       { icon: <ShieldAlert  size={18} />, color: 'text-orange-400', border: 'border-orange-500' },
  [NotificationType.MAINTENANCE_UPCOMING]:    { icon: <Wrench       size={18} />, color: 'text-blue-400',   border: 'border-blue-500'   },
  [NotificationType.TICKET_STATUS_CHANGED]:   { icon: <Tag          size={18} />, color: 'text-purple-400', border: 'border-purple-500' },
  [NotificationType.TICKET_COMMENTED]:        { icon: <MessageSquare size={18}/>, color: 'text-green-400',  border: 'border-green-500'  },
  [NotificationType.MAINTENANCE_COMPLETED]:   { icon: <CheckCircle2 size={18} />, color: 'text-emerald-400',border: 'border-emerald-500'},
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
  const [relatedData, setRelatedData] = useState<Record<string, Equipment | Ticket | Maintenance | null>>({});

  const loadNotifications = async () => {
    if (!userData?.id) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(userData.id);
      setNotifications(notifs);
      setUnreadCount(await getUnreadNotifications(userData.id));

      const related: Record<string, Equipment | Ticket | Maintenance | null> = {};
      for (const notif of notifs) {
        const { equipmentId, ticketId, maintenanceId } = notif.references ?? {};
        if (equipmentId && !(equipmentId in related)) {
          try { related[equipmentId] = await getEquipmentById(equipmentId); } catch { related[equipmentId] = null; }
        }
        if (ticketId && !(ticketId in related)) {
          try { related[ticketId] = await getTicketById(ticketId); } catch { related[ticketId] = null; }
        }
        if (maintenanceId && !(maintenanceId in related)) {
          try { related[maintenanceId] = await getMaintenanceById(maintenanceId); } catch { related[maintenanceId] = null; }
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

  const handleMarkAsRead = async (id: string) => { await markNotificationAsRead(id); await loadNotifications(); };
  const handleMarkAllAsRead = async () => { if (userData?.id) { await markAllAsRead(userData.id); await loadNotifications(); } };
  const handleDelete = async (id: string) => { await deleteNotification(id); await loadNotifications(); };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) await markNotificationAsRead(notif.id);
    const { ticketId, equipmentId, maintenanceId } = notif.references ?? {};
    if (ticketId) navigate(`/tickets/${ticketId}`);
    else if (equipmentId) navigate(`/equipment/${equipmentId}`);
    else if (maintenanceId) navigate(`/maintenances/${maintenanceId}`);
    await loadNotifications();
  };

  const filteredNotifications = notifications
    .filter((n) => filter === 'all' || n.type === filter)
    .filter((n) => !showUnreadOnly || !n.read);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-blue-400" />
              <h1 className="text-xl font-bold text-white">Notificaciones</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                iconLeft={<CheckCheck size={14} />}
                className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
              >
                Marcar todas leídas
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            Todas ({notifications.length})
          </button>
          {Object.values(NotificationType).map((type) => {
            const count = notifications.filter((n) => n.type === type).length;
            const meta = TYPE_META[type];
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === type ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className={filter === type ? 'text-white' : meta.color}>{meta.icon}</span>
                {count}
              </button>
            );
          })}
          <label className="ml-auto flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded accent-blue-500"
            />
            Solo no leídas
          </label>
        </div>

        {/* List */}
        {loading ? (
          <Spinner size="lg" label="Cargando notificaciones..." className="py-16 justify-center text-slate-400" />
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <Bell size={36} className="text-slate-700" />
            <p className="text-base font-medium text-slate-400">Sin notificaciones</p>
            <p className="text-sm text-center max-w-xs">Las notificaciones aparecerán aquí cuando cambien equipos, tickets o mantenimientos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif) => {
              const meta = TYPE_META[notif.type];
              return (
                <div
                  key={notif.id}
                  onClick={() => void handleNotificationClick(notif)}
                  className={`group relative p-4 rounded-xl border-l-[3px] cursor-pointer transition-all bg-slate-900 border border-slate-800 hover:bg-slate-800 ${meta.border} ${notif.read ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-white ${notif.read ? 'font-normal' : ''}`}>{notif.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-slate-600 mt-2">
                        {toDate(notif.createdAt as any).toLocaleString('es-MX')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleMarkAsRead(notif.id); }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Leída
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(notif.id); }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
