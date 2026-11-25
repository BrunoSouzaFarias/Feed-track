import { describe, it, expect } from 'vitest';
import { stepStates } from './weekSteps';

const base = { pointsCount: 0, total: 3, closedCount: 0, ackCount: 0, isCurrentWeek: true, closable: false };

describe('stepStates', () => {
  it('início da semana sem ocorrências: lançar é a etapa atual', () => {
    expect(stepStates(base)).toEqual(['current', 'current', 'upcoming', 'upcoming']);
  });
  it('quarta com ocorrências: lançar concluído, acompanhando', () => {
    expect(stepStates({ ...base, pointsCount: 4 })).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });
  it('sexta: hora de fechar', () => {
    expect(stepStates({ ...base, pointsCount: 4, closable: true })).toEqual(['done', 'done', 'current', 'upcoming']);
  });
  it('fechada para todos, ninguém assinou: ciência é a etapa atual', () => {
    expect(stepStates({ ...base, pointsCount: 4, closable: true, closedCount: 3 })).toEqual(['done', 'done', 'done', 'current']);
  });
  it('todos assinaram: tudo concluído', () => {
    expect(stepStates({ ...base, pointsCount: 4, closable: true, closedCount: 3, ackCount: 3 })).toEqual(['done', 'done', 'done', 'done']);
  });
  it('semana passada: nunca fica em "acompanhar"', () => {
    expect(stepStates({ ...base, isCurrentWeek: false, pointsCount: 2 })[1]).toBe('done');
  });
});
