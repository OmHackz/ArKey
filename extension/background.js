const DEFAULT_APP_URL = 'https://arkey.pages.dev';
const OTPAUTH_MENU_ID = 'arkey-add-otpauth';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: OTPAUTH_MENU_ID,
    title: 'Add otpauth URI to ArKey',
    contexts: ['selection', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== OTPAUTH_MENU_ID) return;

  const appUrl = await getAppUrl();
  const candidate = info.linkUrl || info.selectionText || '';
  const params = new URLSearchParams();

  if (candidate.startsWith('otpauth://')) {
    params.set('otpauth', candidate);
  }

  chrome.tabs.create({
    url: `${appUrl}/authenticator.html${params.toString() ? `?${params.toString()}` : ''}`,
  });
});

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
