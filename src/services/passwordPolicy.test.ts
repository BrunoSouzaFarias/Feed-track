import { describe, it, expect } from 'vitest';
import { validatePassword } from './passwordPolicy';

describe('validatePassword', () => {
  it('rejeita senhas curtas', () => expect(validatePassword('abc123')).toMatch(/pelo menos 10/));
  it('exige letras e números', () => {
    expect(validatePassword('abcdefghijkl')).toMatch(/letras e números/);
    expect(validatePassword('1234567890123')).toMatch(/letras e números/);
  });
  it('aceita senha forte', () => expect(validatePassword('liberty123456')).toBeNull());
});
