import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ShieldAlert, Wrench, Tag, MessageSquare, CheckCircle2, Inbox } from 'lucide-react';
import {
  deleteNotification,
  getUnreadNotifications,
  getUserNotifications,
  markNotificationAsRead,
  NotificationType,
  Notification
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { toDate } from '../utils/dateUtils';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  [NotificationType.WARRANTY_EXPIRING]:     <ShieldAlert   size={15} className="text-orange-500" />,
  [NotificationType.MAINTENANCE_UPCOMING]:  <Wrench        size={15} className="text-blue-500" />,
  [NotificationType.TICKET_STATUS_CHANGED]: <Tag           size={15} className="text-purple-500" />,
  [NotificationType.TICKET_COMMENTED]:      <MessageSquare size={15} className="text-green-500" />,
  [NotificationType.MAINTENANCE_COMPLETED]: <CheckCircle2  size={15} className="text-emerald-500" />,
};

export const NotificationBell: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!userData?.id) return;
    try {
      setUnreadCount(await getUnreadNotifications(userData.id));
      if (isOpen) {
        setLoading(true);
        const notifs = await getUserNotifications(userData.id);
        setNotifications(notifs.slice(0, 5));
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userData?.id, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async (notif: Notification) => {
    if (!notif.read) await markNotificationAsRead(notif.id);
    setIsOpen(false);
    const { ticketId, equipmentId, maintenanceId } = notif.references ?? {};
    navigate(ticketId ? `/tickets/${ticketId}` : equipmentId ? `/equipment/${equipmentId}` : maintenanceId ? `/maintenances/${maintenanceId}` : '/notifications');
    await loadNotifications();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActioningId(id);
    try { await deleteNotification(id); await loadNotifications(); }
    catch { /* silent */ } finally { setActioningId(null); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        title="Notificaciones"
      >
        <Bell size={15} />
        <span className="hidden sm:inline">Alertas</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-[17px] text-center border-2 border-white dark:border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-modal z-50 border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificaciones</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                <Inbox size={28} className="opacity-50" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => void handleOpen(notif)}
                  className={`group px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors last:border-0 ${notif.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{TYPE_ICON[notif.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{notif.title}</p>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {toDate(notif.createdAt as any).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => void handleDelete(e, notif.id)}
                      disabled={actioningId === notif.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-all disabled:opacity-30 shrink-0"
                      title="Eliminar"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1 transition-colors"
            >
              Ver todas las notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
