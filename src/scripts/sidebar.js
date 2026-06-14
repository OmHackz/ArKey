/**
 * ArKey Sidebar Component
 * Renders the shared left sidebar navigation for authenticated pages.
 */

import { getCurrentUser, signOut } from './auth.js';
import { showToast } from './ui.js';

/**
 * Render the sidebar into the given container element.
 * @param {string} activePage - The currently active page ('dashboard', 'vault', 'authenticator', 'settings')
 */
export async function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const { data: { user } } = await getCurrentUser();
  const email = user?.email || 'User';
  const avatar = email.charAt(0).toUpperCase();

  sidebar.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="px-5 py-5 border-b border-neutral-200">
        <a href="/dashboard.html" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <span class="text-lg font-semibold tracking-tight">ArKey</span>
        </a>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <a href="/dashboard.html" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </a>
        <a href="/vault.html" class="sidebar-link ${activePage === 'vault' ? 'active' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <span>Vault</span>
        </a>
        <a href="/authenticator.html" class="sidebar-link ${activePage === 'authenticator' ? 'active' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/><path d="M8 6h8"/>
          </svg>
          <span>Authenticator</span>
        </a>
        <a href="/settings.html" class="sidebar-link ${activePage === 'settings' ? 'active' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </a>
      </nav>

      <!-- User Section -->
      <div class="border-t border-neutral-200 p-3">
        <div class="flex items-center gap-3 px-2 py-2 mb-2">
          <div class="w-8 h-8 bg-secondary border border-neutral-200 flex items-center justify-center text-xs font-semibold text-primary">
            ${avatar}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-primary truncate">${email}</p>
            <p class="text-xs text-muted">Signed in</p>
          </div>
        </div>
        <button id="logout-btn" class="w-full flex items-center gap-3 px-2 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  `;

  // Wire up logout button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('logout-btn');
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Signing out...</span>
    `;

    const { error } = await signOut();
    if (error) {
      showToast('Failed to sign out', 'error');
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Sign out</span>
      `;
    } else {
      window.location.href = '/login.html';
    }
  });
}

/**
 * Initialize the sidebar and auth guard for a protected page.
 * @param {string} activePage - The current page name
 */
export async function initPage(activePage) {
  // Auth guard - redirect if not logged in
  const { requireAuth } = await import('./auth.js');
  const isAuthed = await requireAuth('/login.html');
  if (!isAuthed) return false;

  // Render sidebar
  await renderSidebar(activePage);
  return true;
}
