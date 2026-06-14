/**
 * ArKey Auth Module
 * Handles Supabase authentication - Google OAuth, GitHub OAuth,
 * session management, and auth state changes.
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let supabase = null;
let currentUser = null;

/**
 * Initialize the Supabase client.
 */
function getClient() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured. Auth will not work.');
      return null;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabase;
}

/**
 * Sign in with Google OAuth.
 */
export async function signInWithGoogle() {
  const client = getClient();
  if (!client) return { error: new Error('Supabase not configured') };

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard.html`,
    },
  });

  return { data, error };
}

/**
 * Sign in with GitHub OAuth.
 */
export async function signInWithGitHub() {
  const client = getClient();
  if (!client) return { error: new Error('Supabase not configured') };

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/dashboard.html`,
    },
  });

  return { data, error };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const client = getClient();
  if (!client) return { error: new Error('Supabase not configured') };

  const { error } = await client.auth.signOut();
  currentUser = null;
  return { error };
}

/**
 * Get the current session.
 */
export async function getSession() {
  const client = getClient();
  if (!client) return { data: { session: null }, error: null };

  const { data, error } = await client.auth.getSession();
  return { data, error };
}

/**
 * Get the current user.
 */
export async function getCurrentUser() {
  const client = getClient();
  if (!client) return { data: { user: null }, error: null };

  const { data: { user }, error } = await client.auth.getUser();
  currentUser = user || null;
  return { data: { user }, error };
}

/**
 * Check if user is authenticated.
 * Redirects to login if not (for protected pages).
 */
export async function requireAuth(redirectUrl = '/login.html') {
  const { data } = await getSession();
  if (!data.session) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

/**
 * Check if user is already authenticated.
 * Redirects to dashboard if yes (for login page).
 */
export async function redirectIfAuthed(targetUrl = '/dashboard.html') {
  const { data } = await getSession();
  if (data.session) {
    window.location.href = targetUrl;
    return true;
  }
  return false;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(callback) {
  const client = getClient();
  if (!client) return { subscription: null };

  const { data } = client.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    callback(event, session);
  });

  return data;
}

/**
 * Get cached current user (synchronous, may be null if not fetched).
 */
export function getUser() {
  return currentUser;
}

/**
 * Get the raw Supabase client for database operations.
 */
export function getSupabase() {
  return getClient();
}
