export const MIN_PASSWORD_LENGTH = 10;

/** Retorna mensagem de erro ou `null` se a senha for aceitável. */
export function validatePassword(pass: string): string | null {
  if (pass.length < MIN_PASSWORD_LENGTH) return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) return 'A senha deve conter letras e números.';
  return null;
}
