import type { Feedback, User } from '../types';

/** Busca rápida (Ctrl+K): regras puras de busca e de "ações rápidas". */
export type PaletteTab = 'team' | 'feedbacks' | 'pdis' | 'homeoffice' | 'today';

export type PaletteAction =
  | { type: 'tab'; tab: PaletteTab; technicianId?: string }
  | { type: 'new_feedback'; technicianId?: string };

export interface PaletteResult {
  id: string;
  group: 'Pessoas' | 'Feedbacks e metas' | 'Ações rápidas';
  title: string;
  subtitle: string;
  action: PaletteAction;
}

const MAX_PEOPLE = 5;
const MAX_ITEMS = 4;

/** minúsculas, sem acentos e sem espaços repetidos. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const GENERAL_ACTIONS: PaletteResult[] = [
  { id: 'go:new_feedback', group: 'Ações rápidas', title: 'Novo feedback', subtitle: 'Escolher a pessoa e escrever', action: { type: 'new_feedback' } },
  { id: 'go:homeoffice', group: 'Ações rápidas', title: 'Abrir Home Office da semana', subtitle: 'Lançar ocorrências e fechar a semana', action: { type: 'tab', tab: 'homeoffice' } },
  { id: 'go:team', group: 'Ações rápidas', title: 'Ver a equipe', subtitle: 'Pessoas, cargos e acessos', action: { type: 'tab', tab: 'team' } },
];

export function searchPalette(
  rawQuery: string,
  data: { technicians: User[]; feedbacks: Feedback[] }
): PaletteResult[] {
  const q = normalize(rawQuery);
  if (!q) return GENERAL_ACTIONS;

  const technicians = data.technicians.filter((t) => t.active);
  const matches = (text: string) => normalize(text).includes(q);

  const people = technicians.filter((t) => matches(t.name)).slice(0, MAX_PEOPLE);
  const results: PaletteResult[] = people.map((t) => ({
    id: `person:${t.uid}`, group: 'Pessoas', title: t.name,
    subtitle: `${t.position} · ${t.team === 'teleservice' ? 'Teleatendimento' : 'Back-office'}`,
    action: { type: 'tab', tab: 'team', technicianId: t.uid },
  }));

  const activeIds = new Set(technicians.map((t) => t.uid));
  const items: PaletteResult[] = [];
  for (const f of data.feedbacks) {
    if (activeIds.has(f.technicianId) && (matches(f.axis) || matches(f.technicianName))) {
      items.push({
        id: `feedback:${f.id}`, group: 'Feedbacks e metas', title: `Feedback · ${f.axis}`,
        subtitle: `${f.technicianName} · ${f.status === 'pending' ? 'aguardando assinatura' : 'assinado/lido'}`,
        action: { type: 'tab', tab: 'feedbacks', technicianId: f.technicianId },
      });
    }
  }
  for (const t of technicians) {
    for (const g of t.structuredPDI ?? []) {
      if (matches(g.title)) {
        items.push({
          id: `goal:${t.uid}:${g.id}`, group: 'Feedbacks e metas', title: `Meta · ${g.title}`,
          subtitle: `${t.name} · ${g.status === 'completed' ? 'concluída' : 'em andamento'}`,
          action: { type: 'tab', tab: 'pdis', technicianId: t.uid },
        });
      }
    }
  }
  results.push(...items.slice(0, MAX_ITEMS));

  const first = people[0];
  if (first) {
    results.push(
      { id: `act:feedback:${first.uid}`, group: 'Ações rápidas', title: `Escrever feedback para ${first.name}`, subtitle: 'Abre o formulário já com a pessoa escolhida', action: { type: 'new_feedback', technicianId: first.uid } },
      { id: `act:homeoffice:${first.uid}`, group: 'Ações rápidas', title: `Lançar pontuação de Home Office para ${first.name}`, subtitle: 'Abre o Home Office já nessa pessoa', action: { type: 'tab', tab: 'homeoffice', technicianId: first.uid } },
    );
  }
  return results;
}
