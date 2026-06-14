/**
 * ArKey Login Page Script
 * Handles OAuth (Google, GitHub) and magic link authentication.
 */

import { redirectIfAuthed, signInWithGoogle, signInWithGitHub } from './auth.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { showToast, setButtonLoading } from './ui.js';
import { createClient } from '@supabase/supabase-js';

// Redirect if already logged in
redirectIfAuthed('/dashboard.html');

// Google OAuth
document.getElementById('google-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('google-btn');
  setButtonLoading(btn, true);

  const { error } = await signInWithGoogle();
  if (error) {
    showToast(error.message || 'Failed to sign in with Google', 'error');
    setButtonLoading(btn, false);
  }
  // Redirect is handled by OAuth flow
});

// GitHub OAuth
document.getElementById('github-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('github-btn');
  setButtonLoading(btn, true);

  const { error } = await signInWithGitHub();
  if (error) {
    showToast(error.message || 'Failed to sign in with GitHub', 'error');
    setButtonLoading(btn, false);
  }
  // Redirect is handled by OAuth flow
});

// Magic Link (Email OTP)
document.getElementById('email-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email-input').value.trim();
  const btn = document.getElementById('email-btn');

  if (!email) {
    showToast('Please enter your email', 'warning');
    return;
  }

  setButtonLoading(btn, true);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard.html`,
      },
    });

    if (error) {
      showToast(error.message || 'Failed to send magic link', 'error');
      setButtonLoading(btn, false);
    } else {
      document.getElementById('email-form').classList.add('hidden');
      document.getElementById('magic-link-msg').classList.remove('hidden');
      showToast('Magic link sent to your email', 'success');
    }
  } catch (err) {
    showToast(err.message || 'An unexpected error occurred', 'error');
    setButtonLoading(btn, false);
  }
});
