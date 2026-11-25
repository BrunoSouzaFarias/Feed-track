import { describe, it, expect } from 'vitest';
import { normalize, searchPalette } from './commandPalette';
import type { Feedback, User } from '../types';

const ts = { seconds: 1_700_000_000, nanoseconds: 0 } as never;
const tech = (uid: string, name: string, over: Partial<User> = {}): User => ({
  uid, name, email: `${uid}@x.com`, role: 'technician', team: 'teleservice', position: 'Agente N1', active: true,
  createdAt: ts, badges: [], structuredPDI: [], ...over,
});
const fb = (id: string, technicianId: string, technicianName: string, axis: string): Feedback => ({
  id, technicianId, technicianName, supervisorId: 's', team: 'teleservice', type: 'positive', axis,
  description: 'x'.repeat(60), status: 'read', createdAt: ts,
});

const technicians = [
  tech('a', 'Ana Silva', { structuredPDI: [{ id: 'g1', title: 'Melhoria de SLA', description: '', deadline: '2026-12-01', status: 'in_progress', createdAt: ts }] }),
  tech('j', 'João Pereira'),
  tech('z', 'Ana Inativa', { active: false }),
];
const feedbacks = [fb('f1', 'a', 'Ana Silva', 'Comunicação'), fb('f2', 'j', 'João Pereira', 'Gestão do tempo')];
const data = { technicians, feedbacks };

describe('normalize', () => {
  it('ignora acentos, caixa e espaços extras', () => expect(normalize('  JOÃO  Pereira ')).toBe('joao pereira'));
});

describe('searchPalette', () => {
  it('sem texto: só atalhos gerais', () => {
    const r = searchPalette('', data);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.group === 'Ações rápidas')).toBe(true);
    expect(r.some((x) => x.action.type === 'new_feedback')).toBe(true);
  });

  it('acha pessoa sem acento e ignora inativos', () => {
    const r = searchPalette('joao', data);
    expect(r.filter((x) => x.group === 'Pessoas').map((x) => x.title)).toEqual(['João Pereira']);
    const ana = searchPalette('ana', data).filter((x) => x.group === 'Pessoas').map((x) => x.title);
    expect(ana).toEqual(['Ana Silva']);
  });

  it('feedback por eixo e meta por título, com o dono no subtítulo', () => {
    const byAxis = searchPalette('comunic', data).find((x) => x.group === 'Feedbacks e metas');
    expect(byAxis?.title).toMatch(/Comunicação/);
    expect(byAxis?.action).toEqual({ type: 'tab', tab: 'feedbacks', technicianId: 'a' });
    const byGoal = searchPalette('sla', data).find((x) => x.title.includes('Melhoria de SLA'));
    expect(byGoal?.subtitle).toMatch(/Ana Silva/);
    expect(byGoal?.action).toEqual({ type: 'tab', tab: 'pdis', technicianId: 'a' });
  });

  it('ações rápidas apontam para a primeira pessoa encontrada', () => {
    const acts = searchPalette('ana', data).filter((x) => x.group === 'Ações rápidas');
    expect(acts.map((a) => a.title)).toEqual(['Escrever feedback para Ana Silva', 'Lançar pontuação de Home Office para Ana Silva']);
    expect(acts[0].action).toEqual({ type: 'new_feedback', technicianId: 'a' });
    expect(acts[1].action).toEqual({ type: 'tab', tab: 'homeoffice', technicianId: 'a' });
  });

  it('ordem dos grupos e limites', () => {
    const many = Array.from({ length: 12 }, (_, i) => tech(`t${i}`, `Pessoa ${i}`));
    const r = searchPalette('pessoa', { technicians: many, feedbacks: [] });
    expect(r.filter((x) => x.group === 'Pessoas')).toHaveLength(5);
    const order = r.map((x) => x.group);
    expect(order.indexOf('Pessoas')).toBeLessThan(order.indexOf('Ações rápidas'));
  });

  it('nada encontrado → lista vazia', () => expect(searchPalette('zzzz', data)).toEqual([]));
});
