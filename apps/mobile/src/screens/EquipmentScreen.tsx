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

const EquipmentScreen = ({ navigation }: any) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const data = await getEquipment();
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
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
      <TouchableOpacity
        style={styles.enrollButton}
        onPress={() => navigation.navigate('MobileEnrollment')}
      >
        <Text style={styles.enrollButtonText}>Dar de alta telefono / equipo desde este celular</Text>
      </TouchableOpacity>

      {equipment.map((eq) => (
        <View key={eq.id} style={styles.card}>
          <Text style={styles.name}>{eq.name}</Text>
          <Text style={styles.company}>{eq.company}</Text>
          <View style={styles.specs}>
            <Text style={styles.spec}>Tipo: {eq.type}</Text>
            {eq.specs.cpu && <Text style={styles.spec}>CPU: {eq.specs.cpu}</Text>}
            {eq.specs.ram && <Text style={styles.spec}>RAM: {eq.specs.ram}</Text>}
            {eq.specs.os && <Text style={styles.spec}>OS: {eq.specs.os}</Text>}
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
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
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
});

export default EquipmentScreen;
