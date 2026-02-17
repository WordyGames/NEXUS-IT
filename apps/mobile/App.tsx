import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import MobileEnrollmentScreen from './src/screens/MobileEnrollmentScreen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
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
              options={{ title: 'Alta de Equipo (Movil)' }}
            />
            <Stack.Screen 
              name="Tickets" 
              component={TicketsScreen}
              options={{ title: 'Tickets' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
