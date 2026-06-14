import { initPage } from './sidebar.js';
import { createPaste, getPaste, incrementPasteView } from './db.js';
import { copyToClipboard, showToast, escapeHtml, setButtonLoading } from './ui.js';
import {
  buildShareUrl,
  downloadText,
  escapeMarkup,
  getExpiryFromHours,
  getPasteMode,
  getPublicIdFromPath,
  hashPassword,
  inferContentType,
  isExpired,
  isUsedUp,
  normalizeMaxViews,
  renderMarkdown,
  verifyPassword,
} from './share-utils.js';

let currentPaste = null;

async function init() {
  const id = getPublicIdFromPath('paste');
  if (id) {
    await renderPublicPaste(id);
    return;
  }

  const ready = await initPage('paste');
  if (!ready) return;
  setupEditor();
}

function setupEditor() {
  document.getElementById('new-paste-btn')?.addEventListener('click', resetEditor);
  document.getElementById('paste-file-btn')?.addEventListener('click', () => document.getElementById('paste-file')?.click());
  document.getElementById('paste-file')?.addEventListener('change', handleFileInput);
  document.getElementById('paste-preview-btn')?.addEventListener('click', renderPreview);
  document.getElementById('save-paste-btn')?.addEventListener('click', handleSavePaste);

  const zone = document.getElementById('paste-drop-zone');
  ['dragenter', 'dragover'].forEach((eventName) => {
    zone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add('border-primary', 'bg-white');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    zone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove('border-primary', 'bg-white');
    });
  });
  zone?.addEventListener('drop', (event) => loadFile(event.dataTransfer.files?.[0]));
}

function resetEditor() {
  document.getElementById('paste-title').value = '';
  document.getElementById('paste-content').value = '';
  document.getElementById('paste-type').value = 'text';
  document.getElementById('paste-password').value = '';
  document.getElementById('paste-max-views').value = '';
  document.getElementById('paste-duration').value = '0';
  document.getElementById('paste-editor').classList.remove('hidden');
  document.getElementById('paste-view').classList.add('hidden');
}

function handleFileInput(event) {
  loadFile(event.target.files?.[0]);
  event.target.value = '';
}

async function loadFile(file) {
  if (!file) return;
  const content = await file.text();
  document.getElementById('paste-title').value = file.name;
  document.getElementById('paste-content').value = content;
  document.getElementById('paste-type').value = inferContentType(file.name, content);
}

async function handleSavePaste() {
  const button = document.getElementById('save-paste-btn');
  const title = document.getElementById('paste-title').value.trim() || 'Untitled paste';
  const content = document.getElementById('paste-content').value;
  const contentType = document.getElementById('paste-type').value;

  if (!content.trim()) {
    showToast('Paste content cannot be empty', 'warning');
    return;
  }

  setButtonLoading(button, true);
  const { data, error } = await createPaste({
    title,
    content,
    contentType,
    passwordHash: await hashPassword(document.getElementById('paste-password')?.value),
    maxViews: normalizeMaxViews(document.getElementById('paste-max-views')?.value),
    expiresAt: getExpiryFromHours(document.getElementById('paste-duration')?.value),
  });
  setButtonLoading(button, false);

  if (error) {
    showToast(error.message || 'Failed to host paste', 'error');
    return;
  }

  const url = buildShareUrl(`/paste/${data.id}`);
  await copyToClipboard(url);
  showToast('Paste link copied');
  window.history.pushState({}, '', `/paste/${data.id}`);
  await renderPublicPaste(data.id, data);
}

async function renderPublicPaste(id, prefetched = null) {
  document.getElementById('sidebar')?.remove();
  document.querySelector('main')?.classList.remove('ml-64');
  document.getElementById('paste-editor')?.classList.add('hidden');
  const view = document.getElementById('paste-view');
  view.classList.remove('hidden');
  view.innerHTML = loadingHtml('Loading paste...');

  const { data, error } = prefetched ? { data: prefetched, error: null } : await getPaste(id);
  if (error || !data) {
    view.innerHTML = stateHtml('Paste not found', error?.message || 'That paste link is unavailable.');
    return;
  }

  currentPaste = data;
  if (isExpired(data) || isUsedUp(data)) {
    view.innerHTML = stateHtml('Paste unavailable', 'This paste has expired or reached its view limit.');
    return;
  }

  if (data.password_hash) {
    renderPasswordGate(view, data, () => revealPaste(view, data));
    return;
  }

  await revealPaste(view, data);
}

function renderPasswordGate(container, record, onUnlock) {
  container.innerHTML = `
    <div class="card p-6 max-w-md mx-auto">
      <h2 class="text-lg font-semibold mb-2">${escapeHtml(record.title)}</h2>
      <p class="text-sm text-muted mb-4">This paste is password protected.</p>
      <input id="paste-unlock-password" type="password" class="input mb-3" placeholder="Password" autofocus />
      <button id="paste-unlock-btn" class="btn-primary btn-sm w-full">Unlock</button>
    </div>
  `;
  document.getElementById('paste-unlock-btn')?.addEventListener('click', async () => {
    const ok = await verifyPassword(record.password_hash, document.getElementById('paste-unlock-password')?.value);
    if (!ok) {
      showToast('Wrong password', 'error');
      return;
    }
    onUnlock();
  });
}

async function revealPaste(container, record) {
  if (!record._counted) {
    await incrementPasteView(record.id, Number(record.view_count || 0));
    record._counted = true;
  }

  const mode = getPasteMode();
  if (mode === 'raw') {
    document.body.innerHTML = `<pre class="p-6 whitespace-pre-wrap font-mono text-sm">${escapeHtml(record.content)}</pre>`;
    return;
  }
  if (mode === 'render') {
    document.body.innerHTML = renderContent(record);
    return;
  }
  if (mode === 'embed') {
    document.body.innerHTML = `<pre class="p-4 whitespace-pre-wrap font-mono text-xs">${escapeHtml(record.content)}</pre>`;
    return;
  }

  container.innerHTML = `
    <div class="card p-5">
      <div class="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 class="text-xl font-semibold">${escapeHtml(record.title)}</h2>
          <p class="text-sm text-muted">${escapeHtml(record.content_type)} / ${Number(record.view_count || 0) + 1}${record.max_views ? ` of ${record.max_views}` : ''} views</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 justify-end">
          <button data-action="copy" class="btn-outline btn-sm">Copy</button>
          <button data-action="clone" class="btn-outline btn-sm">Clone</button>
          <button data-action="download" class="btn-outline btn-sm">Download</button>
          <button data-action="share" class="btn-outline btn-sm">Share</button>
          <a class="btn-outline btn-sm" href="/paste/${record.id}/raw">Raw</a>
          <a class="btn-outline btn-sm" href="/paste/${record.id}/embed">Embed</a>
          <a class="btn-primary btn-sm" href="/paste/${record.id}/render">Render</a>
        </div>
      </div>
      <div class="border border-neutral-200 bg-neutral-50 p-4 overflow-auto">
        <pre class="font-mono text-sm whitespace-pre-wrap">${escapeHtml(record.content)}</pre>
      </div>
    </div>
  `;

  container.querySelector('[data-action="copy"]')?.addEventListener('click', () => copyToClipboard(record.content));
  container.querySelector('[data-action="clone"]')?.addEventListener('click', () => clonePaste(record));
  container.querySelector('[data-action="download"]')?.addEventListener('click', () => downloadText(`${record.title || 'paste'}.txt`, record.content));
  container.querySelector('[data-action="share"]')?.addEventListener('click', () => copyToClipboard(buildShareUrl(`/paste/${record.id}`)));
}

function renderPreview() {
  const record = {
    title: document.getElementById('paste-title').value || 'Preview',
    content: document.getElementById('paste-content').value,
    content_type: document.getElementById('paste-type').value,
  };
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (win) win.document.write(renderContent(record));
}

function renderContent(record) {
  if (record.content_type === 'html') {
    return `<iframe title="${escapeHtml(record.title)}" sandbox class="w-full h-screen border-0" srcdoc="${escapeHtml(record.content)}"></iframe>`;
  }
  if (record.content_type === 'markdown') {
    return `<main class="max-w-3xl mx-auto p-6 prose">${renderMarkdown(record.content)}</main>`;
  }
  return `<pre class="p-6 whitespace-pre-wrap font-mono text-sm">${escapeMarkup(record.content)}</pre>`;
}

function clonePaste(record) {
  window.history.pushState({}, '', '/paste.html');
  resetEditor();
  document.getElementById('paste-title').value = `${record.title} copy`;
  document.getElementById('paste-content').value = record.content;
  document.getElementById('paste-type').value = record.content_type || 'text';
  showToast('Paste cloned into the editor');
}

function loadingHtml(message) {
  return `<div class="flex items-center justify-center py-20"><div class="spinner mr-3"></div><span class="text-sm text-muted">${escapeHtml(message)}</span></div>`;
}

function stateHtml(title, message) {
  return `<div class="empty-state"><h2 class="empty-state-title">${escapeHtml(title)}</h2><p class="empty-state-desc">${escapeHtml(message)}</p></div>`;
}

init();
