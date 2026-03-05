import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const MOBILE_LAST_PROFILE_KEY = 'nexus-it-mobile-last-profile';

type RememberedProfile = {
  username: string;
  name?: string;
};

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberedProfile, setRememberedProfile] = useState<RememberedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, currentSession } = useAuth();

  useEffect(() => {
    if (currentSession) {
      navigation.replace('Dashboard');
    }
  }, [currentSession, navigation]);

  useEffect(() => {
    const loadRememberedProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(MOBILE_LAST_PROFILE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as RememberedProfile;
        if (!parsed?.username) return;

        setRememberedProfile(parsed);
        setUsername(parsed.username);
      } catch (error) {
        console.error('Error loading remembered profile:', error);
      }
    };

    void loadRememberedProfile();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();

    setLoading(true);
    try {
      await login(normalizedUsername, password);

      await AsyncStorage.setItem(
        MOBILE_LAST_PROFILE_KEY,
        JSON.stringify({
          username: normalizedUsername,
          name: rememberedProfile?.name || ''
        })
      );

      navigation.replace('Dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NEXUS IT</Text>
        <Text style={styles.subtitle}>Sistema de Gestión TI</Text>

        {!!rememberedProfile?.username && (
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>Perfil guardado</Text>
            <Text style={styles.profileText}>
              {rememberedProfile.name
                ? `${rememberedProfile.name} (${rememberedProfile.username})`
                : rememberedProfile.username}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Crear cuenta nueva</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 40,
  },
  profileCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#93c5fd'
  },
  profileTitle: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2
  },
  profileText: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '600'
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default LoginScreen;
