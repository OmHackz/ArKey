import { addAuthenticatorEntry, addVaultEntry, getShareLink, incrementShareView } from './db.js';
import { copyToClipboard, escapeHtml, setButtonLoading, showToast } from './ui.js';
import { downloadText, getPublicIdFromPath, isExpired, isUsedUp, verifyPassword } from './share-utils.js';

let record = null;

async function init() {
  const container = document.getElementById('share-container');
  const id = getPublicIdFromPath('share');
  if (!id) {
    container.innerHTML = stateHtml('Missing share id', 'Open a valid ArKey share link.');
    return;
  }

  container.innerHTML = loadingHtml('Loading share...');
  const { data, error } = await getShareLink(id);
  if (error || !data) {
    container.innerHTML = stateHtml('Share not found', error?.message || 'That share link is unavailable.');
    return;
  }

  record = data;
  if (isExpired(record) || isUsedUp(record)) {
    container.innerHTML = stateHtml('Share unavailable', 'This share has expired or reached its use limit.');
    return;
  }

  if (record.password_hash) {
    renderPasswordGate(container);
    return;
  }

  renderShare(container);
}

function renderPasswordGate(container) {
  container.innerHTML = `
    <h1 class="text-xl font-semibold mb-2">${escapeHtml(record.title || 'Protected share')}</h1>
    <p class="text-sm text-muted mb-4">This share is password protected.</p>
    <input id="share-unlock-password" type="password" class="input mb-3" placeholder="Password" autofocus />
    <button id="share-unlock-btn" class="btn-primary btn-sm">Unlock</button>
  `;
  document.getElementById('share-unlock-btn')?.addEventListener('click', async () => {
    const ok = await verifyPassword(record.password_hash, document.getElementById('share-unlock-password')?.value);
    if (!ok) {
      showToast('Wrong password', 'error');
      return;
    }
    renderShare(container);
  });
}

function renderShare(container) {
  const items = getItems();
  container.innerHTML = `
    <div class="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 class="text-xl font-semibold mb-1">${escapeHtml(record.title || 'Shared package')}</h1>
        <p class="text-sm text-muted">${escapeHtml(record.kind)} package / ${items.length} ${items.length === 1 ? 'item' : 'items'}</p>
      </div>
      <div class="flex items-center gap-2">
        <button id="copy-share-json" class="btn-outline btn-sm">Copy JSON</button>
        <button id="download-share-json" class="btn-outline btn-sm">Download</button>
        <button id="import-share" class="btn-primary btn-sm">Import</button>
      </div>
    </div>
    <div class="space-y-3">
      ${items.map((item) => `
        <div class="border border-neutral-200 p-4">
          <p class="text-sm font-semibold text-primary">${escapeHtml(item.title || item.issuer || item.accountName || 'Item')}</p>
          <p class="text-xs text-muted">${escapeHtml(item.accountName || item.groupName || item.account_name || record.kind)}</p>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('copy-share-json')?.addEventListener('click', () => copyToClipboard(JSON.stringify(record.payload, null, 2)));
  document.getElementById('download-share-json')?.addEventListener('click', () => downloadText(`arkey-${record.kind}-share.json`, JSON.stringify(record.payload, null, 2), 'application/json'));
  document.getElementById('import-share')?.addEventListener('click', handleImport);
}

async function handleImport(event) {
  const button = event.currentTarget;
  setButtonLoading(button, true);
  let imported = 0;

  if (record.kind === 'vault') {
    for (const item of record.payload?.vault || []) {
      const { error } = await addVaultEntry(item.title, item.code, {
        accountName: item.accountName || '',
        groupName: item.groupName || 'Shared',
      });
      if (!error) imported += 1;
    }
  }

  if (record.kind === 'authenticator') {
    for (const item of record.payload?.authenticators || []) {
      const { error } = await addAuthenticatorEntry({
        issuer: item.issuer || 'Shared',
        accountName: item.accountName || item.account_name || 'Account',
        secret: item.secret,
        digits: Number(item.digits) || 6,
        period: Number(item.period) || 30,
        algorithm: item.algorithm || 'SHA-1',
      });
      if (!error) imported += 1;
    }
  }

  await incrementShareView(record.id, Number(record.view_count || 0));
  setButtonLoading(button, false);
  showToast(`Imported ${imported} ${imported === 1 ? 'item' : 'items'}`);
}

function getItems() {
  if (record?.kind === 'vault') return record.payload?.vault || [];
  if (record?.kind === 'authenticator') return record.payload?.authenticators || [];
  return [];
}

function loadingHtml(message) {
  return `<div class="flex items-center justify-center py-16"><div class="spinner mr-3"></div><span class="text-sm text-muted">${escapeHtml(message)}</span></div>`;
}

function stateHtml(title, message) {
  return `<div class="empty-state"><h1 class="empty-state-title">${escapeHtml(title)}</h1><p class="empty-state-desc">${escapeHtml(message)}</p></div>`;
}

init();
