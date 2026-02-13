
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mengambil variabel lingkungan yang di-inject oleh Vite/Hosting provider
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  !!supabaseUrl && 
  supabaseUrl !== '' && 
  supabaseUrl !== 'undefined' &&
  !!supabaseAnonKey && 
  supabaseAnonKey !== '' && 
  supabaseAnonKey !== 'undefined';

if (!isSupabaseConfigured) {
  console.warn("⚠️ PERINGATAN: Database Cloud Belum Terhubung. Data hanya tersimpan di HP ini saja.");
} else {
  console.log("✅ SISTEM CLOUD AKTIF: Terhubung ke " + supabaseUrl);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }) 
  : null;
