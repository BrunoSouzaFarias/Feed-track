import { describe, it, expect } from 'vitest';
import { BADGES, canManageTeam, canTransition, evaluateBadges, isGoalStatus } from './logic';

const DAY = 86_400_000;
const base = { hasReadFeedback: false, goalStatuses: [] as ('pending' | 'in_progress' | 'completed')[], hasAssessments: false, createdAtMs: 1_000_000_000_000, nowMs: 1_000_000_000_000 };

describe('evaluateBadges', () => {
  it('nada para um usuário novo', () => expect(evaluateBadges(base)).toEqual([]));
  it('lê feedback / inicia PDI / conclui PDI / autoavalia', () => {
    expect(evaluateBadges({ ...base, hasReadFeedback: true })).toEqual(['badge_first_read']);
    expect(evaluateBadges({ ...base, goalStatuses: ['pending'] })).toEqual(['badge_pdi_started']);
    expect(evaluateBadges({ ...base, goalStatuses: ['pending', 'completed'] })).toEqual(['badge_pdi_started', 'badge_pdi_completed']);
    expect(evaluateBadges({ ...base, hasAssessments: true })).toEqual(['badge_assessment_done']);
  });
  it('30 dias ativos só a partir de 30 dias (sem exceção para uid de demonstração)', () => {
    expect(evaluateBadges({ ...base, nowMs: base.createdAtMs + 29 * DAY })).not.toContain('badge_30_days');
    expect(evaluateBadges({ ...base, nowMs: base.createdAtMs + 30 * DAY })).toContain('badge_30_days');
  });
  it('todo id avaliado existe no catálogo', () => {
    const all = evaluateBadges({ hasReadFeedback: true, goalStatuses: ['completed'], hasAssessments: true, createdAtMs: 0, nowMs: 31 * DAY });
    expect(all.sort()).toEqual(BADGES.map((b) => b.id).sort());
  });
});

describe('canTransition', () => {
  it('técnico só avança', () => {
    expect(canTransition('pending', 'in_progress', false)).toBe(true);
    expect(canTransition('in_progress', 'completed', false)).toBe(true);
    expect(canTransition('pending', 'completed', false)).toBe(true);
    expect(canTransition('completed', 'in_progress', false)).toBe(false);
    expect(canTransition('in_progress', 'pending', false)).toBe(false);
  });
  it('supervisor pode reabrir; mesmo status nunca', () => {
    expect(canTransition('completed', 'pending', true)).toBe(true);
    expect(canTransition('pending', 'pending', true)).toBe(false);
  });
  it('isGoalStatus valida entrada', () => {
    expect(isGoalStatus('completed')).toBe(true);
    expect(isGoalStatus('hacked')).toBe(false);
  });
});

describe('canManageTeam', () => {
  it('sem escopo gerencia tudo; com escopo só a própria equipe', () => {
    expect(canManageTeam(null, 'teleservice')).toBe(true);
    expect(canManageTeam(undefined, 'back-office')).toBe(true);
    expect(canManageTeam('teleservice', 'teleservice')).toBe(true);
    expect(canManageTeam('teleservice', 'back-office')).toBe(false);
    expect(canManageTeam('teleservice', undefined)).toBe(false);
  });
});
