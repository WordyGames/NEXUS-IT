import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, AppStateStatus, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import { AuthProvider } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import ChatScreen from './src/screens/ChatScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MobileEnrollmentScreen from './src/screens/MobileEnrollmentScreen';
import MaintenanceConfirmationScreen from './src/screens/MaintenanceConfirmationScreen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

const Stack = createNativeStackNavigator();

export default function App() {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(true);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkForRequiredUpdate = useCallback(async () => {
    if (__DEV__) {
      setIsCheckingUpdate(false);
      return;
    }

    if (!Updates.isEnabled || checkingRef.current) {
      setIsCheckingUpdate(false);
      return;
    }

    checkingRef.current = true;
    setIsCheckingUpdate(true);
    setUpdateError(null);

    try {
      const update = await Updates.checkForUpdateAsync();
      setUpdateRequired(update.isAvailable);
    } catch (error: any) {
      console.error('[OTA] Error checking update:', error);
      setUpdateError(error?.message || 'No se pudo verificar la actualización.');
    } finally {
      checkingRef.current = false;
      setIsCheckingUpdate(false);
    }
  }, []);

  const applyRequiredUpdate = useCallback(async () => {
    setIsApplyingUpdate(true);
    setUpdateError(null);

    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error: any) {
      console.error('[OTA] Error applying update:', error);
      setUpdateError(error?.message || 'No se pudo aplicar la actualización.');
      setIsApplyingUpdate(false);
    }
  }, []);

  useEffect(() => {
    void checkForRequiredUpdate();
  }, [checkForRequiredUpdate]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
      appStateRef.current = nextState;

      if (wasBackground && nextState === 'active') {
        void checkForRequiredUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForRequiredUpdate]);

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <View style={styles.appContainer}>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator initialRouteName="Login">
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: 'Crear Cuenta' }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'NEXUS IT' }}
              />
              <Stack.Screen 
                name="Equipment" 
                component={EquipmentScreen}
                options={{ title: 'Equipos' }}
              />
              <Stack.Screen
                name="MobileEnrollment"
                component={MobileEnrollmentScreen}
                options={{ title: 'Alta de Equipo (Móvil)' }}
              />
              <Stack.Screen 
                name="Tickets" 
                component={TicketsScreen}
                options={{ title: 'Tickets' }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ title: 'Chat de Soporte' }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Notificaciones' }}
              />
              <Stack.Screen
                name="MaintenanceConfirmation"
                component={MaintenanceConfirmationScreen}
                options={{ title: 'Confirmación de Horas' }}
              />
            </Stack.Navigator>
          </NavigationContainer>

          <Modal
            visible={updateRequired || isCheckingUpdate}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {}}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {isCheckingUpdate ? 'Verificando actualización' : 'Actualización requerida'}
                </Text>

                {isCheckingUpdate ? (
                  <View style={styles.centerRow}>
                    <ActivityIndicator size="small" color="#1d4ed8" />
                    <Text style={styles.modalText}>Comprobando versión más reciente...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.modalText}>
                      Detectamos una nueva versión de la app. Debes actualizar para continuar.
                    </Text>

                    {!!updateError && (
                      <Text style={styles.errorText}>{updateError}</Text>
                    )}

                    <TouchableOpacity
                      style={[styles.updateButton, isApplyingUpdate && styles.buttonDisabled]}
                      onPress={() => { void applyRequiredUpdate(); }}
                      disabled={isApplyingUpdate}
                    >
                      {isApplyingUpdate ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.updateButtonText}>Actualizar ahora</Text>
                      )}
                    </TouchableOpacity>

                    {!!updateError && (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => { void checkForRequiredUpdate(); }}
                      >
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  updateButton: {
    marginTop: 16,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  retryButton: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingVertical: 10,
    alignItems: 'center'
  },
  retryButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600'
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
    fontSize: 12
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
