import { describe, it, expect } from 'vitest';
import { buildSupervisorActions, buildCollaboratorActions, currentPeriod } from './actionCenter';
import type { Feedback, HomeOfficeWeek, SelfAssessment, User } from '../types';

// Data/hora LOCAL → ISO, para os testes não dependerem do fuso da máquina.
const L = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).toISOString();
const ts = (iso: string) => ({ seconds: Math.floor(new Date(iso).getTime() / 1000), nanoseconds: 0 }) as never;
const tech = (uid: string, name: string, over: Partial<User> = {}): User => ({
  uid, name, email: `${uid}@x.com`, role: 'technician', team: 'teleservice', position: 'N1', active: true,
  createdAt: ts(L(1, 1, 0)), badges: [], structuredPDI: [], ...over,
});
const fb = (id: string, technicianId: string, status: 'pending' | 'read', createdAt: string): Feedback => ({
  id, technicianId, technicianName: technicianId, supervisorId: 's', team: 'teleservice', type: 'positive',
  axis: 'Comunicação', description: 'x'.repeat(60), status, createdAt: ts(createdAt),
});
const goal = (id: string, deadline: string, status: 'pending' | 'in_progress' | 'completed' = 'in_progress') =>
  ({ id, title: `Meta ${id}`, description: 'd', deadline, status, createdAt: ts(L(1, 1, 0)) });

// Sexta-feira, 13/11/2026, 10h (horário local)
const FRIDAY = new Date(2026, 10, 13, 10, 0, 0);
const WEDNESDAY = new Date(2026, 10, 11, 10, 0, 0);
const base = { technicians: [] as User[], feedbacks: [] as Feedback[], assessments: [] as SelfAssessment[], weeks: [] as HomeOfficeWeek[], threshold: 70, pointsByTech: {} as Record<string, number> };

describe('currentPeriod', () => {
  it('trimestre no formato do sistema', () => {
    expect(currentPeriod(new Date(2026, 10, 13))).toBe('2026-Q4');
    expect(currentPeriod(new Date(2026, 0, 2))).toBe('2026-Q1');
  });
});

describe('buildSupervisorActions', () => {
  it('sexta: fechar a semana vem primeiro, com contagem de abaixo do corte', () => {
    const techs = [tech('a', 'Ana Silva'), tech('b', 'Bruno Souza'), tech('c', 'Carlos Oliveira')];
    const out = buildSupervisorActions({
      ...base, now: FRIDAY, technicians: techs, feedbacks: [fb('1', 'a', 'read', L(11, 10, 12)), fb('2', 'b', 'read', L(11, 10, 12)), fb('3', 'c', 'read', L(11, 10, 12))],
      pointsByTech: { a: 60, b: 40 }, // saldo = 100 - pontos
    });
    expect(out[0].kind).toBe('home_office_close');
    expect(out[0].detail).toContain('2 abaixo do corte');
  });

  it('seg–qui: não pede para fechar a semana', () => {
    const out = buildSupervisorActions({ ...base, now: WEDNESDAY, technicians: [tech('a', 'Ana Silva')], feedbacks: [fb('1', 'a', 'read', L(11, 10, 12))] });
    expect(out.some((a) => a.kind === 'home_office_close')).toBe(false);
  });

  it('semana já fechada para todos: nada a fechar', () => {
    const closed = { id: 'w', technicianId: 'a', weekId: '2026-11-09' } as HomeOfficeWeek;
    const out = buildSupervisorActions({ ...base, now: FRIDAY, technicians: [tech('a', 'Ana Silva')], weeks: [closed], feedbacks: [fb('1', 'a', 'read', L(11, 10, 12))] });
    expect(out.some((a) => a.kind === 'home_office_close')).toBe(false);
  });

  it('pessoa sem feedback há mais de 20 dias, e quem nunca recebeu', () => {
    const out = buildSupervisorActions({
      ...base, now: FRIDAY,
      technicians: [tech('a', 'Ana Silva'), tech('b', 'Bruno Souza', { structuredPDI: [goal('1', '2027-01-01')] })],
      feedbacks: [fb('1', 'a', 'read', L(10, 10, 8))],
    });
    const items = out.filter((a) => a.kind === 'no_feedback');
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.technicianId === 'a')?.title).toMatch(/há 34 dias/);
    expect(items.find((i) => i.technicianId === 'b')?.title).toMatch(/ainda não recebeu feedback/);
    expect(items.find((i) => i.technicianId === 'b')?.detail).toMatch(/meta de PDI/);
  });

  it('feedback não assinado há mais de 2 dias; inativos são ignorados', () => {
    const out = buildSupervisorActions({
      ...base, now: FRIDAY,
      technicians: [tech('a', 'Ana Silva'), tech('z', 'Inativo', { active: false })],
      feedbacks: [fb('1', 'a', 'pending', L(11, 10, 12)), fb('2', 'a', 'pending', L(11, 13, 9)), fb('3', 'z', 'pending', L(11, 1, 12))],
    });
    const unsigned = out.filter((a) => a.kind === 'unsigned_feedback');
    expect(unsigned).toHaveLength(1);
    expect(unsigned[0].title).toMatch(/Ana Silva ainda não assinou o feedback de 10\/11/);
  });

  it('meta vencendo em até 7 dias ou atrasada; concluída não conta', () => {
    const out = buildSupervisorActions({
      ...base, now: FRIDAY, feedbacks: [fb('1', 'a', 'read', L(11, 12, 12))],
      technicians: [tech('a', 'Ana Silva', { structuredPDI: [goal('1', '2026-11-16'), goal('2', '2026-11-01'), goal('3', '2026-11-10', 'completed'), goal('4', '2026-12-30')] })],
    });
    const due = out.filter((a) => a.kind === 'pdi_due');
    expect(due.map((d) => d.id).sort()).toEqual(['pdi_due:a:1', 'pdi_due:a:2']);
    expect(due.find((d) => d.id === 'pdi_due:a:2')?.title).toMatch(/atrasada/i);
  });

  it('autoavaliação do trimestre em falta', () => {
    const done = { id: 's', technicianId: 'a', period: '2026-Q4' } as SelfAssessment;
    const out = buildSupervisorActions({
      ...base, now: FRIDAY, feedbacks: [fb('1', 'a', 'read', L(11, 12, 12)), fb('2', 'b', 'read', L(11, 12, 12))],
      technicians: [tech('a', 'Ana Silva'), tech('b', 'Bruno Souza')], assessments: [done],
    });
    const pend = out.filter((a) => a.kind === 'self_assessment');
    expect(pend).toHaveLength(1);
    expect(pend[0].technicianId).toBe('b');
  });

  it('ordena por urgência e limita a 12 itens', () => {
    const techs = Array.from({ length: 20 }, (_, i) => tech(`t${i}`, `Pessoa ${i}`));
    const out = buildSupervisorActions({ ...base, now: FRIDAY, technicians: techs });
    expect(out.length).toBe(12);
    for (let i = 1; i < out.length; i++) expect(out[i].priority).toBeGreaterThanOrEqual(out[i - 1].priority);
  });
});

describe('buildCollaboratorActions', () => {
  const week = (over: Partial<HomeOfficeWeek> = {}) => ({ id: '2026-11-09_a', weekId: '2026-11-09', score: 60, threshold: 70, eligible: false, ...over }) as HomeOfficeWeek;
  it('ciência da semana fechada vem primeiro; depois feedback, autoavaliação e meta', () => {
    const out = buildCollaboratorActions({
      now: FRIDAY, weeks: [week()], assessments: [],
      feedbacks: [fb('1', 'a', 'pending', L(11, 12, 12))], goals: [goal('1', '2026-11-16')],
    });
    expect(out.map((a) => a.kind)).toEqual(['home_office_ack', 'feedback_unread', 'pdi_due', 'self_assessment']);
    expect(out[0].detail).toMatch(/não atingiu/i);
  });
  it('sem pendências → lista vazia', () => {
    const out = buildCollaboratorActions({
      now: FRIDAY, weeks: [week({ ackAt: ts(L(11, 13, 10)) })],
      assessments: [{ period: '2026-Q4' } as SelfAssessment], feedbacks: [fb('1', 'a', 'read', L(11, 12, 12))], goals: [],
    });
    expect(out).toEqual([]);
  });
});
