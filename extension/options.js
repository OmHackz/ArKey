const DEFAULT_APP_URL = 'https://arkey.pages.dev';

const form = document.getElementById('options-form');
const input = document.getElementById('app-url');
const resetButton = document.getElementById('reset');
const statusText = document.getElementById('status');

init();

async function init() {
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  input.value = normalizeUrl(stored.appUrl);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const appUrl = normalizeUrl(input.value);
    await chrome.storage.sync.set({ appUrl });
    input.value = appUrl;
    showStatus('Saved');
  } catch {
    showStatus('Enter a valid URL, including https://', true);
  }
});

resetButton.addEventListener('click', async () => {
  await chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  input.value = DEFAULT_APP_URL;
  showStatus('Reset to arkey.pages.dev');
});

function normalizeUrl(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Unsupported protocol');
  }
  return parsed.origin;
}

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#dc2626' : '#166534';
  window.setTimeout(() => {
    statusText.textContent = '';
  }, 2500);
}
