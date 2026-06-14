import { initPage } from './sidebar.js';
import { getAuthenticatorEntries, addAuthenticatorEntry, deleteAuthenticatorEntry } from './db.js';
import { copyToClipboard, showToast, showConfirm, showEmptyState, showErrorState, escapeHtml, setButtonLoading, formatRelativeTime } from './ui.js';
import { generateTotp, getTotpProgress, isValidBase32Secret, normalizeSecret, parseOtpAuthUri } from './totp.js';

let allEntries = [];
let renderTimer = null;

async function init() {
  const ready = await initPage('authenticator');
  if (!ready) return;

  setupEventListeners();
  hydrateFromQueryParams();
  await loadEntries();
  renderTimer = window.setInterval(renderCodes, 1000);
}

function setupEventListeners() {
  document.getElementById('add-authenticator-btn')?.addEventListener('click', openModal);
  document.getElementById('close-authenticator-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-authenticator')?.addEventListener('click', closeModal);
  document.getElementById('authenticator-form')?.addEventListener('submit', handleAddEntry);
  document.getElementById('authenticator-search')?.addEventListener('input', handleSearch);
  document.getElementById('otpauth-uri')?.addEventListener('input', handleOtpAuthPaste);

  document.getElementById('authenticator-modal')?.addEventListener('click', (event) => {
    if (event.target === document.getElementById('authenticator-modal')) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

function hydrateFromQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const otpAuth = params.get('otpauth');
  const issuer = params.get('issuer');
  const account = params.get('account');

  if (!otpAuth && !issuer && !account) return;

  openModal();

  if (otpAuth) {
    try {
      const parsed = parseOtpAuthUri(otpAuth);
      document.getElementById('otpauth-uri').value = otpAuth;
      document.getElementById('authenticator-issuer').value = parsed.issuer;
      document.getElementById('authenticator-account').value = parsed.accountName;
      document.getElementById('authenticator-secret').value = parsed.secret;
      document.getElementById('authenticator-digits').value = parsed.digits;
      document.getElementById('authenticator-period').value = parsed.period;
      document.getElementById('authenticator-algorithm').value = parsed.algorithm;
      return;
    } catch (error) {
      showToast(error.message || 'Could not read otpauth URI', 'error');
    }
  }

  document.getElementById('authenticator-issuer').value = issuer || '';
  document.getElementById('authenticator-account').value = account || '';
}

function openModal() {
  document.getElementById('authenticator-modal')?.classList.remove('hidden');
  document.getElementById('authenticator-form')?.reset();
  document.getElementById('authenticator-digits').value = '6';
  document.getElementById('authenticator-period').value = '30';
  document.getElementById('authenticator-algorithm').value = 'SHA-1';
  document.getElementById('authenticator-issuer')?.focus();
}

function closeModal() {
  document.getElementById('authenticator-modal')?.classList.add('hidden');
}

function handleOtpAuthPaste(event) {
  const value = event.target.value.trim();
  if (!value) return;

  try {
    const parsed = parseOtpAuthUri(value);
    document.getElementById('authenticator-issuer').value = parsed.issuer;
    document.getElementById('authenticator-account').value = parsed.accountName;
    document.getElementById('authenticator-secret').value = parsed.secret;
    document.getElementById('authenticator-digits').value = parsed.digits;
    document.getElementById('authenticator-period').value = parsed.period;
    document.getElementById('authenticator-algorithm').value = parsed.algorithm;
  } catch {
    // Let form submission show the validation error.
  }
}

async function handleAddEntry(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-authenticator');
  const issuer = document.getElementById('authenticator-issuer').value.trim();
  const accountName = document.getElementById('authenticator-account').value.trim();
  const secret = normalizeSecret(document.getElementById('authenticator-secret').value);
  const digits = Number(document.getElementById('authenticator-digits').value || 6);
  const period = Number(document.getElementById('authenticator-period').value || 30);
  const algorithm = document.getElementById('authenticator-algorithm').value;

  if (!issuer || !accountName || !secret) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  if (!isValidBase32Secret(secret)) {
    showToast('Secret must be Base32 characters A-Z and 2-7', 'error');
    return;
  }

  setButtonLoading(saveBtn, true);
  const { error } = await addAuthenticatorEntry({ issuer, accountName, secret, digits, period, algorithm });

  setButtonLoading(saveBtn, false);
  if (error) {
    showToast(error.message || 'Failed to add authenticator', 'error');
    return;
  }

  closeModal();
  showToast('Authenticator added');
  await loadEntries();
}

function handleSearch(event) {
  const query = event.target.value.toLowerCase().trim();
  const filtered = allEntries.filter((entry) =>
    `${entry.issuer} ${entry.account_name}`.toLowerCase().includes(query)
  );
  renderEntries(filtered);
}

async function loadEntries() {
  const container = document.getElementById('authenticator-container');
  container.innerHTML = `
    <div class="md:col-span-2 flex items-center justify-center py-16">
      <div class="spinner mr-3"></div>
      <span class="text-sm text-muted">Loading authenticators...</span>
    </div>
  `;

  const { data, error } = await getAuthenticatorEntries();

  if (error) {
    showErrorState(container, error.message || 'Failed to load authenticators', loadEntries);
    return;
  }

  allEntries = data || [];

  if (allEntries.length === 0) {
    showEmptyState(
      container,
      'No authenticators yet',
      'Add a TOTP secret to generate encrypted 2FA codes.',
      '<button id="empty-add-authenticator" class="btn-primary btn-sm mt-4">Add Authenticator</button>'
    );
    container.classList.remove('grid', 'md:grid-cols-2', 'gap-4');
    document.getElementById('empty-add-authenticator')?.addEventListener('click', openModal);
    document.getElementById('authenticator-footer')?.classList.add('hidden');
    return;
  }

  container.classList.add('grid', 'md:grid-cols-2', 'gap-4');
  document.getElementById('authenticator-footer')?.classList.remove('hidden');
  document.getElementById('authenticator-count').textContent = `${allEntries.length} ${allEntries.length === 1 ? 'authenticator' : 'authenticators'}`;
  renderEntries(allEntries);
}

function renderEntries(entries) {
  const container = document.getElementById('authenticator-container');

  if (entries.length === 0) {
    showEmptyState(container, 'No matching authenticators', 'Try another search term.', '');
    return;
  }

  container.classList.add('grid', 'md:grid-cols-2', 'gap-4');
  container.innerHTML = entries.map((entry, index) => `
    <div class="authenticator-card card card-hover p-5 animate-fade-in" style="animation-delay: ${index * 0.03}s" data-id="${entry.id}">
      <div class="flex items-start justify-between mb-5">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 bg-secondary flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/><path d="M8 6h8"/>
            </svg>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-primary truncate">${escapeHtml(entry.issuer)}</h3>
            <p class="text-xs text-muted truncate">${escapeHtml(entry.account_name)}</p>
          </div>
        </div>
        <button class="delete-authenticator p-2 text-muted hover:text-red-600 hover:bg-red-50 transition-colors" data-id="${entry.id}" title="Delete authenticator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>

      <button class="copy-authenticator-code w-full text-left" data-id="${entry.id}" title="Copy current code">
        <div class="flex items-end justify-between gap-3">
          <div class="font-mono text-4xl font-semibold tracking-normal code-value" data-code>------</div>
          <div class="text-right">
            <p class="text-xs text-muted mb-1">Refresh</p>
            <p class="font-mono text-sm text-primary" data-remaining>--s</p>
          </div>
        </div>
        <div class="h-1 bg-secondary mt-4 overflow-hidden">
          <div class="h-full bg-primary transition-all duration-1000" data-progress style="width: 100%"></div>
        </div>
      </button>

      <div class="flex items-center justify-between mt-4 text-xs text-muted">
        <span>${Number(entry.digits) || 6} digits / ${Number(entry.period) || 30}s</span>
        <span>Added ${formatRelativeTime(entry.created_at)}</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.copy-authenticator-code').forEach((button) => {
    button.addEventListener('click', handleCopyCode);
  });

  container.querySelectorAll('.delete-authenticator').forEach((button) => {
    button.addEventListener('click', handleDelete);
  });

  renderCodes();
}

async function renderCodes() {
  const cards = document.querySelectorAll('.authenticator-card');

  for (const card of cards) {
    const entry = allEntries.find((item) => item.id === card.dataset.id);
    if (!entry) continue;

    const codeEl = card.querySelector('[data-code]');
    const remainingEl = card.querySelector('[data-remaining]');
    const progressEl = card.querySelector('[data-progress]');

    if (entry.secret_error || !entry.secret) {
      codeEl.textContent = 'Error';
      remainingEl.textContent = '--';
      progressEl.style.width = '0%';
      continue;
    }

    const period = Number(entry.period) || 30;
    const progress = getTotpProgress(period);
    const code = await generateTotp(entry.secret, {
      digits: Number(entry.digits) || 6,
      period,
      algorithm: entry.algorithm || 'SHA-1',
    });

    codeEl.textContent = groupCode(code);
    codeEl.dataset.rawCode = code;
    remainingEl.textContent = `${progress.remaining}s`;
    progressEl.style.width = `${progress.percent}%`;
  }
}

function handleCopyCode(event) {
  const code = event.currentTarget.querySelector('[data-code]')?.dataset.rawCode;
  if (code) copyToClipboard(code);
}

function handleDelete(event) {
  event.stopPropagation();
  const id = event.currentTarget.dataset.id;
  const entry = allEntries.find((item) => item.id === id);
  const name = entry ? `${entry.issuer} (${entry.account_name})` : 'this authenticator';

  showConfirm('Delete Authenticator', `Delete "${name}"? This action cannot be undone.`, async () => {
    const { error } = await deleteAuthenticatorEntry(id);
    if (error) {
      showToast(error.message || 'Failed to delete authenticator', 'error');
      return;
    }

    showToast('Authenticator deleted');
    allEntries = allEntries.filter((item) => item.id !== id);
    renderEntries(allEntries);
    document.getElementById('authenticator-count').textContent = `${allEntries.length} ${allEntries.length === 1 ? 'authenticator' : 'authenticators'}`;
    if (allEntries.length === 0) await loadEntries();
  });
}

function groupCode(code) {
  return code.replace(/(.{3})/g, '$1 ').trim();
}

window.addEventListener('beforeunload', () => {
  if (renderTimer) window.clearInterval(renderTimer);
});

init();
