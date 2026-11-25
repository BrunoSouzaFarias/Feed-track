import { describe, it, expect } from 'vitest';
import { AppError, friendlyError, isPermanentFirestoreError } from './errors';

describe('errors', () => {
  it('mapeia códigos do Firebase para pt-BR sem vazar o código', () => {
    expect(friendlyError({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha inválidos.');
    expect(friendlyError({ code: 'permission-denied' })).toMatch(/permissão/);
    expect(friendlyError({ code: 'firestore/permission-denied' })).toMatch(/permissão/);
  });
  it('usa o fallback para erros desconhecidos e não expõe message crua', () => {
    expect(friendlyError(new Error('INTERNAL stack details'), 'Falhou')).toBe('Falhou');
  });
  it('AppError preserva a mensagem', () => {
    expect(friendlyError(new AppError('Mensagem própria'))).toBe('Mensagem própria');
  });
  it('classifica erros permanentes', () => {
    expect(isPermanentFirestoreError({ code: 'permission-denied' })).toBe(true);
    expect(isPermanentFirestoreError({ code: 'unavailable' })).toBe(false);
  });
});
