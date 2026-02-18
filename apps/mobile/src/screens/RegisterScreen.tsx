import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Company } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    position: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: Company.GRUPO_AMEX
  });

  const handleRegister = async () => {
    const name = form.name.trim();
    const position = form.position.trim();
    const username = form.username.trim().toLowerCase();
    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();
    const phone = form.phone.trim();

    if (name.length < 3) {
      Alert.alert('Dato requerido', 'Captura el nombre completo');
      return;
    }

    if (position.length < 2) {
      Alert.alert('Dato requerido', 'Captura el puesto del empleado');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Dato requerido', 'El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      Alert.alert('Usuario inválido', 'Usa solo letras minúsculas, números, punto, guion y guion bajo');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Dato requerido', 'La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (phone.length < 8) {
      Alert.alert('Dato requerido', 'Captura un teléfono válido para registrar la cuenta');
      return;
    }

    setLoading(true);
    try {
      await register({
        username,
        password,
        name,
        position,
        company: form.company,
        phone
      });

      navigation.replace('Dashboard');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Crear Cuenta</Text>
      <Text style={styles.subtitle}>Registro rápido para empleados desde celular</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          placeholder="Ej: Óscar Pérez"
        />

        <Text style={styles.label}>Puesto</Text>
        <TextInput
          style={styles.input}
          value={form.position}
          onChangeText={(value) => setForm((prev) => ({ ...prev, position: value }))}
          placeholder="Ej: Mensajero"
        />

        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input}
          value={form.username}
          onChangeText={(value) => setForm((prev) => ({ ...prev, username: value.toLowerCase() }))}
          placeholder="Ej: oscar.mensajero"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={form.password}
          onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput
          style={styles.input}
          value={form.confirmPassword}
          onChangeText={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
          placeholder="Repite la contraseña"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          placeholder="Ej: 8112345678"
          keyboardType="phone-pad"
          inputMode="tel"
        />

        <Text style={styles.label}>Empresa</Text>
        <View style={styles.companyRow}>
          {Object.values(Company).map((company) => (
            <TouchableOpacity
              key={company}
              style={[styles.companyChip, form.company === company && styles.companyChipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, company }))}
            >
              <Text style={[styles.companyChipText, form.company === company && styles.companyChipTextSelected]}>
                {company}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={() => { void handleRegister(); }}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace('Login')}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0ecff'
  },
  content: {
    padding: 16,
    paddingBottom: 28
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 10
  },
  subtitle: {
    fontSize: 14,
    color: '#1f2937',
    marginTop: 4,
    marginBottom: 18
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    marginTop: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#ffffff'
  },
  companyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2
  },
  companyChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc'
  },
  companyChipSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8'
  },
  companyChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600'
  },
  companyChipTextSelected: {
    color: '#ffffff'
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default RegisterScreen;
