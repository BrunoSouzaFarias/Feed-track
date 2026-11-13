/**
 * Assinatura digital real (ECDSA P-256 / SHA-256) via Web Crypto.
 *
 * - Cada usuário/dispositivo gera um par de chaves. A chave PRIVADA é criada
 *   como NÃO-EXPORTÁVEL e guardada em IndexedDB (CryptoKey estruturado) — o
 *   JavaScript da página nunca enxerga o material da chave.
 * - A chave PÚBLICA (JWK) vai junto do log de auditoria, permitindo que
 *   qualquer pessoa verifique a assinatura (`verifySignature`).
 *
 * Limite honesto: sem um registro central da chave pública por usuário (ex.:
 * Cloud Function que a ancora), isto prova integridade e posse da chave do
 * dispositivo, não não-repúdio jurídico forte.
 */
const DB_NAME = 'feed-track-keys';
const STORE = 'keys';
const ALGO: EcKeyGenParams = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGO: EcdsaParams = { name: 'ECDSA', hash: 'SHA-256' };

interface StoredKey {
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readKey(userId: string): Promise<StoredKey | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(userId);
    req.onsuccess = () => resolve(req.result as StoredKey | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function writeKey(userId: string, value: StoredKey): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOrCreateKey(userId: string): Promise<StoredKey> {
  const existing = await readKey(userId);
  if (existing) return existing;
  const pair = await crypto.subtle.generateKey(ALGO, false, ['sign', 'verify']);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const stored: StoredKey = { privateKey: pair.privateKey, publicKeyJwk };
  await writeKey(userId, stored);
  return stored;
}

function toBase64(buf: ArrayBuffer): string {
  let s = '';
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** SHA-256 hex. Lança erro se Web Crypto não estiver disponível (sem fallback fraco). */
export async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto indisponível: use HTTPS/navegador moderno.');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Assina o hash (hex) e devolve assinatura base64 + chave pública (JWK serializado). */
export async function signHash(
  hashHex: string,
  userId: string
): Promise<{ signature: string; publicKey: string }> {
  const { privateKey, publicKeyJwk } = await getOrCreateKey(userId);
  const sig = await crypto.subtle.sign(SIGN_ALGO, privateKey, new TextEncoder().encode(hashHex));
  return { signature: toBase64(sig), publicKey: JSON.stringify(publicKeyJwk) };
}

/** Verifica se `signature` foi produzida pela `publicKey` sobre `hashHex`. */
export async function verifySignature(
  hashHex: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const jwk = JSON.parse(publicKey) as JsonWebKey;
    const key = await crypto.subtle.importKey('jwk', jwk, ALGO, false, ['verify']);
    return await crypto.subtle.verify(
      SIGN_ALGO, key, fromBase64(signature), new TextEncoder().encode(hashHex)
    );
  } catch {
    return false;
  }
}
