/**
 * ArKey Database Module
 * Handles all Supabase database operations for the vault and users.
 * Uses type-safe queries with error handling.
 */

import { getSupabase } from './auth.js';
import { encrypt, decrypt } from './crypto.js';

/**
 * Get the current user's ID from the active session.
 */
async function getUserId() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

/**
 * Get user profile from the users table.
 */
export async function getUserProfile() {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Create or update a user profile in the users table.
 */
export async function upsertUserProfile(email) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Get all vault entries for the current user.
 * Automatically decrypts the data.
 */
export async function getVaultEntries() {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('vault')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    if (!data) return { data: [], error: null };

    // Decrypt entries
    const decrypted = await Promise.all(
      data.map(async (entry) => {
        try {
          const decryptedData = await decrypt(entry.encrypted_data);
          return {
            ...entry,
            decrypted_data: decryptedData,
            code_hidden: true,
          };
        } catch {
          return {
            ...entry,
            decrypted_data: '[Decryption failed]',
            code_hidden: true,
          };
        }
      })
    );

    return { data: decrypted, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Get a single vault entry by ID.
 */
export async function getVaultEntry(id) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('vault')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return { data: null, error: error || new Error('Entry not found') };

    const decryptedData = await decrypt(data.encrypted_data);
    return {
      data: { ...data, decrypted_data: decryptedData, code_hidden: true },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Add a new vault entry.
 * Encrypts the data before storing.
 */
export async function addVaultEntry(title, code) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const encryptedData = await encrypt(code);

    const { data, error } = await supabase
      .from('vault')
      .insert([
        {
          user_id: userId,
          title,
          encrypted_data: encryptedData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Update a vault entry.
 */
export async function updateVaultEntry(id, title, code) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const encryptedData = await encrypt(code);

    const { data, error } = await supabase
      .from('vault')
      .update({
        title,
        encrypted_data: encryptedData,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Delete a vault entry.
 */
export async function deleteVaultEntry(id) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('vault')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Get all authenticator entries for the current user.
 * Automatically decrypts the TOTP secret.
 */
export async function getAuthenticatorEntries() {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('authenticators')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    if (!data) return { data: [], error: null };

    const decrypted = await Promise.all(
      data.map(async (entry) => {
        try {
          return {
            ...entry,
            secret: await decrypt(entry.encrypted_secret),
          };
        } catch {
          return {
            ...entry,
            secret: '',
            secret_error: 'Decryption failed',
          };
        }
      })
    );

    return { data: decrypted, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Add a new authenticator entry.
 */
export async function addAuthenticatorEntry({ issuer, accountName, secret, digits = 6, period = 30, algorithm = 'SHA-1' }) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const encryptedSecret = await encrypt(secret);

    const { data, error } = await supabase
      .from('authenticators')
      .insert([
        {
          user_id: userId,
          issuer,
          account_name: accountName,
          encrypted_secret: encryptedSecret,
          digits,
          period,
          algorithm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Delete an authenticator entry.
 */
export async function deleteAuthenticatorEntry(id) {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('authenticators')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Get authenticator statistics for the dashboard.
 */
export async function getAuthenticatorStats() {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('authenticators')
      .select('id, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return { data: null, error };

    return {
      data: {
        total: data?.length || 0,
        lastUpdated: data?.[0]?.updated_at || data?.[0]?.created_at || null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Get vault statistics for the dashboard.
 */
export async function getVaultStats() {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('Supabase not initialized') };

  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('vault')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    return {
      data: {
        total: data?.length || 0,
        lastUpdated: data?.[0]?.created_at || null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}
