import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Atenção aqui: o nome exato que está no seu .env.local (sem o 1)
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);