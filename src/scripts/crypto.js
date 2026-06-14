/**
 * ArKey Crypto Module
 * Client-side encryption using the Web Crypto API.
 * Provides encrypt/decrypt functions for secure vault storage.
 */

import { ENCRYPTION_KEY } from './config.js';

const ENCODING = 'utf-8';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Derive a CryptoKey from the configured encryption key string.
 * Uses PBKDF2 to create a strong AES-GCM key.
 */
async function getCryptoKey() {
  const keyMaterial = ENCRYPTION_KEY || 'arkey-default-encryption-key-32chars!';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  // Use the first 32 bytes as salt for consistency
  const salt = encoder.encode('arkey-salt-fixed-32-bytes-long!!');

  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string containing the IV + ciphertext.
 */
export async function encrypt(plaintext) {
  try {
    const key = await getCryptoKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoded
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a base64-encoded ciphertext string.
 * Expects the format: base64(IV + ciphertext)
 */
export async function decrypt(ciphertextBase64) {
  try {
    const key = await getCryptoKey();
    const combined = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random secure code for demo/testing.
 */
export function generateSecureCode(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

/**
 * Hash a string for integrity verification (SHA-256).
 */
export async function hashString(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
