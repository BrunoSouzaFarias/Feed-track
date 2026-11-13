import { describe, it, expect } from 'vitest';
import { buildReport } from './monitoring';

describe('buildReport', () => {
  it('trunca mensagem/pilha e não inclui dados pessoais', () => {
    const e = new Error('x'.repeat(1000));
    const r = buildReport(e, 'test');
    expect(r.message.length).toBeLessThanOrEqual(300);
    expect((r.stack ?? '').length).toBeLessThanOrEqual(2000);
    expect(Object.keys(r).sort()).toEqual(['message', 'path', 'source', 'stack', 'ts', 'ua']);
  });
  it('aceita valores que não são Error', () => {
    expect(buildReport('falhou', 's').message).toBe('falhou');
    expect(buildReport(undefined, 's').message).toBe('Erro desconhecido');
  });
});
