<<<<<<< HEAD
# ArKey
=======
# ArKey

ArKey is a secure recovery-code vault and 2FA authenticator built with Vite, Supabase Auth, Supabase Postgres, and client-side encryption. It includes a Chrome Manifest V3 plugin for quickly opening the app and starting authenticator setup from the current browser tab.

## Features

- Google, GitHub, and email magic-link sign-in through Supabase Auth
- Encrypted recovery-code vault
- Encrypted TOTP 2FA authenticator storage
- Live 6-8 digit TOTP code generation
- `otpauth://` URI paste and browser-plugin handoff
- Supabase Row Level Security schema
- Cloudflare Pages deployment-ready static build
- Chrome extension/plugin companion

## Tech Stack

- Vite
- Tailwind CSS
- Supabase JS
- Supabase Auth and Postgres
- Web Crypto API
- Chrome Extension Manifest V3

## Quick Start

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY
```

Start development:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment Variables

See [.env.example](./.env.example).

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_ENCRYPTION_KEY` | Stable client-side encryption passphrase used to derive the AES-GCM key |

Keep `VITE_ENCRYPTION_KEY` stable. Changing it later means previously encrypted vault and authenticator records cannot be decrypted.

## Database Schema

Run the SQL in [docs/database-schema.sql](./docs/database-schema.sql) from the Supabase SQL Editor.

The schema creates:

- `public.users`
- `public.vault`
- `public.authenticators`
- Row Level Security policies for per-user access
- Indexes for user-scoped reads
- An `updated_at` trigger for authenticators

## OAuth Setup

Full OAuth setup is documented in [docs/oauth-cloudflare-pages.md](./docs/oauth-cloudflare-pages.md).

For `https://arkey.pages.dev`, configure Supabase Auth with:

```text
Site URL:
https://arkey.pages.dev

Redirect URLs:
https://arkey.pages.dev/**
http://localhost:5173/**
```

Google and GitHub provider callback URL:

```text
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

## Deploy to Cloudflare Pages

Cloudflare Pages settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: ArKey
Node.js version: 20 or newer
```

Set these Cloudflare Pages environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY
```

## Chrome Plugin

The plugin lives in [extension/](./extension).

Load it locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension` folder.
5. Open plugin settings if your hosted app URL is not `https://arkey.pages.dev`.

Plugin docs are in [extension/README.md](./extension/README.md).

## Important Security Notes

- Secrets are encrypted in the browser before being stored in Supabase.
- This is a static frontend app, so `VITE_` variables are public at build time.
- The anon key is expected to be public; RLS policies are what protect user data.
- Do not commit `.env.local` or production secrets.
- Use HTTPS in production so Web Crypto, clipboard, and OAuth flows work reliably.

## Project Structure

```text
.
├── authenticator.html
├── dashboard.html
├── vault.html
├── settings.html
├── docs/
│   ├── database-schema.sql
│   └── oauth-cloudflare-pages.md
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── background.js
│   └── options.html
└── src/
    ├── scripts/
    │   ├── auth.js
    │   ├── authenticator.js
    │   ├── crypto.js
    │   ├── db.js
    │   └── totp.js
    └── styles/
        └── main.css
```
>>>>>>> 202ff18 (👍 Initial Commit)
