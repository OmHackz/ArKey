/**
 * ArKey Settings Page Script
 * Displays user info, account details, and handles sign out.
 */

import { initPage, renderSidebar } from './sidebar.js';
import { getCurrentUser, signOut } from './auth.js';
import { showToast, setButtonLoading, formatDate } from './ui.js';

async function init() {
  const ready = await initPage('settings');
  if (!ready) return;

  await loadUserInfo();
  setupEventListeners();
}

async function loadUserInfo() {
  const { data: { user }, error } = await getCurrentUser();

  if (error || !user) {
    showToast('Failed to load user info', 'error');
    return;
  }

  const email = user.email || 'Unknown';
  const provider = user.app_metadata?.provider || 'email';
  const createdAt = user.created_at;

  // Avatar (first letter of email)
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    avatarEl.textContent = email.charAt(0).toUpperCase();
  }

  // Email
  const emailEl = document.getElementById('user-email');
  if (emailEl) {
    emailEl.textContent = email;
  }

  // Provider
  const providerEl = document.getElementById('user-provider');
  if (providerEl) {
    const providerDisplay = provider.charAt(0).toUpperCase() + provider.slice(1);
    providerEl.textContent = `Signed in with ${providerDisplay}`;
  }

  // Auth method badge
  const authMethodEl = document.getElementById('auth-method');
  if (authMethodEl) {
    authMethodEl.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  // Account created date
  const createdEl = document.getElementById('account-created');
  if (createdEl) {
    createdEl.textContent = formatDate(createdAt);
  }
}

function setupEventListeners() {
  // Sign out button in danger zone
  document.getElementById('logout-btn-main')?.addEventListener('click', async () => {
    const btn = document.getElementById('logout-btn-main');
    setButtonLoading(btn, true);

    const { error } = await signOut();
    if (error) {
      showToast('Failed to sign out', 'error');
      setButtonLoading(btn, false);
    } else {
      window.location.href = '/login.html';
    }
  });
}

init();
