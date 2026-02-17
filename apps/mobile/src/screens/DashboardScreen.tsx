import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Company, getEquipmentStats, getTicketStats } from '@nexus-it/shared';

const DashboardScreen = ({ navigation }: any) => {
  const { userData, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [equipmentStats, ticketStats] = await Promise.all([
        getEquipmentStats(),
        getTicketStats()
      ]);
      setStats({ equipment: equipmentStats, tickets: ticketStats });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Bienvenido, {userData?.name}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <Text style={styles.statLabel}>Equipos</Text>
          <Text style={styles.statValue}>{stats?.equipment.total || 0}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
          <Text style={styles.statLabel}>Tickets</Text>
          <Text style={styles.statValue}>{stats?.tickets.total || 0}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Empresas</Text>
        {Object.values(Company).map((company) => (
          <View key={company} style={styles.companyCard}>
            <Text style={styles.companyName}>{company}</Text>
            <Text style={styles.companyCount}>
              {stats?.equipment.byCompany?.[company] || 0} equipos
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Equipment')}
        >
          <Text style={styles.actionButtonText}>Ver Equipos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Tickets')}
        >
          <Text style={styles.actionButtonText}>Ver Tickets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MobileEnrollment')}
        >
          <Text style={styles.actionButtonText}>Alta de Equipo (Celular)</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  statValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  companyCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '500',
  },
  companyCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    padding: 20,
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;
