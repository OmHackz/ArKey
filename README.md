<p align="center">
  <img src="./public/favicon.svg" width="84" height="84" alt="ArKey logo" />
</p>

<h1 align="center">ArKey</h1>

<p align="center">
  Secure recovery-code vault, encrypted TOTP authenticator, and Chrome plugin companion.
</p>

<p align="center">
  <a href="https://arkey.pages.dev">
    <img alt="Live demo" src="https://img.shields.io/badge/Live-arkey.pages.dev-000000?style=for-the-badge&logo=cloudflarepages&logoColor=white" />
  </a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOmHackz%2FArKey&project-name=arkey&repository-name=ArKey&root-directory=ArKey&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_ENCRYPTION_KEY&envDescription=Supabase%20project%20URL%2C%20anon%20key%2C%20and%20stable%20client-side%20encryption%20key&build-command=npm%20run%20build&output-directory=dist">
    <img alt="Deploy with Vercel" src="https://img.shields.io/badge/Deploy%20with-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  </a>
  <a href="https://github.com/OmHackz/ArKey.git">
    <img alt="Clone repository" src="https://img.shields.io/badge/Clone-Repository-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
</p>

<p align="center">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3FCF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Chrome Extension" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Private-lightgrey?style=flat-square" />
</p>

---

## Preview

ArKey is a static Vite app that signs users in with Supabase Auth, encrypts sensitive data in the browser with Web Crypto, stores user-scoped rows behind Supabase RLS, and ships with a Chrome Manifest V3 plugin.

| Area | What it does |
| --- | --- |
| Vault | Stores encrypted recovery codes |
| Authenticator | Stores encrypted TOTP secrets and generates live 2FA codes |
| Dashboard | Shows vault and authenticator totals |
| Plugin | Opens ArKey, pre-fills 2FA setup, and handles `otpauth://` links |

## Features

- Supabase Google, GitHub, and email magic-link auth
- Client-side AES-GCM encryption with PBKDF2 key derivation
- Encrypted recovery-code vault
- Encrypted TOTP 2FA authenticator
- `otpauth://totp/...` URI import
- Chrome extension/plugin companion
- Supabase SQL schema with Row Level Security policies
- Cloudflare Pages and Vercel deployment notes

## One-Click Deploy

<p>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOmHackz%2FArKey&project-name=arkey&repository-name=ArKey&root-directory=ArKey&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_ENCRYPTION_KEY&envDescription=Supabase%20project%20URL%2C%20anon%20key%2C%20and%20stable%20client-side%20encryption%20key&build-command=npm%20run%20build&output-directory=dist">
    <img alt="Deploy with Vercel" src="https://vercel.com/button" />
  </a>
</p>

Required Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY
```

If your GitHub repository is not `OmHackz/ArKey`, update the deploy link above with your own repository URL.

## Clone

```bash
git clone https://github.com/OmHackz/ArKey.git
cd ArKey/ArKey
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
git clone https://github.com/OmHackz/ArKey.git
Set-Location ArKey\ArKey
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Environment

Create `.env.local` from [.env.example](./.env.example):

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY=replace-with-a-long-random-32-plus-character-string
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `VITE_ENCRYPTION_KEY` | Yes | Stable passphrase used to derive the browser encryption key |

Keep `VITE_ENCRYPTION_KEY` stable. Changing it later means existing encrypted vault and authenticator records cannot be decrypted.

## Database Schema

Run [docs/database-schema.sql](./docs/database-schema.sql) in the Supabase SQL Editor.

It creates:

- `public.users`
- `public.vault`
- `public.authenticators`
- User-scoped Row Level Security policies
- Indexes for authenticated reads
- `updated_at` trigger for authenticator rows

## OAuth Setup

Full guide: [docs/oauth-cloudflare-pages.md](./docs/oauth-cloudflare-pages.md)

Supabase Auth URL settings for the hosted app:

```text
Site URL:
https://arkey.pages.dev

Redirect URLs:
https://arkey.pages.dev/**
http://localhost:5173/**
```

Provider callback URL for Google and GitHub:

```text
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

## Deploy to Cloudflare Pages

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: ArKey
Node.js version: 20 or newer
```

Add the same three environment variables from `.env.example` in Cloudflare Pages.

## Chrome Plugin

<p>
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" />
  <img alt="No broad host access" src="https://img.shields.io/badge/Host%20Access-None%20Broad-16A34A?style=flat-square" />
</p>

The plugin lives in [extension/](./extension).

Load it locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension` folder.
5. Open plugin settings if your hosted app URL is not `https://arkey.pages.dev`.

Plugin docs: [extension/README.md](./extension/README.md)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production static files into `dist/` |
| `npm run preview` | Preview the production build locally |

## Project Map

```text
.
|-- authenticator.html
|-- dashboard.html
|-- vault.html
|-- settings.html
|-- docs/
|   |-- database-schema.sql
|   `-- oauth-cloudflare-pages.md
|-- extension/
|   |-- manifest.json
|   |-- popup.html
|   |-- background.js
|   `-- options.html
`-- src/
    |-- scripts/
    |   |-- auth.js
    |   |-- authenticator.js
    |   |-- crypto.js
    |   |-- db.js
    |   `-- totp.js
    `-- styles/
        `-- main.css
```

## Security Notes

- Secrets are encrypted before storage.
- Supabase anon keys are public by design; Row Level Security protects user rows.
- Do not commit `.env.local`.
- Use HTTPS in production for OAuth, clipboard, and Web Crypto behavior.
- This is a static frontend, so all `VITE_` values are visible in the built client.
