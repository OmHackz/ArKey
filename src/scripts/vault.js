/**
 * ArKey Vault Page Script
 * Core feature: manage encrypted recovery codes.
 * Supports add, view (toggle visibility), copy, delete, and search.
 */

import { initPage } from './sidebar.js';
import { getVaultEntries, addVaultEntry, deleteVaultEntry, createShareLink } from './db.js';
import { copyToClipboard, showToast, showConfirm, showEmptyState, showErrorState, escapeHtml, setButtonLoading, formatRelativeTime } from './ui.js';
import { buildShareUrl, downloadText, getExpiryFromHours, hashPassword, normalizeMaxViews } from './share-utils.js';

let allEntries = [];
let selectedGroup = '';

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
  document.getElementById('group-filter')?.addEventListener('change', handleGroupFilter);
  document.getElementById('vault-export-btn')?.addEventListener('click', handleExport);
  document.getElementById('vault-import-btn')?.addEventListener('click', () => document.getElementById('vault-import-file')?.click());
  document.getElementById('vault-drop-upload-btn')?.addEventListener('click', () => document.getElementById('vault-import-file')?.click());
  document.getElementById('vault-import-file')?.addEventListener('change', handleImportFiles);
  document.getElementById('vault-share-btn')?.addEventListener('click', openShareModal);
  document.getElementById('close-share-modal')?.addEventListener('click', closeShareModal);
  document.getElementById('cancel-share')?.addEventListener('click', closeShareModal);
  document.getElementById('create-share')?.addEventListener('click', handleCreateShare);
  setupDropZone();

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAddModal();
  });
}

function openAddModal() {
  const modal = document.getElementById('add-modal');
  modal.classList.remove('hidden');
  document.getElementById('entry-title').value = '';
  document.getElementById('entry-account').value = '';
  document.getElementById('entry-group').value = selectedGroup || '';
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
  const accountInput = document.getElementById('entry-account');
  const groupInput = document.getElementById('entry-group');
  const saveBtn = document.getElementById('save-entry');

  const title = titleInput.value.trim();
  const code = codeInput.value.trim();
  const accountName = accountInput.value.trim();
  const groupName = groupInput.value.trim() || 'General';

  if (!title || !code) {
    showToast('Please fill in all fields', 'warning');
    return;
  }

  setButtonLoading(saveBtn, true);

  const { data, error } = await addVaultEntry(title, code, { accountName, groupName });

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
  renderEntries(filterEntries(e.target.value, selectedGroup));
}

function handleGroupFilter(e) {
  selectedGroup = e.target.value;
  renderEntries(filterEntries(document.getElementById('search-input')?.value || '', selectedGroup));
}

function filterEntries(queryValue = '', groupValue = '') {
  const query = queryValue.toLowerCase().trim();
  return allEntries.filter(entry => {
    const haystack = `${entry.title} ${entry.account_name || ''} ${entry.group_name || 'General'}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesGroup = !groupValue || (entry.group_name || 'General') === groupValue;
    return matchesQuery && matchesGroup;
  });
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
  updateGroupControls();

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

  const groupedEntries = groupEntries(entries);
  container.innerHTML = Object.entries(groupedEntries).map(([group, groupEntriesList]) => `
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-primary">${escapeHtml(group)}</h2>
        <span class="text-xs text-muted">${groupEntriesList.length} ${groupEntriesList.length === 1 ? 'item' : 'items'}</span>
      </div>
      ${groupEntriesList.map((entry, i) => {
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
              <p class="text-xs text-muted">${escapeHtml(entry.account_name || 'No account')} / Added ${formatRelativeTime(entry.created_at)}</p>
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
      }).join('')}
    </section>
  `).join('');

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

function updateGroupControls() {
  const groups = [...new Set(allEntries.map((entry) => entry.group_name || 'General'))].sort();
  const filter = document.getElementById('group-filter');
  const datalist = document.getElementById('vault-groups');
  if (filter) {
    const current = filter.value;
    filter.innerHTML = '<option value="">All groups</option>' + groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join('');
    filter.value = groups.includes(current) ? current : '';
    selectedGroup = filter.value;
  }
  if (datalist) {
    datalist.innerHTML = groups.map((group) => `<option value="${escapeHtml(group)}"></option>`).join('');
  }
}

function groupEntries(entries) {
  return entries.reduce((groups, entry) => {
    const group = entry.group_name || 'General';
    groups[group] ||= [];
    groups[group].push(entry);
    return groups;
  }, {});
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

function setupDropZone() {
  const zone = document.getElementById('vault-drop-zone');
  if (!zone) return;
  ['dragenter', 'dragover'].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add('border-primary', 'bg-white');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove('border-primary', 'bg-white');
    });
  });
  zone.addEventListener('drop', (event) => importFiles([...event.dataTransfer.files]));
}

function handleImportFiles(event) {
  importFiles([...event.target.files]);
  event.target.value = '';
}

async function importFiles(files) {
  if (!files.length) return;
  let created = 0;

  for (const file of files) {
    const text = await file.text();
    const entries = parseVaultImport(text, file.name);
    for (const entry of entries) {
      const { error } = await addVaultEntry(entry.title, entry.code, {
        accountName: entry.accountName || '',
        groupName: entry.groupName || 'Imported',
      });
      if (!error) created += 1;
    }
  }

  showToast(`Imported ${created} ${created === 1 ? 'entry' : 'entries'}`);
  await loadEntries();
}

function parseVaultImport(text, filename) {
  try {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.vault || parsed.entries || [];
    return items.map((item, index) => ({
      title: item.title || item.name || `${filename} #${index + 1}`,
      code: item.code || item.recovery_code || item.decrypted_data || '',
      accountName: item.accountName || item.account_name || '',
      groupName: item.groupName || item.group_name || 'Imported',
    })).filter((item) => item.code);
  } catch {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        title: `${filename.replace(/\.[^.]+$/, '')} #${index + 1}`,
        code: line,
        groupName: 'Imported',
      }));
  }
}

function handleExport() {
  if (!allEntries.length) {
    showToast('Nothing to export yet', 'warning');
    return;
  }

  const payload = buildVaultExport();
  downloadText(`arkey-vault-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function buildVaultExport() {
  return {
    type: 'arkey-vault-export',
    exportedAt: new Date().toISOString(),
    vault: allEntries.map((entry) => ({
      title: entry.title,
      accountName: entry.account_name || '',
      groupName: entry.group_name || 'General',
      code: entry.decrypted_data || '',
      createdAt: entry.created_at,
    })),
  };
}

function openShareModal() {
  if (!allEntries.length) {
    showToast('Add something before creating a share link', 'warning');
    return;
  }
  document.getElementById('share-modal')?.classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('share-modal')?.classList.add('hidden');
}

async function handleCreateShare() {
  const button = document.getElementById('create-share');
  setButtonLoading(button, true);
  const payload = buildVaultExport();
  const { data, error } = await createShareLink({
    kind: 'vault',
    title: 'Vault export',
    payload,
    passwordHash: await hashPassword(document.getElementById('share-password')?.value),
    maxViews: normalizeMaxViews(document.getElementById('share-max-views')?.value),
    expiresAt: getExpiryFromHours(document.getElementById('share-duration')?.value),
    format: 'json',
  });

  setButtonLoading(button, false);
  if (error) {
    showToast(error.message || 'Failed to create share link', 'error');
    return;
  }

  const url = buildShareUrl(`/share/${data.id}`);
  await copyToClipboard(url);
  closeShareModal();
  showToast('Share link copied');
}

init();
