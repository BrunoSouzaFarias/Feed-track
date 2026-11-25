// Credenciais do MODO MOCK (dev/demonstração; bloqueado em produção) — separadas
// do objeto User para que hashes nunca vazem em exportações/PDFs/UI.
// Usa PBKDF2-SHA256 com sal aleatório por usuário (antes: SHA-256 puro, sem sal).
const MOCK_CREDENTIALS_KEY = 'feed_track_mock_credentials_v2';
const ITERATIONS = 100_000;

type StoredCredential = { salt: string; hash: string };

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));

async function derive(pass: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

function getMockCredentials(): Record<string, StoredCredential> {
  try {
    const raw = localStorage.getItem(MOCK_CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredCredential>) : {};
  } catch {
    return {};
  }
}

export async function setMockCredential(uid: string, pass: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const creds = getMockCredentials();
  creds[uid] = { salt: toHex(salt), hash: await derive(pass, salt) };
  localStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify(creds));
}

export async function verifyMockCredential(uid: string, pass: string): Promise<boolean> {
  const stored = getMockCredentials()[uid];
  if (!stored) return false;
  const candidate = await derive(pass, fromHex(stored.salt) as Uint8Array<ArrayBuffer>);
  // Comparação em tempo constante.
  if (candidate.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

export function hasMockCredential(uid: string): boolean {
  return Boolean(getMockCredentials()[uid]);
}
