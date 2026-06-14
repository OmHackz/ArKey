import './style.css'
import { createClient } from '@supabase/supabase-js'

const app = document.querySelector('#app')
const storageKey = 'arkey-recovery-codes'
const vaultSecret = 'ArKey-local-vault-secret'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

function icon(name) {
  return `<span class="icon-pill">${name}</span>`
}

function encodeBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

async function encryptText(plainText) {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(vaultSecret), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText))
  return {
    cipher: encodeBase64(new Uint8Array(cipher)),
    iv: encodeBase64(iv),
    salt: encodeBase64(salt),
  }
}

async function decryptText(payload) {
  const decoder = new TextDecoder()
  const salt = decodeBase64(payload.salt)
  const iv = decodeBase64(payload.iv)
  const cipher = decodeBase64(payload.cipher)
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(vaultSecret), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return decoder.decode(plain)
}

function readStoredCodes() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]')
  } catch {
    return []
  }
}

function saveStoredCodes(codes) {
  localStorage.setItem(storageKey, JSON.stringify(codes))
}

function renderCodes(codes) {
  const list = document.querySelector('#vault-list')
  if (!codes.length) {
    list.innerHTML = '<article class="empty-card">🧰 No recovery codes yet. Store your first backup code to unlock the vault.</article>'
    return
  }

  list.innerHTML = codes
    .map((item) => `
      <article class="vault-item">
        <div>
          <strong>${item.label}</strong>
          <p>${item.note || 'Encrypted backup code'}</p>
          <code>${item.preview}</code>
        </div>
        <button class="ghost-btn" data-action="reveal" data-id="${item.id}">🔍 Reveal</button>
      </article>
    `)
    .join('')
}

async function revealCode(itemId) {
  const codes = readStoredCodes()
  const item = codes.find((entry) => entry.id === itemId)
  if (!item) return
  const plain = await decryptText(item.encrypted)
  window.alert(`Recovery code for ${item.label}:\n\n${plain}`)
}

async function syncToSupabase(codeEntry) {
  if (!supabase) return
  const { error } = await supabase.from('recovery_codes').insert([codeEntry])
  if (error) {
    console.warn('Supabase sync skipped:', error.message)
  }
}

app.innerHTML = `
  <main class="shell">
    <header class="hero-card">
      <div>
        <p class="eyebrow">${icon('🔐')} ArKey • authenticator vault</p>
        <h1>Store recovery codes with style, safety, and Supabase OAuth.</h1>
        <p class="lede">White, minimal, black-accent interface with encrypted backup storage, icons everywhere, and a ready Supabase path for auth and cloud sync.</p>
      </div>
      <div class="hero-actions">
        <button id="oauth-btn" class="primary-btn">${icon('🪪')} Connect with Supabase</button>
        <button id="signout-btn" class="ghost-btn">${icon('🚪')} Sign out</button>
      </div>
    </header>

    <section class="grid two-up">
      <article class="panel">
        <h2>${icon('🛡️')} Security at a glance</h2>
        <ul class="feature-list">
          <li>${icon('🔑')} OAuth-ready Supabase sign-in flow</li>
          <li>${icon('🧩')} AES-GCM encrypted recovery code storage</li>
          <li>${icon('☁️')} Optional cloud sync to a Supabase table</li>
          <li>${icon('✨')} Clean white canvas with black accent styling</li>
        </ul>
      </article>
      <article class="panel status-box">
        <h2>${icon('📡')} Supabase status</h2>
        <p id="status-copy">${supabase ? 'Supabase client is ready. Add your URL + anon key in the environment file to enable OAuth.' : 'Supabase is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the cloud auth flow.'}</p>
        <div class="badge-row">
          <span class="badge">${icon('🧪')} Local encryption</span>
          <span class="badge">${icon('🗄️')} Browser storage</span>
          <span class="badge">${icon('🔁')} Sync ready</span>
        </div>
      </article>
    </section>

    <section class="grid two-up">
      <article class="panel">
        <h2>${icon('🧰')} Save a recovery code</h2>
        <form id="vault-form" class="stack">
          <label>Label
            <input id="label-input" type="text" placeholder="GitHub / email / 2FA" required />
          </label>
          <label>Recovery code
            <textarea id="code-input" rows="4" placeholder="Paste or generate a one-time recovery code" required></textarea>
          </label>
          <label>Note
            <input id="note-input" type="text" placeholder="Backup for account recovery" />
          </label>
          <button type="submit" class="primary-btn">${icon('💾')} Store encrypted code</button>
        </form>
      </article>
      <article class="panel">
        <h2>${icon('📦')} Vault preview</h2>
        <div id="vault-list" class="vault-list"></div>
      </article>
    </section>

    <section class="panel">
      <h2>${icon('🗂️')} Supabase table setup</h2>
      <p class="small-copy">Create this table in your Supabase project to store encrypted recovery codes for each authenticated user.</p>
      <pre>create table if not exists recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  note text,
  encrypted jsonb not null,
  created_at timestamptz default now()
);</pre>
    </section>
  </main>
`

const savedCodes = readStoredCodes()
renderCodes(savedCodes)

app.querySelector('#vault-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const label = document.querySelector('#label-input').value.trim()
  const code = document.querySelector('#code-input').value.trim()
  const note = document.querySelector('#note-input').value.trim()
  if (!label || !code) return

  const encrypted = await encryptText(code)
  const entry = {
    id: crypto.randomUUID(),
    label,
    note,
    encrypted,
    preview: `${code.slice(0, 6)}•••••${code.slice(-2)}`,
    createdAt: new Date().toISOString(),
  }

  const next = [entry, ...readStoredCodes()].slice(0, 12)
  saveStoredCodes(next)
  renderCodes(next)

  if (supabase) {
    await syncToSupabase({
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      label: entry.label,
      note: entry.note,
      encrypted: entry.encrypted,
    })
  }

  event.target.reset()
})

app.querySelector('#vault-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="reveal"]')
  if (!button) return
  await revealCode(button.dataset.id)
})

app.querySelector('#oauth-btn').addEventListener('click', async () => {
  if (!supabase) {
    window.alert('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable OAuth.')
    return
  }

  const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
  if (error) {
    window.alert(error.message)
  }
})

app.querySelector('#signout-btn').addEventListener('click', async () => {
  if (!supabase) return
  await supabase.auth.signOut()
  window.alert('Signed out from Supabase session.')
})
