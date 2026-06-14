const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;
const DEFAULT_ALGORITHM = 'SHA-1';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function normalizeSecret(secret) {
  return (secret || '').toUpperCase().replace(/[\s=-]/g, '');
}

export function isValidBase32Secret(secret) {
  const normalized = normalizeSecret(secret);
  return normalized.length > 0 && /^[A-Z2-7]+$/.test(normalized);
}

export function parseOtpAuthUri(uri) {
  if (!uri || !uri.toLowerCase().startsWith('otpauth://')) {
    throw new Error('Enter a valid otpauth:// URI');
  }

  const parsed = new URL(uri);
  if (parsed.hostname !== 'totp') {
    throw new Error('Only TOTP authenticator links are supported');
  }

  const label = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const [labelIssuer, labelAccount] = label.includes(':') ? label.split(/:(.*)/s) : ['', label];
  const issuer = parsed.searchParams.get('issuer') || labelIssuer || 'Authenticator';
  const accountName = labelAccount || label || issuer;
  const secret = parsed.searchParams.get('secret') || '';
  const digits = Number(parsed.searchParams.get('digits') || DEFAULT_DIGITS);
  const period = Number(parsed.searchParams.get('period') || DEFAULT_PERIOD);
  const algorithm = normalizeAlgorithm(parsed.searchParams.get('algorithm') || DEFAULT_ALGORITHM);

  if (!isValidBase32Secret(secret)) {
    throw new Error('The authenticator secret is missing or invalid');
  }

  return {
    issuer,
    accountName,
    secret: normalizeSecret(secret),
    digits: Number.isFinite(digits) ? digits : DEFAULT_DIGITS,
    period: Number.isFinite(period) ? period : DEFAULT_PERIOD,
    algorithm,
  };
}

export async function generateTotp(secret, options = {}) {
  const digits = options.digits || DEFAULT_DIGITS;
  const period = options.period || DEFAULT_PERIOD;
  const algorithm = options.algorithm || DEFAULT_ALGORITHM;
  const counter = Math.floor(Date.now() / 1000 / period);
  const key = await importHmacKey(base32ToBytes(secret), algorithm);
  const counterBytes = counterToBytes(counter);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = signature[signature.length - 1] & 0xf;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  const token = binary % 10 ** digits;

  return token.toString().padStart(digits, '0');
}

export function getTotpProgress(period = DEFAULT_PERIOD) {
  const seconds = Math.floor(Date.now() / 1000);
  const elapsed = seconds % period;
  return {
    elapsed,
    remaining: period - elapsed,
    percent: ((period - elapsed) / period) * 100,
  };
}

function base32ToBytes(secret) {
  const normalized = normalizeSecret(secret);
  let bits = '';
  const bytes = [];

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Secret must be Base32 encoded');
    }
    bits += value.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
}

function counterToBytes(counter) {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return bytes;
}

function importHmacKey(secretBytes, algorithm) {
  const hash = normalizeAlgorithm(algorithm);
  return crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash },
    false,
    ['sign']
  );
}

function normalizeAlgorithm(algorithm) {
  const compact = (algorithm || DEFAULT_ALGORITHM).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const upper = compact.replace(/^SHA/, 'SHA-');
  if (upper === 'SHA-1' || upper === 'SHA-256' || upper === 'SHA-512') return upper;
  return DEFAULT_ALGORITHM;
}
