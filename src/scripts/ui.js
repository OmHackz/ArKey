/**
 * ArKey UI Module
 * Shared UI utilities: toast notifications, clipboard, loading states,
 * confirmation dialogs, and common DOM helpers.
 */

import { Copy, Check, Trash2, Eye, EyeOff, Loader2, Shield, KeyRound, AlertTriangle, X } from 'lucide';

/**
 * Show a toast notification.
 */
export function showToast(message, type = 'success', duration = 3000) {
  let toast = document.getElementById('toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast hide';
    document.body.appendChild(toast);
  }

  const bgColor = type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-primary';
  toast.className = `toast ${bgColor} text-white show`;
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      ${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      ${type === 'error' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' : ''}
      ${type === 'warning' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' : ''}
      <span>${escapeHtml(message)}</span>
    </div>
  `;

  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }, duration);
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard', 'success');
    return true;
  }
}

/**
 * Show a confirmation dialog.
 */
export function showConfirm(title, message, onConfirm, onCancel) {
  let overlay = document.getElementById('confirm-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="modal-content p-6 animate-fade-in">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0 w-10 h-10 bg-red-50 flex items-center justify-center mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="flex-1">
          <h3 class="text-base font-semibold text-primary mb-1">${escapeHtml(title)}</h3>
          <p class="text-sm text-muted mb-5">${escapeHtml(message)}</p>
          <div class="flex items-center gap-3 justify-end">
            <button id="confirm-cancel" class="btn-outline btn-sm">Cancel</button>
            <button id="confirm-ok" class="btn-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';

  const cancelBtn = document.getElementById('confirm-cancel');
  const okBtn = document.getElementById('confirm-ok');

  cancelBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    if (onCancel) onCancel();
  });

  okBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    if (onConfirm) onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
      if (onCancel) onCancel();
    }
  });
}

/**
 * Show a loading state on a button.
 */
export function setButtonLoading(button, loading = true, originalText = '') {
  if (loading) {
    if (!originalText) button._originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <svg class="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Loading...</span>
    `;
  } else {
    button.disabled = false;
    button.innerHTML = button._originalText || originalText;
  }
}

/**
 * Show/hide a loading overlay on an element.
 */
export function setElementLoading(element, loading = true) {
  if (loading) {
    element._originalContent = element.innerHTML;
    element.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <div class="spinner mb-4"></div>
        <p class="text-sm text-muted">Loading...</p>
      </div>
    `;
  } else if (element._originalContent) {
    element.innerHTML = element._originalContent;
  }
}

/**
 * Show an empty state in a container.
 */
export function showEmptyState(container, title, description, actionHtml = '') {
  container.innerHTML = `
    <div class="empty-state animate-fade-in">
      <div class="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      </div>
      <h3 class="empty-state-title">${escapeHtml(title)}</h3>
      <p class="empty-state-desc">${escapeHtml(description)}</p>
      ${actionHtml}
    </div>
  `;
}

/**
 * Show an error state.
 */
export function showErrorState(container, message, onRetry) {
  container.innerHTML = `
    <div class="empty-state animate-fade-in">
      <div class="empty-state-icon text-red-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h3 class="empty-state-title">Something went wrong</h3>
      <p class="empty-state-desc">${escapeHtml(message)}</p>
      ${onRetry ? `<button id="retry-btn" class="btn-outline btn-sm mt-4">Try Again</button>` : ''}
    </div>
  `;

  if (onRetry) {
    document.getElementById('retry-btn')?.addEventListener('click', onRetry);
  }
}

/**
 * Escape HTML to prevent XSS.
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return formatDate(dateString);
}

/**
 * Mask a string, showing only the last N characters.
 */
export function maskString(str, visible = 4) {
  if (!str || str.length <= visible) return str;
  const masked = '*'.repeat(str.length - visible);
  return masked + str.slice(-visible);
}

/**
 * Debounce a function.
 */
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
