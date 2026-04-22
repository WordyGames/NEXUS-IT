import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { assertMobileNotificationEnv, mobileEnv } from '../config/env';
import { 
  Maintenance, 
  getPendingTimeConfirmationMaintenancesForUser,
  confirmMaintenanceTime,
  logRuntimeError,
} from '@nexus-it/shared';

const toJSDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const to12hFrom24h = (time24?: string) => {
  if (!time24 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time24)) return '09:00 AM';
  const [hourStr, minute] = time24.split(':');
  const hour24 = Number(hourStr);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${period}`;
};

const to24hFrom12h = (time12: string) => {
  const normalized = time12.trim().toUpperCase();
  const match = normalized.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2];
  const period = match[3];

  let hour24 = hour % 12;
  if (period === 'PM') hour24 += 12;

  return `${String(hour24).padStart(2, '0')}:${minute}`;
};

const MaintenanceConfirmationScreen = ({ navigation }: any) => {
  const { userData } = useAuth();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTimeText, setSelectedTimeText] = useState('09:00 AM');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    void loadPendingMaintenances();
  }, [userData?.id]);

  const loadPendingMaintenances = async () => {
    try {
      setLoading(true);
      const data = await getPendingTimeConfirmationMaintenancesForUser(userData?.id, false);
      setMaintenances(data);
    } catch (error) {
      logRuntimeError('mobile', 'Error loading maintenances', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTime = async () => {
    if (!selectedMaintenance) return;

    try {
      setConfirmingId(selectedMaintenance.id);
      
      const timeString = to24hFrom12h(selectedTimeText);

      if (!timeString) {
        Alert.alert('Hora inválida', 'Usa formato de 12 horas, por ejemplo 09:30 AM.');
        return;
      }

      await confirmMaintenanceTime(
        selectedMaintenance.id,
        timeString,
        userData?.id || '',
        userData?.name || ''
      );

      // Enviar email de notificación al admin (no bloqueante)
      try {
        assertMobileNotificationEnv();

        await fetch(
          `${mobileEnv.apiBaseUrl}/api/notifications/maintenance-time-confirmed-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminEmail: mobileEnv.adminEmail,
              adminName: 'Luis',
              maintenanceId: selectedMaintenance.id,
              equipmentName: selectedMaintenance.equipmentName,
              company: selectedMaintenance.company,
              title: selectedMaintenance.title,
              scheduledDate: selectedMaintenance.scheduledDate,
              scheduledTime: timeString,
              confirmedByName: userData?.name || 'Usuario',
            }),
          }
        );
      } catch (emailError) {
        logRuntimeError('mobile', 'Error sending confirmation email', emailError);
        // No bloquear si hay error en email
      }

      // Actualizar lista local
      setMaintenances(maintenances.filter((m) => m.id !== selectedMaintenance.id));
      setShowTimeModal(false);
      setSelectedMaintenance(null);
      
      // Mostrar confirmación
      Alert.alert('✅ Confirmado', 'La hora se guardó correctamente.');
    } catch (error) {
      logRuntimeError('mobile', 'Error confirming maintenance time', error);
      Alert.alert('Error', 'No se pudo confirmar la hora.');
    } finally {
      setConfirmingId(null);
    }
  };

  const formatDate = (date: Date | any) => {
    const d = toJSDate(date);
    if (!d) return 'Fecha no disponible';
    return d.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Confirmación de Horas</Text>
          <Text style={styles.subtitle}>
            {maintenances.length === 0
              ? 'No hay mantenimientos pendientes'
              : `${maintenances.length} pendiente(s) de confirmar`}
          </Text>
        </View>

        {maintenances.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>✅ No hay mantenimientos pendientes</Text>
          </View>
        ) : (
          <View style={styles.maintenancesList}>
            {maintenances.map((maintenance) => (
              <TouchableOpacity
                key={maintenance.id}
                style={styles.maintenanceCard}
                onPress={() => {
                  setSelectedMaintenance(maintenance);
                  setSelectedTimeText(to12hFrom24h(maintenance.scheduledTime));
                  setShowTimeModal(true);
                }}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.equipmentName}>{maintenance.equipmentName}</Text>
                  <Text style={styles.maintenanceTitle}>{maintenance.title}</Text>
                  <Text style={styles.scheduledDate}>
                    📅 {formatDate(maintenance.scheduledDate)}
                  </Text>
                  <Text style={styles.type}>Tipo: {maintenance.type}</Text>
                </View>
                <View style={styles.actionButton}>
                  <Text style={styles.buttonText}>Confirmar Hora →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para confirmar hora */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {selectedMaintenance && (
              <>
                <Text style={styles.modalTitle}>Confirmar Hora de Mantenimiento</Text>

                <View style={styles.modalInfo}>
                  <Text style={styles.infoLabel}>Equipo:</Text>
                  <Text style={styles.infoValue}>{selectedMaintenance.equipmentName}</Text>

                  <Text style={styles.infoLabel}>Fecha Programada:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedMaintenance.scheduledDate)}
                  </Text>

                  <Text style={styles.infoLabel}>Descripción:</Text>
                  <Text style={styles.infoValue}>{selectedMaintenance.description}</Text>
                </View>

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timeLabel}>Selecciona la hora:</Text>
                  <Text style={styles.timeHelpText}>
                    Escribe la hora en formato 12 horas, por ejemplo 09:30 AM.
                  </Text>

                  <TextInput
                    value={selectedTimeText}
                    onChangeText={setSelectedTimeText}
                    placeholder="hh:mm AM/PM"
                    placeholderTextColor="#9ca3af"
                    keyboardType="default"
                    style={styles.timeInput}
                    maxLength={8}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setShowTimeModal(false)}
                    disabled={confirmingId === selectedMaintenance.id}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.confirmButton,
                      confirmingId === selectedMaintenance.id && styles.buttonDisabled,
                    ]}
                    onPress={handleConfirmTime}
                    disabled={confirmingId === selectedMaintenance.id}
                  >
                    {confirmingId === selectedMaintenance.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Confirmar Hora</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  maintenancesList: {
    padding: 16,
    gap: 12,
  },
  maintenanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  maintenanceTitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  scheduledDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  type: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginRight: 32,
  },
  modalInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  timePickerContainer: {
    marginBottom: 24,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  timeHelpText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
  },
  timeDisplay: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  timeDisplayText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default MaintenanceConfirmationScreen;
