import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { getEquipment, Equipment } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const EquipmentScreen = ({ navigation }: any) => {
  const { userData, isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadEquipment();
  }, [isAdmin, userData?.id]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      if (!userData?.id) {
        setEquipment([]);
        return;
      }

      const data = await getEquipment(isAdmin ? undefined : { assignedTo: userData.id });
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>{isAdmin ? 'Equipos' : 'Mis Equipos'}</Text>
        <Text style={styles.subtitle}>
          {isAdmin
            ? 'Gestion global de inventario'
            : `Equipos asignados a ${userData?.name || 'usuario'}`}
        </Text>
      </View>

      {isAdmin && (
        <TouchableOpacity
          style={styles.enrollButton}
          onPress={() => navigation.navigate('MobileEnrollment')}
        >
          <Text style={styles.enrollButtonText}>Dar de alta telefono / equipo desde este celular</Text>
        </TouchableOpacity>
      )}

      {equipment.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {isAdmin ? 'No hay equipos registrados' : 'No tienes equipos asignados'}
          </Text>
          <Text style={styles.emptyText}>
            {isAdmin
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
          </View>
        ))
      )}
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
