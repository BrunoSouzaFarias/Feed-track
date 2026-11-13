import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseDate, tryParseDate, formatDate, parseLocalDate, daysSince } from './dateUtils';

afterEach(() => vi.useRealTimers());

describe('dateUtils', () => {
  it('aceita Date, número, ISO, {seconds} e objetos com toDate', () => {
    expect(parseDate(new Date('2026-01-02T00:00:00Z')).toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(parseDate(1_000).getTime()).toBe(1_000);
    expect(parseDate('2026-01-02T00:00:00Z').toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(parseDate({ seconds: 10, nanoseconds: 0 }).getTime()).toBe(10_000);
    expect(parseDate({ _seconds: 10 }).getTime()).toBe(10_000);
    expect(parseDate({ toDate: () => new Date(5) }).getTime()).toBe(5);
  });

  it('valor vazio/inválido NÃO vira "agora"', () => {
    expect(parseDate(null).getTime()).toBe(0);
    expect(parseDate(undefined).getTime()).toBe(0);
    expect(parseDate('lixo').getTime()).toBe(0);
    expect(tryParseDate('lixo')).toBeNull();
    expect(tryParseDate({} as never)).toBeNull();
    expect(formatDate(null)).toBe('—');
  });

  it('parseLocalDate usa fuso local (não UTC)', () => {
    const d = parseLocalDate('2026-06-30');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 30]);
  });

  it('daysSince nunca é negativo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
    expect(daysSince(new Date('2026-01-01T12:00:00Z'))).toBe(9);
    expect(daysSince(new Date('2026-02-01T12:00:00Z'))).toBe(0);
  });
});
