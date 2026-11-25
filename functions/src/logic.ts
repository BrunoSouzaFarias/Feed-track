/**
 * Regras de negócio PURAS (sem Firebase) — testáveis com vitest na raiz.
 * O servidor é a fonte da verdade para badges e transições de PDI.
 */
export type GoalStatus = 'pending' | 'in_progress' | 'completed';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'badge_first_read', title: 'Primeiro Feedback Lido', description: 'Leste a tua primeira carta de feedback no sistema.', icon: 'BookOpen' },
  { id: 'badge_pdi_started', title: 'PDI Iniciado', description: 'Iniciaste o teu plano de desenvolvimento individual.', icon: 'Star' },
  { id: 'badge_pdi_completed', title: 'PDI Concluído', description: 'Concluíste com sucesso o teu primeiro objetivo PDI.', icon: 'Milestone' },
  { id: 'badge_assessment_done', title: 'Autoavaliação Completa', description: 'Registaste a tua primeira autoavaliação trimestral.', icon: 'MessageSquare' },
  { id: 'badge_30_days', title: '30 Dias Ativos', description: 'Pertences à equipa há mais de 30 dias.', icon: 'Flame' },
];

export interface BadgeFacts {
  hasReadFeedback: boolean;
  goalStatuses: GoalStatus[];
  hasAssessments: boolean;
  createdAtMs: number;
  nowMs: number;
}

/** IDs de badges cujas condições são verdadeiras para os fatos informados. */
export function evaluateBadges(f: BadgeFacts): string[] {
  const earned: string[] = [];
  if (f.hasReadFeedback) earned.push('badge_first_read');
  if (f.goalStatuses.length > 0) earned.push('badge_pdi_started');
  if (f.goalStatuses.includes('completed')) earned.push('badge_pdi_completed');
  if (f.hasAssessments) earned.push('badge_assessment_done');
  if ((f.nowMs - f.createdAtMs) / 86_400_000 >= 30) earned.push('badge_30_days');
  return earned;
}

const ORDER: Record<GoalStatus, number> = { pending: 0, in_progress: 1, completed: 2 };

export function isGoalStatus(v: unknown): v is GoalStatus {
  return v === 'pending' || v === 'in_progress' || v === 'completed';
}

/**
 * Transições permitidas. Técnico: só avança (pending → in_progress → completed).
 * Supervisor: pode também reabrir/retroceder.
 */
export function canTransition(from: GoalStatus, to: GoalStatus, isSupervisor: boolean): boolean {
  if (from === to) return false;
  return isSupervisor || ORDER[to] > ORDER[from];
}

/** Supervisor com escopo (managedTeam) só gerencia a própria equipe; sem escopo gerencia todas. */
export function canManageTeam(managedTeam: string | null | undefined, team: string | null | undefined): boolean {
  return managedTeam == null || managedTeam === team;
}
