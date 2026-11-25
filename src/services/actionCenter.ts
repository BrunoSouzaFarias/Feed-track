import type { Feedback, HomeOfficeWeek, PDIGoal, SelfAssessment, User } from '../types';
import { formatDate, parseDate, parseLocalDate, tryParseDate } from './dateUtils';
import { START_SCORE, weekIdOf, weekRangeLabel } from './homeOfficeLogic';

/**
 * "O que precisa de mim hoje": regras PURAS que transformam os dados do sistema em uma lista
 * priorizada de ações (supervisor) e de pendências (colaborador).
 * Prioridade: 0 = fazer agora · 1 = urgente · 2 = em breve · 3 = quando puder.
 */
export interface ActionItem<K extends string> {
  id: string;
  kind: K;
  priority: 0 | 1 | 2 | 3;
  title: string;
  detail: string;
  technicianId?: string;
}

export type SupervisorActionKind = 'home_office_close' | 'no_feedback' | 'unsigned_feedback' | 'pdi_due' | 'self_assessment';
export type CollaboratorActionKind = 'home_office_ack' | 'feedback_unread' | 'pdi_due' | 'self_assessment';

const MAX_ACTIONS = 12;
const NO_FEEDBACK_DAYS = 20;
const UNSIGNED_AFTER_DAYS = 2;
const PDI_WARN_DAYS = 7;

/** Trimestre no formato usado pelas autoavaliações, ex.: "2026-Q4". */
export function currentPeriod(now: Date): string {
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

/** Dias inteiros desde `date` até `now` (o relógio vem do parâmetro, nunca de Date.now()). */
const daysAgo = (date: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
const shortDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Dias inteiros entre hoje (meia-noite local) e o prazo 'YYYY-MM-DD'; negativo = atrasada. */
function daysUntil(deadline: string, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseLocalDate(deadline).getTime() - today.getTime()) / 86_400_000);
}

function pdiDue(goal: PDIGoal, now: Date): { priority: 1 | 2; title: string } | null {
  if (goal.status === 'completed') return null;
  const left = daysUntil(goal.deadline, now);
  if (left > PDI_WARN_DAYS) return null;
  if (left < 0) return { priority: 1, title: `Meta "${goal.title}" atrasada há ${-left} ${plural(-left, 'dia', 'dias')}` };
  const when = left === 0 ? 'vence hoje' : left === 1 ? 'vence amanhã' : `vence em ${left} dias`;
  return { priority: 2, title: `Meta "${goal.title}" ${when}` };
}

export interface SupervisorActionInput {
  now: Date;
  technicians: User[];
  feedbacks: Feedback[];
  assessments: SelfAssessment[];
  /** Semanas JÁ FECHADAS (qualquer semana; filtramos pela atual). */
  weeks: HomeOfficeWeek[];
  threshold: number;
  /** Pontos descontados por pessoa na semana atual (soma dos lançamentos ativos). */
  pointsByTech: Record<string, number>;
}

export function buildSupervisorActions(input: SupervisorActionInput): ActionItem<SupervisorActionKind>[] {
  const { now, feedbacks, assessments, weeks, threshold, pointsByTech } = input;
  const technicians = input.technicians.filter((t) => t.active);
  const items: ActionItem<SupervisorActionKind>[] = [];

  // 1) Fechar a semana do Home Office — de sexta em diante.
  const weekId = weekIdOf(now);
  if ([5, 6, 0].includes(now.getDay())) {
    const open = technicians.filter((t) => !weeks.some((w) => w.technicianId === t.uid && w.weekId === weekId));
    if (open.length > 0) {
      const below = open.filter((t) => START_SCORE - (pointsByTech[t.uid] ?? 0) < threshold).length;
      const untouched = open.filter((t) => !pointsByTech[t.uid]).length;
      items.push({
        id: `home_office_close:${weekId}`, kind: 'home_office_close', priority: 0,
        title: 'Fechar a semana do Home Office',
        detail: `${below} abaixo do corte · ${untouched} sem ocorrências · semana ${weekRangeLabel(weekId)}`,
      });
    }
  }

  for (const t of technicians) {
    // 2) Sem feedback há muito tempo (ou nunca recebeu).
    const own = feedbacks.filter((f) => f.technicianId === t.uid);
    const activeGoals = (t.structuredPDI ?? []).filter((g) => g.status !== 'completed').length;
    const goalNote = activeGoals > 0 ? `Tem ${activeGoals} ${plural(activeGoals, 'meta de PDI ativa', 'metas de PDI ativas')}` : 'Sem metas de PDI ativas';
    if (own.length === 0) {
      items.push({ id: `no_feedback:${t.uid}`, kind: 'no_feedback', priority: 1, technicianId: t.uid,
        title: `${t.name} ainda não recebeu feedback`, detail: `${goalNote} · agende uma conversa inicial` });
    } else {
      const last = own.reduce((max, f) => (parseDate(f.createdAt) > max ? parseDate(f.createdAt) : max), new Date(0));
      const days = daysAgo(last, now);
      if (days > NO_FEEDBACK_DAYS) {
        items.push({ id: `no_feedback:${t.uid}`, kind: 'no_feedback', priority: 1, technicianId: t.uid,
          title: `${t.name} está há ${days} dias sem feedback`, detail: `${goalNote} · último em ${shortDate(last)}` });
      }
    }

    // 3) Feedback enviado e ainda não assinado.
    for (const f of own) {
      if (f.status !== 'pending') continue;
      const created = parseDate(f.createdAt);
      const days = daysAgo(created, now);
      if (days >= UNSIGNED_AFTER_DAYS) {
        items.push({ id: `unsigned_feedback:${f.id}`, kind: 'unsigned_feedback', priority: 2, technicianId: t.uid,
          title: `${t.name} ainda não assinou o feedback de ${shortDate(created)}`, detail: `${f.axis} · enviado há ${days} dias` });
      }
    }

    // 4) Metas do PDI vencendo ou atrasadas.
    for (const g of t.structuredPDI ?? []) {
      const due = pdiDue(g, now);
      if (due) {
        items.push({ id: `pdi_due:${t.uid}:${g.id}`, kind: 'pdi_due', priority: due.priority, technicianId: t.uid,
          title: due.title, detail: `${t.name} · ${g.status === 'in_progress' ? 'em andamento' : 'pendente'}` });
      }
    }

    // 5) Autoavaliação do trimestre.
    const period = currentPeriod(now);
    if (!assessments.some((a) => a.technicianId === t.uid && a.period === period)) {
      items.push({ id: `self_assessment:${t.uid}`, kind: 'self_assessment', priority: 3, technicianId: t.uid,
        title: `${t.name} não fez a autoavaliação do trimestre`, detail: `${period} · em aberto` });
    }
  }

  // Ordena por urgência (a ordem de chegada desempata) e limita.
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.priority - b.item.priority || a.index - b.index)
    .map(({ item }) => item)
    .slice(0, MAX_ACTIONS);
}

export interface CollaboratorActionInput {
  now: Date;
  /** Semanas FECHADAS do próprio colaborador. */
  weeks: HomeOfficeWeek[];
  assessments: SelfAssessment[];
  feedbacks: Feedback[];
  goals: PDIGoal[];
}

export function buildCollaboratorActions(input: CollaboratorActionInput): ActionItem<CollaboratorActionKind>[] {
  const { now, weeks, assessments, feedbacks, goals } = input;
  const items: ActionItem<CollaboratorActionKind>[] = [];

  for (const w of weeks) {
    if (tryParseDate(w.ackAt)) continue;
    items.push({
      id: `home_office_ack:${w.id}`, kind: 'home_office_ack', priority: 0,
      title: `Semana de ${weekRangeLabel(w.weekId)} fechada`,
      detail: w.eligible ? 'Home office garantido · assine a ciência' : `Não atingiu o corte de ${w.threshold} pontos · veja as ocorrências e assine`,
    });
  }

  for (const f of feedbacks) {
    if (f.status !== 'pending') continue;
    items.push({ id: `feedback_unread:${f.id}`, kind: 'feedback_unread', priority: 1, title: 'Novo feedback para ler',
      detail: `${f.axis} · de ${formatDate(f.createdAt, { day: '2-digit', month: '2-digit' })}` });
  }

  for (const g of goals) {
    const due = pdiDue(g, now);
    if (due) items.push({ id: `pdi_due:${g.id}`, kind: 'pdi_due', priority: 2, title: due.title, detail: 'Meta do seu PDI' });
  }

  const period = currentPeriod(now);
  if (!assessments.some((a) => a.period === period)) {
    items.push({ id: `self_assessment:${period}`, kind: 'self_assessment', priority: 3, title: 'Autoavaliação do trimestre', detail: `${period} · leva poucos minutos` });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
