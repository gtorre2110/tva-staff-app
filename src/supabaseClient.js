import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Variabili Supabase mancanti: copia .env.example in .env e inserisci URL e anon key del tuo progetto.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
