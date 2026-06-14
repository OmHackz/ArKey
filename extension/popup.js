const DEFAULT_APP_URL = 'https://arkey.pages.dev';

const openAppButton = document.getElementById('open-app');
const openAuthenticatorButton = document.getElementById('open-authenticator');
const openVaultButton = document.getElementById('open-vault');
const openPasteButton = document.getElementById('open-paste');
const addCurrentSiteButton = document.getElementById('add-current-site');
const authorizeAppButton = document.getElementById('authorize-app');
const openOptionsButton = document.getElementById('open-options');
const currentSiteText = document.getElementById('current-site');
const appUrlText = document.getElementById('app-url');
const otpAuthForm = document.getElementById('otpauth-form');
const otpAuthInput = document.getElementById('otpauth-uri');

let activeTab = null;
let appUrl = DEFAULT_APP_URL;

init();

async function init() {
  appUrl = await getAppUrl();
  appUrlText.textContent = new URL(appUrl).hostname;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0] || null;

  if (activeTab?.url) {
    try {
      const url = new URL(activeTab.url);
      currentSiteText.textContent = url.hostname;
    } catch {
      currentSiteText.textContent = 'Current tab unavailable';
    }
  }
}

openAppButton.addEventListener('click', () => {
  openUrl(`${appUrl}/dashboard.html`);
});

openAuthenticatorButton.addEventListener('click', () => {
  openUrl(`${appUrl}/authenticator.html`);
});

openVaultButton.addEventListener('click', () => {
  openUrl(`${appUrl}/vault.html`);
});

openPasteButton.addEventListener('click', () => {
  openUrl(`${appUrl}/paste.html`);
});

addCurrentSiteButton.addEventListener('click', () => {
  const params = new URLSearchParams();

  if (activeTab?.url) {
    try {
      const url = new URL(activeTab.url);
      params.set('issuer', url.hostname.replace(/^www\./, ''));
    } catch {
      // Ignore malformed browser URLs.
    }
  }

  if (activeTab?.title) {
    params.set('account', activeTab.title.slice(0, 80));
  }

  openUrl(`${appUrl}/authenticator.html?${params.toString()}`);
});

authorizeAppButton.addEventListener('click', () => {
  openUrl(`${appUrl}/login.html`);
});

otpAuthForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = otpAuthInput.value.trim();
  if (!value) return;

  const params = new URLSearchParams({ otpauth: value });
  openUrl(`${appUrl}/authenticator.html?${params.toString()}`);
});

openOptionsButton.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

function openUrl(url) {
  chrome.tabs.create({ url });
  window.close();
}

async function getAppUrl() {
  const stored = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  return normalizeUrl(stored.appUrl);
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(value || DEFAULT_APP_URL);
    return parsed.origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}
