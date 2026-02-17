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
import {
  Company,
  Ticket,
  getEquipment,
  getEquipmentStats,
  getTicketStats,
  getTickets
} from '@nexus-it/shared';

const DashboardScreen = ({ navigation }: any) => {
  const { userData, logout, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [userEquipmentCount, setUserEquipmentCount] = useState(0);
  const [userTicketsCount, setUserTicketsCount] = useState(0);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStats();
  }, [isAdmin, userData?.id, userData?.username, userData?.name]);

  const getTicketSortValue = (ticket: Ticket) => {
    const createdAt: any = ticket.createdAt;
    if (!createdAt) return 0;
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === 'object' && 'toDate' in createdAt) {
      return createdAt.toDate().getTime();
    }
    if (typeof createdAt === 'object' && 'seconds' in createdAt) {
      return createdAt.seconds * 1000;
    }
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const loadUserTickets = async () => {
    if (!userData) return [] as Ticket[];

    const queries: Promise<Ticket[]>[] = [];

    if (userData.id) {
      queries.push(getTickets({ createdBy: userData.id }));
    }

    if (userData.username && userData.username !== userData.id) {
      queries.push(getTickets({ createdBy: userData.username }));
    }

    if (userData.name) {
      queries.push(getTickets({ createdByName: userData.name }));
    }

    const results = await Promise.all(queries);
    const unique = new Map<string, Ticket>();

    results.flat().forEach((ticket) => {
      unique.set(ticket.id, ticket);
    });

    let merged = Array.from(unique.values());

    if (userData.company) {
      merged = merged.filter((ticket) => ticket.company === userData.company);
    }

    merged.sort((a, b) => getTicketSortValue(b) - getTicketSortValue(a));
    return merged;
  };

  const loadStats = async () => {
    try {
      const [equipmentStats, ticketStats] = await Promise.all([
        getEquipmentStats(),
        getTicketStats()
      ]);
      setStats({ equipment: equipmentStats, tickets: ticketStats });

      if (!isAdmin && userData?.id) {
        const [assignedEquipment, userTickets] = await Promise.all([
          getEquipment({ assignedTo: userData.id }),
          loadUserTickets()
        ]);

        setUserEquipmentCount(assignedEquipment.length);
        setUserTicketsCount(userTickets.length);
        setRecentTickets(userTickets.slice(0, 5));
      } else {
        setUserEquipmentCount(0);
        setUserTicketsCount(0);
        setRecentTickets([]);
      }
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
          <Text style={styles.statLabel}>{isAdmin ? 'Equipos' : 'Mis Equipos'}</Text>
          <Text style={styles.statValue}>
            {isAdmin ? (stats?.equipment.total || 0) : userEquipmentCount}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
          <Text style={styles.statLabel}>{isAdmin ? 'Tickets' : 'Mis Tickets'}</Text>
          <Text style={styles.statValue}>
            {isAdmin ? (stats?.tickets.total || 0) : userTicketsCount}
          </Text>
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
          <Text style={styles.actionButtonText}>{isAdmin ? 'Ver Equipos' : 'Mis Equipos'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Tickets')}
        >
          <Text style={styles.actionButtonText}>Ver Tickets</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MobileEnrollment')}
          >
            <Text style={styles.actionButtonText}>Alta de Equipo (Celular)</Text>
          </TouchableOpacity>
        )}

        {!isAdmin && recentTickets.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>Tickets Recientes</Text>
            {recentTickets.map((ticket) => (
              <View key={ticket.id} style={styles.recentTicketCard}>
                <Text style={styles.recentTicketNumber}>#{ticket.ticketNumber}</Text>
                <Text style={styles.recentTicketTitle}>{ticket.title}</Text>
                <Text style={styles.recentTicketMeta}>{ticket.company}</Text>
              </View>
            ))}
          </View>
        )}

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
  recentSection: {
    marginTop: 8,
    gap: 8
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  recentTicketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  recentTicketNumber: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
    marginBottom: 2
  },
  recentTicketTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600'
  },
  recentTicketMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280'
  }
});

export default DashboardScreen;
