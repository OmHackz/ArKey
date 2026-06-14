/**
 * ArKey Configuration
 * Centralized configuration for Supabase and encryption settings.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '';

export { SUPABASE_URL, SUPABASE_ANON_KEY, ENCRYPTION_KEY };
