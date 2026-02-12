import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { getTickets, Ticket } from '@nexus-it/shared';

const TicketsScreen = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
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
      {tickets.map((ticket) => (
        <View key={ticket.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
            <Text style={[styles.badge, styles[`badge${ticket.priority}`]]}>
              {ticket.priority}
            </Text>
          </View>
          <Text style={styles.title}>{ticket.title}</Text>
          <Text style={styles.description}>{ticket.description}</Text>
          <View style={styles.footer}>
            <Text style={styles.status}>{ticket.status}</Text>
            <Text style={styles.company}>{ticket.company}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 15,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  badgelow: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  badgemedium: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgehigh: {
    backgroundColor: '#fed7aa',
    color: '#c2410c',
  },
  badgeurgent: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  status: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  company: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default TicketsScreen;
