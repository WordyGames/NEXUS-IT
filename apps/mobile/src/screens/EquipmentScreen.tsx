import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import {
  getEquipment,
  Equipment,
  User,
  UserPermission,
  subscribeEquipmentChanges,
  getUsers,
  getUserById,
  createEquipmentLoan,
  getActiveLoanForEquipment,
  returnEquipmentLoan
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { generateCartaResponsivaMobile } from '../utils/cartaResponsivaMobile';

const EquipmentScreen = ({ navigation }: any) => {
  const { userData, isAdmin, hasPermission } = useAuth();
  const canManageEquipment = isAdmin || hasPermission(UserPermission.EQUIPMENT_MANAGE);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loanTarget, setLoanTarget] = useState<Equipment | null>(null);
  const [loanBorrowerId, setLoanBorrowerId] = useState('');
  const [loanDays, setLoanDays] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    void loadEquipment();
  }, [canManageEquipment, userData?.id]);

  useEffect(() => {
    if (!canManageEquipment) return;
    void getUsers().then(setUsers).catch((error) => console.error('Error loading users:', error));
  }, [canManageEquipment]);

  useEffect(() => {
    if (!userData?.id) return;

    const unsubscribe = subscribeEquipmentChanges(
      async () => {
        await loadEquipment(false);
      },
      {
        onError: (error) => {
          console.error('Error subscribing to mobile equipment changes:', error);
        }
      }
    );

    return unsubscribe;
  }, [canManageEquipment, userData?.id]);

  const loadEquipment = async (blocking = true) => {
    try {
      if (blocking) {
        setLoading(true);
      }
      if (!userData?.id) {
        setEquipment([]);
        return;
      }

      const data = await getEquipment(canManageEquipment ? undefined : { assignedTo: userData.id });
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      if (blocking) {
        setLoading(false);
      }
    }
  };

  const getDateFromTimestamp = (dateOrTimestamp: Date | any): string => {
    if (!dateOrTimestamp) return '';
    if (dateOrTimestamp instanceof Date) {
      return dateOrTimestamp.toLocaleDateString();
    }
    if (dateOrTimestamp.seconds) {
      return new Date(dateOrTimestamp.seconds * 1000).toLocaleDateString();
    }
    return '';
  };

  const getStatusLabel = (status: Equipment['status']) => {
    if (status === 'active') return 'Activo';
    if (status === 'maintenance') return 'Mantenimiento';
    if (status === 'inactive') return 'Inactivo';
    return 'Retirado';
  };

  const getStatusStyle = (status: Equipment['status']) => {
    if (status === 'active') return styles.badgeActive;
    if (status === 'maintenance') return styles.badgeMaintenance;
    return styles.badgeInactive;
  };

  const openLoanModal = (eq: Equipment) => {
    setLoanTarget(eq);
    setLoanBorrowerId(eq.assignedTo || '');
    setLoanDays('');
    setLoanNotes('');
  };

  const closeLoanModal = () => {
    setLoanTarget(null);
  };

  const handleConfirmLoan = async () => {
    if (!loanTarget) return;
    const days = Number(loanDays);
    const borrower = users.find((u) => u.id === loanBorrowerId);

    if (!borrower) {
      Alert.alert('Falta el usuario', 'Selecciona a quién se le presta el equipo');
      return;
    }
    if (!days || days <= 0) {
      Alert.alert('Duración inválida', 'La duración debe ser al menos 1 día');
      return;
    }

    setLoanSubmitting(true);
    try {
      // Traer datos actualizados directo de la BD (no del arreglo `users` en
      // memoria) para que la carta refleje puesto/departamento recién editados.
      const freshBorrower = (await getUserById(borrower.id)) || borrower;
      const previousAssignedUser = loanTarget.assignedTo
        ? await getUserById(loanTarget.assignedTo)
        : undefined;

      const loan = await createEquipmentLoan({
        equipmentId: loanTarget.id,
        company: loanTarget.company,
        borrowerId: freshBorrower.id,
        borrowerName: freshBorrower.name,
        days,
        notes: loanNotes.trim() || undefined,
        generatedBy: userData?.id,
        generatedByName: userData?.name || 'Sistema'
      });

      await generateCartaResponsivaMobile({
        employee: freshBorrower,
        equipment: loanTarget,
        generatedBy: userData?.name || 'Sistema',
        notes: loanNotes.trim() || undefined,
        loan: {
          startDate: loan.loanDate,
          dueDate: loan.dueDate,
          days: loan.days,
          previousAssignedToName: previousAssignedUser?.name
        }
      });

      closeLoanModal();
      await loadEquipment(false);
    } catch (error) {
      console.error('Error creating loan:', error);
      Alert.alert('Error', 'No se pudo registrar el préstamo');
    } finally {
      setLoanSubmitting(false);
    }
  };

  const handleReturnLoan = (eq: Equipment) => {
    Alert.alert(
      'Registrar devolución',
      `¿Confirmas que "${eq.name}" fue devuelto? Se restaurará la asignación anterior.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setReturningId(eq.id);
            try {
              const activeLoan = await getActiveLoanForEquipment(eq.id);
              if (!activeLoan) {
                Alert.alert('Sin préstamo activo', 'Este equipo no tiene un préstamo activo registrado');
                return;
              }
              await returnEquipmentLoan(activeLoan.id);
              await loadEquipment(false);
            } catch (error) {
              console.error('Error returning loan:', error);
              Alert.alert('Error', 'No se pudo registrar la devolución');
            } finally {
              setReturningId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{canManageEquipment ? 'Equipos' : 'Mis Equipos'}</Text>
        <Text style={styles.subtitle}>
          {canManageEquipment
            ? 'Gestión global de inventario'
            : `Equipos asignados a ${userData?.name || 'usuario'}`}
        </Text>
      </View>

      {canManageEquipment && (
        <TouchableOpacity
          style={styles.enrollButton}
          onPress={() => navigation.navigate('MobileEnrollment')}
        >
          <Text style={styles.enrollButtonText}>Dar de alta teléfono / equipo desde este celular</Text>
        </TouchableOpacity>
      )}

      {equipment.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {canManageEquipment ? 'No hay equipos registrados' : 'No tienes equipos asignados'}
          </Text>
          <Text style={styles.emptyText}>
            {canManageEquipment
              ? 'Registra el primer equipo para comenzar el inventario.'
              : 'Contacta al administrador para solicitar equipos.'}
          </Text>
        </View>
      ) : (
        equipment.map((eq) => (
          <View key={eq.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{eq.name}</Text>
              <View style={[styles.badge, getStatusStyle(eq.status)]}>
                <Text style={styles.badgeText}>{getStatusLabel(eq.status)}</Text>
              </View>
            </View>

            <Text style={styles.company}>{eq.company}</Text>

            <View style={styles.specs}>
              <Text style={styles.spec}>Tipo: {eq.type}</Text>
              {eq.specs.serialNumber && <Text style={styles.spec}>Serie: {eq.specs.serialNumber}</Text>}
              <Text style={styles.spec}>Ubicación: {eq.location}</Text>
              {eq.specs.cpu && <Text style={styles.spec}>CPU: {eq.specs.cpu}</Text>}
              {eq.specs.ram && <Text style={styles.spec}>RAM: {eq.specs.ram}</Text>}
              {eq.specs.storage && <Text style={styles.spec}>Almacenamiento: {eq.specs.storage}</Text>}
            </View>

            {eq.warrantyExpiration && (
              <Text style={styles.warrantyText}>
                Garantía vence: {getDateFromTimestamp(eq.warrantyExpiration)}
              </Text>
            )}

            {eq.onLoan && eq.loanDueDate && (
              <Text style={styles.loanText}>
                Préstamo temporal · vence {getDateFromTimestamp(eq.loanDueDate)}
              </Text>
            )}

            {canManageEquipment && (
              <View style={styles.loanActions}>
                {!eq.onLoan ? (
                  <TouchableOpacity style={styles.loanButton} onPress={() => openLoanModal(eq)}>
                    <Text style={styles.loanButtonText}>Prestar por días</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.returnButton, returningId === eq.id && styles.buttonDisabled]}
                    onPress={() => handleReturnLoan(eq)}
                    disabled={returningId === eq.id}
                  >
                    <Text style={styles.returnButtonText}>
                      {returningId === eq.id ? 'Registrando...' : 'Registrar devolución'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))
      )}

      <Modal visible={!!loanTarget} animationType="slide" transparent onRequestClose={closeLoanModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Prestar equipo por días</Text>
            {loanTarget && (
              <Text style={styles.modalSubtitle}>
                {loanTarget.name} · se generará la carta responsiva de préstamo
              </Text>
            )}

            <Text style={styles.label}>Prestar a</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assigneeRow}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.userChip, loanBorrowerId === user.id && styles.userChipSelected]}
                  onPress={() => setLoanBorrowerId(user.id)}
                >
                  <Text style={[styles.userChipText, loanBorrowerId === user.id && styles.userChipTextSelected]}>
                    {user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Duración (días)</Text>
            <TextInput
              style={styles.input}
              value={loanDays}
              onChangeText={setLoanDays}
              keyboardType="number-pad"
              placeholder="Ej. 30"
            />

            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={loanNotes}
              onChangeText={setLoanNotes}
              placeholder="Observaciones adicionales"
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, loanSubmitting && styles.buttonDisabled]}
                onPress={closeLoanModal}
                disabled={loanSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButtonModal, loanSubmitting && styles.buttonDisabled]}
                onPress={handleConfirmLoan}
                disabled={loanSubmitting}
              >
                <Text style={styles.primaryButtonText}>
                  {loanSubmitting ? 'Generando...' : 'Prestar y generar carta'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 15,
  },
  content: {
    paddingBottom: 20
  },
  header: {
    marginBottom: 12
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563'
  },
  enrollButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  badgeActive: {
    backgroundColor: '#16a34a'
  },
  badgeMaintenance: {
    backgroundColor: '#ca8a04'
  },
  badgeInactive: {
    backgroundColor: '#6b7280'
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10
  },
  company: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  specs: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  spec: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 3,
  },
  warrantyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280'
  },
  loanText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309'
  },
  loanActions: {
    marginTop: 10,
    flexDirection: 'row'
  },
  loanButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  loanButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  returnButton: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  returnButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 18
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  assigneeRow: {
    marginBottom: 10
  },
  userChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginRight: 8
  },
  userChipSelected: {
    borderColor: '#1d4ed8',
    backgroundColor: '#dbeafe'
  },
  userChipText: {
    fontSize: 12,
    color: '#374151'
  },
  userChipTextSelected: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    paddingVertical: 10,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 13
  },
  primaryButtonModal: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  emptyCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 16
  },
  emptyTitle: {
    color: '#1e3a8a',
    fontWeight: '700',
    marginBottom: 6
  },
  emptyText: {
    color: '#1d4ed8',
    fontSize: 13
  }
});

export default EquipmentScreen;
