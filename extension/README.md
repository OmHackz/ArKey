# ArKey Chrome Plugin

This is the Manifest V3 browser plugin for ArKey. It opens your hosted ArKey app, jumps straight to the 2FA authenticator, and can prefill authenticator setup from the current tab or selected `otpauth://` text.

## What It Does

- Opens the ArKey dashboard
- Opens the ArKey authenticator page
- Prefills issuer/account fields from the current tab
- Sends pasted `otpauth://totp/...` setup URIs to the app
- Adds a right-click menu for selected `otpauth://` text
- Lets you configure the hosted app URL from the plugin options page

## Load Locally

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this `extension` folder.
6. Pin ArKey from the extensions menu.

## Configure Hosted URL

The default app URL is:

```text
https://arkey.pages.dev
```

To change it:

1. Right-click the extension icon.
2. Open Options.
3. Enter your hosted app origin.
4. Save.

Example:

```text
https://arkey.pages.dev
```

Use only the origin, not a page path.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 extension config |
| `popup.html` | Popup UI |
| `popup.css` | Popup styles |
| `popup.js` | Popup behavior and tab launch actions |
| `background.js` | Context menu handling |
| `options.html` | Plugin settings UI |
| `options.css` | Settings styles |
| `options.js` | Stores hosted app URL in Chrome sync storage |

## Publishing Notes

Before publishing to the Chrome Web Store:

1. Add production PNG icons in 16, 32, 48, and 128 px sizes.
2. Add an `icons` block to `manifest.json`.
3. Test with the production Cloudflare Pages URL.
4. Zip the contents of this `extension` folder.

The plugin does not request broad host access. It uses `activeTab`, `tabs`, `storage`, and `contextMenus`.
