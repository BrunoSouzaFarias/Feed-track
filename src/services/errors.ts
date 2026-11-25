/**
 * Converte erros do Firebase / da aplicação em mensagens amigáveis em pt-BR.
 * Nunca expõe códigos internos ou mensagens cruas do SDK ao usuário.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha inválidos.',
  'auth/wrong-password': 'E-mail ou senha inválidos.',
  'auth/user-not-found': 'E-mail ou senha inválidos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'Senha fraca. Use ao menos 10 caracteres com letras e números.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'auth/network-request-failed': 'Sem conexão com a internet. Tente novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  'unavailable': 'Serviço indisponível no momento. Verifique sua conexão.',
  'not-found': 'Registro não encontrado.',
  'already-exists': 'Este registro já existe.',
  'resource-exhausted': 'Limite de uso atingido. Tente novamente mais tarde.',
  'unauthenticated': 'Sua sessão expirou. Entre novamente.',
};

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

export function friendlyError(err: unknown, fallback = 'Ocorreu um erro inesperado. Tente novamente.'): string {
  if (err instanceof AppError) return err.message;
  const code = getErrorCode(err);
  if (code) {
    const key = code.replace(/^firestore\//, '');
    if (MESSAGES[code]) return MESSAGES[code];
    if (MESSAGES[key]) return MESSAGES[key];
  }
  return fallback;
}

/** Erros permanentes não devem ser repetidos (permissão, dados inválidos). */
export function isPermanentFirestoreError(err: unknown): boolean {
  const code = getErrorCode(err)?.replace(/^firestore\//, '');
  return code === 'permission-denied' || code === 'invalid-argument' ||
    code === 'not-found' || code === 'failed-precondition' || code === 'unauthenticated';
}
