import { createClient } from '@supabase/supabase-js';

// Acessar variáveis de ambiente de forma segura no cliente
const supabaseUrl = typeof window !== 'undefined' 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL 
  : process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variáveis de ambiente do Supabase não configuradas');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Criar cliente com valores padrão se não configurado (evita erro de inicialização)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
