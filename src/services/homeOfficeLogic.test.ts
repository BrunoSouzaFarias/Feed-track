import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HOME_OFFICE_CONFIG, mergeWithDefaults, weekIdOf, weekIdOfDateString, shiftWeek, weekRangeLabel,
  computeScore, isEligible, scoreTone, weekDocId, validatePointInput,
} from './homeOfficeLogic';

const cat = DEFAULT_HOME_OFFICE_CONFIG.categories;
const withEvidence = cat.find((c) => c.id === 'n2_return')!;
const medical = cat.find((c) => c.id === 'medical_certificate')!;

describe('semana', () => {
  it('domingo à noite pertence à semana que começou na segunda anterior', () => {
    expect(weekIdOf(new Date(2026, 10, 15, 23, 30))).toBe('2026-11-09');
    expect(weekIdOf(new Date(2026, 10, 16, 0, 5))).toBe('2026-11-16');
    expect(weekIdOf(new Date(2026, 10, 9, 0, 0))).toBe('2026-11-09');
  });
  it('datas civis, navegação e rótulo', () => {
    expect(weekIdOfDateString('2026-11-09')).toBe('2026-11-09');
    expect(weekIdOfDateString('2026-11-15')).toBe('2026-11-09');
    expect(shiftWeek('2026-11-09', -1)).toBe('2026-11-02');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(weekRangeLabel('2026-11-09')).toBe('09/11 a 15/11');
    expect(weekDocId('2026-11-09', 'u1')).toBe('2026-11-09_u1');
  });
});

describe('saldo e elegibilidade', () => {
  it('começa em 100, desconta ativos, ignora cancelados, nunca fica negativo', () => {
    expect(computeScore([])).toBe(100);
    expect(computeScore([{ points: 10, status: 'active' }, { points: 10, status: 'cancelled' }])).toBe(90);
    expect(computeScore(Array(15).fill({ points: 10, status: 'active' }))).toBe(0);
  });
  it('nota de corte é inclusiva', () => {
    expect(isEligible(70, 70)).toBe(true);
    expect(isEligible(69, 70)).toBe(false);
  });
});

describe('configuração padrão', () => {
  it('10 categorias de 10 pontos (inclui GOTO e Outros), corte 70, atestados sem anexo', () => {
    expect(cat).toHaveLength(10);
    expect(cat.slice(-2).map((c) => [c.id, c.label])).toEqual([['goto', 'GOTO'], ['other', 'Outros']]);
    expect(cat.every((c) => c.points === 10 && c.active)).toBe(true);
    expect(DEFAULT_HOME_OFFICE_CONFIG.threshold).toBe(70);
    expect(cat.filter((c) => !c.requiresEvidence).map((c) => c.id)).toEqual(['medical_certificate', 'attendance_certificate']);
  });
});

describe('validatePointInput', () => {
  const ok = { category: withEvidence, note: 'Card 4821 voltou sem evidência', occurredOn: '2026-11-11', hasEvidence: true };
  it('aceita lançamento válido', () => expect(validatePointInput(ok)).toBeNull());
  it('exige categoria, observação de 10 a 1000 e data válida', () => {
    expect(validatePointInput({ ...ok, category: undefined })).toMatch(/categoria/i);
    expect(validatePointInput({ ...ok, note: 'curta' })).toMatch(/10 caracteres/);
    expect(validatePointInput({ ...ok, note: 'x'.repeat(1001) })).toMatch(/1000/);
    expect(validatePointInput({ ...ok, occurredOn: '11/11/2026' })).toMatch(/data/i);
    expect(validatePointInput({ ...ok, occurredOn: '2026-13-40' })).toMatch(/data/i);
  });
  it('print obrigatório, exceto atestado, que nunca aceita imagem', () => {
    expect(validatePointInput({ ...ok, hasEvidence: false })).toMatch(/print/i);
    expect(validatePointInput({ ...ok, category: medical, hasEvidence: false })).toBeNull();
    expect(validatePointInput({ ...ok, category: medical, hasEvidence: true })).toMatch(/atestado/i);
  });
});

describe('scoreTone', () => {
  it('verde no corte, âmbar até 15 pontos abaixo, vermelho além', () => {
    expect(scoreTone(70, 70)).toBe('ok');
    expect(scoreTone(55, 70)).toBe('warn');
    expect(scoreTone(54, 70)).toBe('bad');
  });
});

describe('mergeWithDefaults', () => {
  it('acrescenta as categorias padrão que a configuração salva ainda não tinha, sem mexer nas existentes', () => {
    const old = { threshold: 80, categories: DEFAULT_HOME_OFFICE_CONFIG.categories.slice(0, 8).map((c) => ({ ...c, points: 5 })) };
    const merged = mergeWithDefaults(old);
    expect(merged.threshold).toBe(80);
    expect(merged.categories).toHaveLength(10);
    expect(merged.categories.slice(0, 8).every((c) => c.points === 5)).toBe(true);
    expect(merged.categories.slice(8).map((c) => c.id)).toEqual(['goto', 'other']);
  });
  it('não duplica quando já existem (nem recria categoria desativada)', () => {
    const full = { threshold: 70, categories: DEFAULT_HOME_OFFICE_CONFIG.categories.map((c) => (c.id === 'goto' ? { ...c, active: false } : c)) };
    const merged = mergeWithDefaults(full);
    expect(merged.categories).toHaveLength(10);
    expect(merged.categories.find((c) => c.id === 'goto')?.active).toBe(false);
  });
});
