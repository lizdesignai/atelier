// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Validação robusta antes da inicialização
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO DE INFRAESTRUTURA: Chaves do Supabase ausentes no ambiente.");
  console.error(`URL presente: ${!!supabaseUrl} | Key presente: ${!!supabaseKey}`);
  
  // No Build da Vercel, isso interromperá o processo com uma mensagem clara
  if (process.env.NODE_ENV === 'production') {
     throw new Error("Supabase Key ou URL não encontradas. Verifique as Environment Variables na Vercel.");
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');