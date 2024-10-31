import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single instance of the Supabase client
const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)

// Export a function that returns the same instance
export const getSupabase = () => supabaseInstance

// For backwards compatibility, also export the instance directly
export const supabase = supabaseInstance
