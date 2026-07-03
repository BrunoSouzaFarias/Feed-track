// Mock credential store (dev/demo mode only) — kept separate from the User
// object so password hashes never leak into exports, PDFs, or any UI that
// renders the user profile.
const MOCK_CREDENTIALS_KEY = 'feed_track_mock_credentials';

export async function hashPassword(pass: string): Promise<string> {
  const data = new TextEncoder().encode(pass);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getMockCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MOCK_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function setMockCredential(uid: string, pass: string): Promise<void> {
  const creds = getMockCredentials();
  creds[uid] = await hashPassword(pass);
  localStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify(creds));
}

export async function verifyMockCredential(uid: string, pass: string): Promise<boolean> {
  const creds = getMockCredentials();
  const stored = creds[uid];
  if (!stored) return false;
  return stored === (await hashPassword(pass));
}

export function hasMockCredential(uid: string): boolean {
  return Boolean(getMockCredentials()[uid]);
}
