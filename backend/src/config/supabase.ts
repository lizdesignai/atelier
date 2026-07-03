import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase Environment Variables');
}

// O Backend usa a Service Role Key para contornar RLS em certas rotas analíticas, 
// mas deve respeitar a autenticação para operações sensíveis de usuários se aplicável.
export const supabase = createClient(supabaseUrl, supabaseKey);
