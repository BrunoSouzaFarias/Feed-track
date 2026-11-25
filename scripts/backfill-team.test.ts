import { describe, it, expect } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { planBackfill } from './backfill-team.mjs';

describe('planBackfill', () => {
  it('preenche só o que falta, a partir da equipe do colaborador; reporta órfãos', () => {
    const r = planBackfill([
      { path: 'feedbacks/a', data: { technicianId: 'u1' } },
      { path: 'feedbacks/b', data: { technicianId: 'u2', team: 'back-office' } },
      { path: 'feedbacks/c', data: { technicianId: 'ghost' } },
    ], { u1: 'teleservice', u2: 'back-office' });
    expect(r.updates).toEqual([{ path: 'feedbacks/a', team: 'teleservice' }]);
    expect(r.unresolved).toEqual(['feedbacks/c']);
  });
});
