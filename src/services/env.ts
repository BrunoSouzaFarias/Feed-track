/**
 * Fonte ÚNICA da decisão "mock x Firebase real".
 *
 * - Sem `VITE_FIREBASE_API_KEY` (ou com "mock"/"dummy"), o app usa o modo mock
 *   (dados em localStorage) — apenas para desenvolvimento/demonstração.
 * - Em build de PRODUÇÃO o modo mock é BLOQUEADO, a menos que
 *   `VITE_ALLOW_MOCK=true` seja definido de forma explícita. Isso evita que um
 *   deploy sem variáveis de ambiente suba com contas de demonstração e senha
 *   conhecida.
 */
const apiKey: string | undefined = import.meta.env.VITE_FIREBASE_API_KEY;

export const isFirebaseMock: boolean =
  !apiKey || apiKey.includes('mock') || apiKey.includes('dummy');

export const isMockBlocked: boolean =
  isFirebaseMock &&
  import.meta.env.PROD &&
  import.meta.env.VITE_ALLOW_MOCK !== 'true';

/**
 * Quando `true`, PDI/badges/exclusão de conta passam pelas Cloud Functions de
 * `/functions` (servidor é a fonte da verdade). Exige as functions implantadas
 * e, idealmente, `firestore.strict.rules`.
 */
export const useCloudFunctions: boolean = !isFirebaseMock && import.meta.env.VITE_USE_CLOUD_FUNCTIONS === 'true';

/** Variáveis obrigatórias ausentes quando o Firebase real está configurado. */
export function getMissingFirebaseEnv(): string[] {
  if (isFirebaseMock) return [];
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const;
  return required.filter((k) => !import.meta.env[k]);
}
