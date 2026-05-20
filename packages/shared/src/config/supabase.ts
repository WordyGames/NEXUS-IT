import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iwnbscekenptumanpjcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bmJzY2VrZW5wdHVtYW5wamNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzg2OTQsImV4cCI6MjA5NDg1NDY5NH0.7-YjXYAEXmkKGENNAWc99kplFrq7L8fQbPg1M0AhtNQ';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'nexus-it-session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
