import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Company,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  addTicketComment,
  createTicket,
  getTickets,
  triggerTicketStatusChange,
  updateTicket
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Baja',
  [TicketPriority.MEDIUM]: 'Media',
  [TicketPriority.HIGH]: 'Alta',
  [TicketPriority.URGENT]: 'Urgente'
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Abierto',
  [TicketStatus.IN_PROGRESS]: 'En progreso',
  [TicketStatus.RESOLVED]: 'Resuelto',
  [TicketStatus.CLOSED]: 'Cerrado',
  [TicketStatus.CANCELLED]: 'Cancelado'
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.HARDWARE]: 'Hardware',
  [TicketCategory.SOFTWARE]: 'Software',
  [TicketCategory.NETWORK]: 'Red',
  [TicketCategory.EMAIL]: 'Correo',
  [TicketCategory.PRINTER]: 'Impresora',
  [TicketCategory.ACCESS]: 'Accesos',
  [TicketCategory.OTHER]: 'Otro'
};

const PRIORITY_STYLES: Record<TicketPriority, { bg: string; text: string }> = {
  [TicketPriority.LOW]: { bg: '#e5e7eb', text: '#111827' },
  [TicketPriority.MEDIUM]: { bg: '#dbeafe', text: '#1d4ed8' },
  [TicketPriority.HIGH]: { bg: '#ffedd5', text: '#c2410c' },
  [TicketPriority.URGENT]: { bg: '#fee2e2', text: '#991b1b' }
};

const STATUS_STYLES: Record<TicketStatus, { bg: string; text: string }> = {
  [TicketStatus.OPEN]: { bg: '#dcfce7', text: '#166534' },
  [TicketStatus.IN_PROGRESS]: { bg: '#fef3c7', text: '#92400e' },
  [TicketStatus.RESOLVED]: { bg: '#dbeafe', text: '#1d4ed8' },
  [TicketStatus.CLOSED]: { bg: '#e5e7eb', text: '#374151' },
  [TicketStatus.CANCELLED]: { bg: '#fee2e2', text: '#991b1b' }
};

const isTicketPriority = (value: unknown): value is TicketPriority => (
  typeof value === 'string' && Object.values(TicketPriority).includes(value as TicketPriority)
);

const isTicketStatus = (value: unknown): value is TicketStatus => (
  typeof value === 'string' && Object.values(TicketStatus).includes(value as TicketStatus)
);

const isTicketCategory = (value: unknown): value is TicketCategory => (
  typeof value === 'string' && Object.values(TicketCategory).includes(value as TicketCategory)
);

const normalizePriority = (value: unknown): TicketPriority => (
  isTicketPriority(value) ? value : TicketPriority.MEDIUM
);

const normalizeStatus = (value: unknown): TicketStatus => (
  isTicketStatus(value) ? value : TicketStatus.OPEN
);

const normalizeCategory = (value: unknown): TicketCategory => (
  isTicketCategory(value) ? value : TicketCategory.OTHER
);

const TicketsScreen = ({ route }: any) => {
  const { userData, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingTicketId, setChangingTicketId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const normalizedUsername = userData?.username?.trim().toLowerCase() || '';
  const canManageTicketStatus = normalizedUsername === 'lsolis';
  const canViewAllTickets = isAdmin || canManageTicketStatus;
  const currentUserDisplayName = userData?.name || userData?.username || 'Usuario';

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.OTHER,
    company: (userData?.company || Company.GRUPO_AMEX) as Company
  });

  useEffect(() => {
    if (userData?.company && !isAdmin) {
      setForm((prev) => ({ ...prev, company: userData.company as Company }));
    }
  }, [userData?.company, isAdmin]);

  const loadTickets = useCallback(async () => {
    if (!userData) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      const baseData = await getTickets(canViewAllTickets ? undefined : { company: userData.company as Company });
      if (canViewAllTickets) {
        setTickets(baseData);
        return;
      }

      const userIdentifiers = new Set<string>([
        userData.id,
        userData.username,
        userData.name
      ].filter(Boolean) as string[]);

      const filtered = baseData.filter((ticket) => (
        userIdentifiers.has(ticket.createdBy) || ticket.createdByName === userData.name
      ));

      setTickets(filtered);
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'No se pudieron cargar los tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canViewAllTickets, userData]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (route?.params?.openCreate) {
      setShowForm(true);
    }
  }, [route?.params?.openCreate]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      priority: TicketPriority.MEDIUM,
      category: TicketCategory.OTHER,
      company: (userData?.company || Company.GRUPO_AMEX) as Company
    });
  };

  const handleCreateTicket = async () => {
    const title = form.title.trim();
    const description = form.description.trim();

    if (!userData?.id) {
      Alert.alert('Sesión requerida', 'Inicia sesión para crear tickets');
      return;
    }

    if (title.length < 5) {
      Alert.alert('Dato requerido', 'Captura un título más descriptivo');
      return;
    }

    if (description.length < 10) {
      Alert.alert('Dato requerido', 'Agrega más detalle al problema');
      return;
    }

    setSaving(true);
    try {
      await createTicket({
        title,
        description,
        category: form.category,
        priority: form.priority,
        company: (isAdmin ? form.company : (userData.company as Company)) || Company.GRUPO_AMEX,
        status: TicketStatus.OPEN,
        createdBy: userData.id,
        createdByName: userData.name || userData.username || 'Usuario'
      });

      Alert.alert('Ticket creado', 'Tu solicitud se registró correctamente');
      setShowForm(false);
      resetForm();
      setLoading(true);
      await loadTickets();
    } catch (error: any) {
      console.error('Error creating mobile ticket:', error);
      Alert.alert('Error', error?.message || 'No se pudo crear el ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTicketStatus = async (ticket: Ticket, newStatus: TicketStatus) => {
    if (!userData?.id) {
      Alert.alert('Sesión requerida', 'Inicia sesión para actualizar tickets');
      return;
    }

    if (!canManageTicketStatus) {
      Alert.alert('Sin permisos', 'Solo el perfil lsolis puede cerrar o actualizar tickets desde celular.');
      return;
    }

    const currentStatus = normalizeStatus((ticket as any).status);
    if (currentStatus === newStatus) return;

    setChangingTicketId(ticket.id);
    try {
      await updateTicket(ticket.id, { status: newStatus });

      await addTicketComment(ticket.id, {
        userId: userData.id,
        userName: currentUserDisplayName,
        text: `Estado cambiado a: ${STATUS_LABELS[newStatus]} (móvil)`
      });

      await triggerTicketStatusChange(
        { ...ticket, status: newStatus },
        currentStatus,
        userData.id,
        currentUserDisplayName
      );

      Alert.alert('Ticket actualizado', `El ticket ahora está: ${STATUS_LABELS[newStatus]}`);
      setLoading(true);
      await loadTickets();
    } catch (error: any) {
      console.error('Error updating mobile ticket status:', error);
      Alert.alert('Error', error?.message || 'No se pudo actualizar el ticket');
    } finally {
      setChangingTicketId(null);
    }
  };

  const handleCloseTicket = (ticket: Ticket) => {
    const currentStatus = normalizeStatus((ticket as any).status);
    if (currentStatus === TicketStatus.CLOSED || currentStatus === TicketStatus.CANCELLED) {
      return;
    }

    Alert.alert(
      'Cerrar ticket',
      `¿Deseas cerrar el ticket ${ticket.ticketNumber || ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          style: 'destructive',
          onPress: () => {
            void handleChangeTicketStatus(ticket, TicketStatus.CLOSED);
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadTickets();
  };

  const visibleTickets = useMemo(() => tickets, [tickets]);

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
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowForm((prev) => !prev)}
      >
        <Text style={styles.createButtonText}>
          {showForm ? 'Cancelar nuevo ticket' : 'Crear ticket desde celular'}
        </Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nuevo ticket</Text>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
            placeholder="Ej: No puedo conectarme al correo"
          />

          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={form.description}
            onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="Describe qué pasa, desde cuándo y qué intentaste"
            multiline
          />

          <Text style={styles.label}>Prioridad</Text>
          <View style={styles.optionsRow}>
            {Object.values(TicketPriority).map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[styles.optionChip, form.priority === priority && styles.optionChipSelected]}
                onPress={() => setForm((prev) => ({ ...prev, priority }))}
              >
                <Text style={[styles.optionChipText, form.priority === priority && styles.optionChipTextSelected]}>
                  {PRIORITY_LABELS[priority]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.optionsRow}>
            {Object.values(TicketCategory).map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.optionChip, form.category === category && styles.optionChipSelected]}
                onPress={() => setForm((prev) => ({ ...prev, category }))}
              >
                <Text style={[styles.optionChipText, form.category === category && styles.optionChipTextSelected]}>
                  {CATEGORY_LABELS[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isAdmin && (
            <>
              <Text style={styles.label}>Empresa</Text>
              <View style={styles.optionsRow}>
                {Object.values(Company).map((company) => (
                  <TouchableOpacity
                    key={company}
                    style={[styles.optionChip, form.company === company && styles.optionChipSelected]}
                    onPress={() => setForm((prev) => ({ ...prev, company }))}
                  >
                    <Text style={[styles.optionChipText, form.company === company && styles.optionChipTextSelected]}>
                      {company}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.buttonDisabled]}
            onPress={() => { void handleCreateTicket(); }}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>{saving ? 'Guardando...' : 'Guardar ticket'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {visibleTickets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hay tickets registrados</Text>
        </View>
      ) : (
        visibleTickets.map((ticket) => (
          <View key={ticket.id} style={styles.card}>
            {(() => {
              const safePriority = normalizePriority((ticket as any).priority);
              const safeStatus = normalizeStatus((ticket as any).status);
              const safeCategory = normalizeCategory((ticket as any).category);
              const priorityStyle = PRIORITY_STYLES[safePriority] || PRIORITY_STYLES[TicketPriority.MEDIUM] || { bg: '#e5e7eb', text: '#111827' };
              const statusStyle = STATUS_STYLES[safeStatus] || STATUS_STYLES[TicketStatus.OPEN] || { bg: '#dcfce7', text: '#166534' };

              return (
                <>
                  <View style={styles.cardHeader}>
                    <Text style={styles.ticketNumber}>{ticket.ticketNumber || 'Sin folio'}</Text>
                    <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
                        {PRIORITY_LABELS[safePriority]}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.title}>{ticket.title}</Text>
                  <Text style={styles.description}>{ticket.description}</Text>

                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {STATUS_LABELS[safeStatus]}
                      </Text>
                    </View>
                    <Text style={styles.metaText}>{CATEGORY_LABELS[safeCategory]}</Text>
                  </View>

                  <Text style={styles.footerText}>
                    {ticket.company} • {ticket.createdByName || 'Usuario'}
                  </Text>

                  {canManageTicketStatus && safeStatus !== TicketStatus.CLOSED && safeStatus !== TicketStatus.CANCELLED && (
                    <View style={styles.actionsRow}>
                      {safeStatus !== TicketStatus.IN_PROGRESS && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.progressButton, changingTicketId === ticket.id && styles.buttonDisabled]}
                          disabled={changingTicketId === ticket.id}
                          onPress={() => { void handleChangeTicketStatus(ticket, TicketStatus.IN_PROGRESS); }}
                        >
                          <Text style={styles.actionButtonText}>En progreso</Text>
                        </TouchableOpacity>
                      )}

                      {safeStatus !== TicketStatus.RESOLVED && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.resolveButton, changingTicketId === ticket.id && styles.buttonDisabled]}
                          disabled={changingTicketId === ticket.id}
                          onPress={() => { void handleChangeTicketStatus(ticket, TicketStatus.RESOLVED); }}
                        >
                          <Text style={styles.actionButtonText}>Resolver</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionButton, styles.closeButton, changingTicketId === ticket.id && styles.buttonDisabled]}
                        disabled={changingTicketId === ticket.id}
                        onPress={() => { handleCloseTicket(ticket); }}
                      >
                        <Text style={styles.actionButtonText}>
                          {changingTicketId === ticket.id ? 'Actualizando...' : 'Cerrar ticket'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
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
    paddingBottom: 24
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  createButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  label: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
    fontSize: 14
  },
  textarea: {
    minHeight: 95,
    textAlignVertical: 'top'
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  optionChipSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb'
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155'
  },
  optionChipTextSelected: {
    color: '#ffffff'
  },
  submitButton: {
    marginTop: 12,
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ticketNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280'
  },
  title: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4
  },
  description: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 9
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  metaText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600'
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280'
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  progressButton: {
    backgroundColor: '#a16207'
  },
  resolveButton: {
    backgroundColor: '#1d4ed8'
  },
  closeButton: {
    backgroundColor: '#b91c1c'
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700'
  }
});

export default TicketsScreen;
