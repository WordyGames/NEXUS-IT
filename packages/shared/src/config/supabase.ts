import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env';

// Las credenciales se leen desde variables de entorno (nunca hardcodeadas).
// Vite (desktop): VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// Expo (mobile):  EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = requireEnv('Supabase URL', 'VITE_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = requireEnv('Supabase anon key', 'VITE_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'nexus-it-session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
