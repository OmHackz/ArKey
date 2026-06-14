/**
 * ArKey Dashboard Page Script
 * Loads stats, recent entries, and handles dashboard interactions.
 */

import { initPage } from './sidebar.js';
import { getVaultStats, getVaultEntries, getAuthenticatorStats } from './db.js';
import { showErrorState, showEmptyState, formatRelativeTime, escapeHtml } from './ui.js';

async function init() {
  const ready = await initPage('dashboard');
  if (!ready) return;

  await loadStats();
  await loadRecentEntries();
}

async function loadStats() {
  const statTotal = document.getElementById('stat-total');
  const statUpdated = document.getElementById('stat-updated');
  const statAuthenticators = document.getElementById('stat-authenticators');

  const [{ data, error }, { data: authenticatorData, error: authenticatorError }] = await Promise.all([
    getVaultStats(),
    getAuthenticatorStats(),
  ]);

  if (error) {
    statTotal.textContent = '-';
    statUpdated.textContent = 'Error';
  } else {
    statTotal.textContent = data.total.toString();
    statUpdated.textContent = formatRelativeTime(data.lastUpdated);
  }

  statAuthenticators.textContent = authenticatorError ? '-' : authenticatorData.total.toString();
}

async function loadRecentEntries() {
  const container = document.getElementById('recent-entries');

  const { data, error } = await getVaultEntries();

  if (error) {
    showErrorState(container, error.message || 'Failed to load entries', loadRecentEntries);
    return;
  }

  if (!data || data.length === 0) {
    showEmptyState(
      container,
      'No entries yet',
      'Add your first recovery code to the vault to see it here.',
      '<a href="/vault.html" class="btn-primary btn-sm mt-4">Go to Vault</a>'
    );
    return;
  }

  // Show the 5 most recent entries
  const recent = data.slice(0, 5);

  container.innerHTML = recent.map((entry, i) => `
    <div class="flex items-center justify-between px-5 py-4 bg-white border border-neutral-200 card-hover animate-slide-in" style="animation-delay: ${i * 0.05}s">
      <div class="flex items-center gap-4">
        <div class="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-primary">${escapeHtml(entry.title)}</p>
          <p class="text-xs text-muted">Added ${formatRelativeTime(entry.created_at)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted font-mono bg-secondary px-2 py-1">${'*'.repeat(8)}${entry.decrypted_data?.slice(-4) || '****'}</span>
      </div>
    </div>
  `).join('');
}

init();
