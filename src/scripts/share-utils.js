import { hashString } from './crypto.js';

export function getPublicIdFromPath(prefix) {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const index = parts.indexOf(prefix);
  if (index !== -1 && parts[index + 1]) return parts[index + 1];
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

export function getPasteMode() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const pasteIndex = parts.indexOf('paste');
  return pasteIndex !== -1 ? parts[pasteIndex + 2] || 'view' : 'view';
}

export function getExpiryFromHours(hoursValue) {
  const hours = Number(hoursValue || 0);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function normalizeMaxViews(value) {
  const views = Number(value || 0);
  return Number.isFinite(views) && views > 0 ? Math.floor(views) : null;
}

export async function hashPassword(password) {
  const trimmed = (password || '').trim();
  if (!trimmed) return null;
  return hashString(`arkey-share:${trimmed}`);
}

export async function verifyPassword(storedHash, password) {
  if (!storedHash) return true;
  return storedHash === await hashPassword(password);
}

export function isExpired(record) {
  return Boolean(record?.expires_at && new Date(record.expires_at).getTime() < Date.now());
}

export function isUsedUp(record) {
  return Boolean(record?.max_views && Number(record.view_count || 0) >= Number(record.max_views));
}

export function buildShareUrl(path) {
  return `${window.location.origin}${path}`;
}

export function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function inferContentType(filename = '', content = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.json') || looksLikeJson(content)) return 'json';
  return 'text';
}

export function renderMarkdown(source) {
  const escaped = escapeMarkup(source || '');
  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

export function escapeMarkup(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function looksLikeJson(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
