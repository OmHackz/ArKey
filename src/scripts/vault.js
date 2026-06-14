/**
 * ArKey Vault Page Script
 * Core feature: manage encrypted recovery codes.
 * Supports add, view (toggle visibility), copy, delete, and search.
 */

import { initPage } from './sidebar.js';
import { getVaultEntries, addVaultEntry, deleteVaultEntry } from './db.js';
import { copyToClipboard, showToast, showConfirm, showEmptyState, showErrorState, escapeHtml, setButtonLoading, formatRelativeTime } from './ui.js';

let allEntries = [];

async function init() {
  const ready = await initPage('vault');
  if (!ready) return;

  setupEventListeners();
  await loadEntries();
}

function setupEventListeners() {
  // Add button opens modal
  document.getElementById('add-btn')?.addEventListener('click', openAddModal);

  // Close modal
  document.getElementById('close-modal')?.addEventListener('click', closeAddModal);
  document.getElementById('cancel-add')?.addEventListener('click', closeAddModal);

  // Close modal on overlay click
  document.getElementById('add-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('add-modal')) {
      closeAddModal();
    }
  });

  // Form submit
  document.getElementById('add-form')?.addEventListener('submit', handleAddEntry);

  // Search
  document.getElementById('search-input')?.addEventListener('input', handleSearch);

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddModal();
  });
}

function openAddModal() {
  const modal = document.getElementById('add-modal');
  modal.classList.remove('hidden');
  document.getElementById('entry-title').value = '';
  document.getElementById('entry-code').value = '';
  document.getElementById('entry-title').focus();
}

function closeAddModal() {
  const modal = document.getElementById('add-modal');
  modal.classList.add('hidden');
}

async function handleAddEntry(e) {
  e.preventDefault();

  const titleInput = document.getElementById('entry-title');
  const codeInput = document.getElementById('entry-code');
  const saveBtn = document.getElementById('save-entry');

  const title = titleInput.value.trim();
  const code = codeInput.value.trim();

  if (!title || !code) {
    showToast('Please fill in all fields', 'warning');
    return;
  }

  setButtonLoading(saveBtn, true);

  const { data, error } = await addVaultEntry(title, code);

  if (error) {
    showToast(error.message || 'Failed to add entry', 'error');
    setButtonLoading(saveBtn, false);
    return;
  }

  setButtonLoading(saveBtn, false);
  closeAddModal();
  showToast('Entry added successfully');
  await loadEntries();
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const filtered = allEntries.filter(entry =>
    entry.title.toLowerCase().includes(query)
  );
  renderEntries(filtered);
}

async function loadEntries() {
  const container = document.getElementById('vault-container');

  // Show loading
  container.innerHTML = `
    <div class="flex items-center justify-center py-16">
      <div class="spinner mr-3"></div>
      <span class="text-sm text-muted">Loading entries...</span>
    </div>
  `;

  const { data, error } = await getVaultEntries();

  if (error) {
    showErrorState(container, error.message || 'Failed to load vault entries', loadEntries);
    return;
  }

  allEntries = data || [];

  if (allEntries.length === 0) {
    showEmptyState(
      container,
      'Your vault is empty',
      'Add your first recovery code to get started. All codes are encrypted before storage.',
      '<button id="empty-add-btn" class="btn-primary btn-sm mt-4">Add First Entry</button>'
    );
    document.getElementById('empty-add-btn')?.addEventListener('click', openAddModal);
    document.getElementById('pagination')?.classList.add('hidden');
    return;
  }

  renderEntries(allEntries);
  document.getElementById('pagination')?.classList.remove('hidden');
  document.getElementById('entries-count').textContent = `${allEntries.length} ${allEntries.length === 1 ? 'entry' : 'entries'}`;
}

function renderEntries(entries) {
  const container = document.getElementById('vault-container');

  if (entries.length === 0) {
    showEmptyState(
      container,
      'No matching entries',
      'Try a different search term.',
      ''
    );
    return;
  }

  container.innerHTML = entries.map((entry, i) => {
    const isHidden = entry.code_hidden !== false;
    const maskedCode = maskCode(entry.decrypted_data || '');
    return `
      <div class="vault-card card-hover animate-fade-in" style="animation-delay: ${i * 0.03}s" data-id="${entry.id}">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-secondary flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-primary">${escapeHtml(entry.title)}</h3>
              <p class="text-xs text-muted">Added ${formatRelativeTime(entry.created_at)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="toggle-visibility-btn p-2 text-muted hover:text-primary hover:bg-secondary transition-colors"
              data-id="${entry.id}"
              title="${isHidden ? 'Show' : 'Hide'} code"
            >
              ${isHidden
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
              }
            </button>
            <button
              class="copy-btn p-2 text-muted hover:text-primary hover:bg-secondary transition-colors"
              data-id="${entry.id}"
              title="Copy code"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
            <button
              class="delete-btn p-2 text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
              data-id="${entry.id}"
              title="Delete entry"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="code-field font-mono text-sm" data-code="${escapeHtml(entry.decrypted_data || '')}">
          ${isHidden ? maskedCode : escapeHtml(entry.decrypted_data || '')}
        </div>
      </div>
    `;
  }).join('');

  // Wire up toggle visibility buttons
  container.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', handleToggleVisibility);
  });

  // Wire up copy buttons
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });

  // Wire up delete buttons
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

function handleToggleVisibility(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const card = document.querySelector(`.vault-card[data-id="${id}"]`);
  const codeField = card?.querySelector('.code-field');
  if (!codeField) return;

  const code = codeField.dataset.code;
  const isHidden = codeField.textContent.includes('*');

  if (isHidden) {
    // Show
    codeField.textContent = code;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    btn.title = 'Hide code';
  } else {
    // Hide
    codeField.textContent = maskCode(code);
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    btn.title = 'Show code';
  }
}

function handleCopy(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const card = document.querySelector(`.vault-card[data-id="${id}"]`);
  const codeField = card?.querySelector('.code-field');
  if (!codeField) return;

  const code = codeField.dataset.code;
  copyToClipboard(code);
}

function handleDelete(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const card = document.querySelector(`.vault-card[data-id="${id}"]`);
  const title = card?.querySelector('h3')?.textContent || 'this entry';

  showConfirm(
    'Delete Entry',
    `Are you sure you want to delete "${title}"? This action cannot be undone.`,
    async () => {
      const { error } = await deleteVaultEntry(id);
      if (error) {
        showToast(error.message || 'Failed to delete entry', 'error');
        return;
      }
      showToast('Entry deleted');
      // Remove from allEntries
      allEntries = allEntries.filter(entry => entry.id !== id);
      renderEntries(allEntries);
      document.getElementById('entries-count').textContent = `${allEntries.length} ${allEntries.length === 1 ? 'entry' : 'entries'}`;
      if (allEntries.length === 0) {
        loadEntries();
      }
    }
  );
}

function maskCode(code) {
  if (!code || code.length <= 8) return '*'.repeat(code?.length || 0);
  return '*'.repeat(code.length - 4) + code.slice(-4);
}

init();
