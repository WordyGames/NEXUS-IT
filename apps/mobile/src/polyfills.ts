// Debe importarse ANTES que cualquier módulo de @nexus-it/shared.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo solo sustituye referencias estáticas a process.env.EXPO_PUBLIC_*;
// shared las lee de forma dinámica, así que se copian aquí a process.env.
const env = ((globalThis as any).process ??= { env: {} }).env ?? ((globalThis as any).process.env = {});
env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// El cliente de Supabase (shared) guarda la sesión en window.localStorage.
// En React Native no existe: se usa AsyncStorage para conservar la sesión.
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = AsyncStorage;
}
