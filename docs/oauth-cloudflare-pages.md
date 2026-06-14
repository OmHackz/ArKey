# ArKey OAuth, Database, and Cloudflare Pages Setup

This app is a static Vite frontend that uses Supabase Auth and Supabase tables. The production URL assumed by the docs and extension is:

```text
https://arkey.pages.dev
```

## 1. Supabase Project

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run the full SQL in [`docs/database-schema.sql`](./database-schema.sql).
4. Open **Project Settings > API** and copy:
   - Project URL
   - `anon` public key

The frontend expects these Vite environment variables:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY=use-a-long-random-string-32-plus-chars
```

Keep `VITE_ENCRYPTION_KEY` stable after launch. Existing encrypted vault and authenticator records cannot be decrypted if it changes.

## 2. Supabase Auth URLs

In **Supabase Dashboard > Authentication > URL Configuration**:

```text
Site URL:
https://arkey.pages.dev

Redirect URLs:
https://arkey.pages.dev/**
http://localhost:5173/**
```

The app redirects OAuth users to `/dashboard.html`, so wildcard redirects keep local development and production working.

## 3. Google OAuth

1. Go to Google Cloud Console.
2. Create or select a project.
3. Configure **OAuth consent screen**.
4. Create **OAuth client ID > Web application**.
5. Add authorized JavaScript origins:

```text
https://arkey.pages.dev
http://localhost:5173
```

6. Add authorized redirect URI from Supabase:

```text
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

7. Copy the Google Client ID and Client Secret into **Supabase > Authentication > Providers > Google** and enable it.

## 4. GitHub OAuth

1. Go to **GitHub > Settings > Developer settings > OAuth Apps**.
2. Create a new OAuth app.
3. Set:

```text
Homepage URL:
https://arkey.pages.dev

Authorization callback URL:
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

4. Copy the GitHub Client ID and Client Secret into **Supabase > Authentication > Providers > GitHub** and enable it.

## 5. Cloudflare Pages Deployment

1. Push this repo to GitHub.
2. In Cloudflare, open **Workers & Pages > Create > Pages**.
3. Connect the repository.
4. Use these build settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: ArKey
Node.js version: 20 or newer
```

5. Add these environment variables in **Pages > Settings > Environment variables**:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY
```

6. Deploy. Cloudflare will publish to a `*.pages.dev` URL.
7. If the project name is not already `arkey`, set the Pages project name or custom domain so the final URL is:

```text
https://arkey.pages.dev
```

## 6. Chrome Extension Setup

The extension is in [`extension/`](../extension). It is a Manifest V3 companion popup for opening ArKey, adding a 2FA entry for the current site, and using selected `otpauth://` text.

Local install:

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension` folder.
5. Pin ArKey from the extensions menu.

If your hosted URL changes, open the extension options page and update the app origin there.

## 7. Local Development

Create `.env.local` in the app root:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY=use-a-long-random-string-32-plus-chars
```

Run:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```
