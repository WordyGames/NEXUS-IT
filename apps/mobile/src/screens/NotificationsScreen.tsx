import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  deleteNotification,
  getUnreadNotifications,
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
  Notification,
  NotificationType
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const typeIcons: Record<NotificationType, string> = {
  [NotificationType.WARRANTY_EXPIRING]: '⚠️',
  [NotificationType.MAINTENANCE_UPCOMING]: '🔧',
  [NotificationType.TICKET_STATUS_CHANGED]: '📌',
  [NotificationType.TICKET_COMMENTED]: '💬',
  [NotificationType.MAINTENANCE_COMPLETED]: '✅'
};

const typeColors: Record<NotificationType, string> = {
  [NotificationType.WARRANTY_EXPIRING]: '#ea580c',
  [NotificationType.MAINTENANCE_UPCOMING]: '#1d4ed8',
  [NotificationType.TICKET_STATUS_CHANGED]: '#7c3aed',
  [NotificationType.TICKET_COMMENTED]: '#059669',
  [NotificationType.MAINTENANCE_COMPLETED]: '#0f766e'
};

const toDate = (value: unknown): Date => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const withToDate = value as { toDate: () => Date };
    return withToDate.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const withSeconds = value as { seconds: number };
    return new Date(withSeconds.seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const NotificationsScreen = ({ navigation }: any) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userData?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [rows, unread] = await Promise.all([
        getUserNotifications(userData.id),
        getUnreadNotifications(userData.id)
      ]);
      setNotifications(rows);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading mobile notifications:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadNotifications();
    });

    return unsubscribe;
  }, [loadNotifications, navigation]);

  const filteredNotifications = useMemo(() => (
    showUnreadOnly ? notifications.filter((item) => !item.read) : notifications
  ), [notifications, showUnreadOnly]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications();
  };

  const handleMarkOne = async (notificationId: string) => {
    try {
      setProcessingId(notificationId);
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read (mobile):', error);
      Alert.alert('Error', 'No se pudo marcar la notificación como leída.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      setProcessingId(notificationId);
      await deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification (mobile):', error);
      Alert.alert('Error', 'No se pudo eliminar la notificación.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAll = async () => {
    if (!userData?.id) return;
    try {
      await markAllAsRead(userData.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read (mobile):', error);
      Alert.alert('Error', 'No se pudieron marcar todas como leídas.');
    }
  };

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkOne(notification.id);
    }

    if (notification.references?.ticketId) {
      navigation.navigate('Tickets');
      return;
    }

    if (notification.references?.equipmentId || notification.references?.maintenanceId) {
      navigation.navigate('Equipment');
      return;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Notificaciones</Text>
        <Text style={styles.subtitle}>
          {unreadCount} {unreadCount === 1 ? 'no leída' : 'no leídas'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, styles.filterButton, showUnreadOnly && styles.filterButtonActive]}
            onPress={() => setShowUnreadOnly((prev) => !prev)}
          >
            <Text style={[styles.headerButtonText, showUnreadOnly && styles.filterButtonTextActive]}>
              {showUnreadOnly ? 'Mostrando no leídas' : 'Solo no leídas'}
            </Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity style={[styles.headerButton, styles.markAllButton]} onPress={() => { void handleMarkAll(); }}>
              <Text style={styles.markAllButtonText}>Marcar todas leídas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text style={styles.emptyText}>Aquí verás alertas de garantía, mantenimiento y tickets.</Text>
        </View>
      ) : (
        filteredNotifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[styles.notificationCard, notification.read && styles.notificationCardRead]}
            onPress={() => { void handleOpenNotification(notification); }}
          >
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitleWrap}>
                <Text style={[styles.notificationIcon, { color: typeColors[notification.type] }]}>
                  {typeIcons[notification.type]}
                </Text>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
              </View>

              {!notification.read && <View style={styles.unreadDot} />}
            </View>

            <Text style={styles.notificationMessage}>{notification.message}</Text>
            <Text style={styles.notificationDate}>{toDate(notification.createdAt).toLocaleString()}</Text>

            <View style={styles.notificationActions}>
              {!notification.read && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.readButton, processingId === notification.id && styles.buttonDisabled]}
                  disabled={processingId === notification.id}
                  onPress={() => { void handleMarkOne(notification.id); }}
                >
                  <Text style={styles.actionButtonText}>Marcar leída</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, processingId === notification.id && styles.buttonDisabled]}
                disabled={processingId === notification.id}
                onPress={() => { void handleDelete(notification.id); }}
              >
                <Text style={styles.actionButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  content: {
    padding: 14,
    paddingBottom: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827'
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563'
  },
  headerActions: {
    marginTop: 12,
    gap: 8
  },
  headerButton: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  filterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  headerButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700'
  },
  filterButtonTextActive: {
    color: '#ffffff'
  },
  markAllButton: {
    backgroundColor: '#2563eb'
  },
  markAllButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
    color: '#6b7280'
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  notificationCardRead: {
    opacity: 0.7
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8
  },
  notificationTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  notificationIcon: {
    fontSize: 19
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb'
  },
  notificationMessage: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8
  },
  notificationDate: {
    fontSize: 11,
    color: '#6b7280'
  },
  notificationActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  readButton: {
    backgroundColor: '#1d4ed8'
  },
  deleteButton: {
    backgroundColor: '#b91c1c'
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default NotificationsScreen;
