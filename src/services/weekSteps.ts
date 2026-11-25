/** Etapas da semana do Home Office (regras puras): lançar → acompanhar → fechar → ciência. */
export interface StepperInput {
  /** Ocorrências ativas lançadas na semana (equipe visível). */
  pointsCount: number;
  total: number;
  closedCount: number;
  ackCount: number;
  isCurrentWeek: boolean;
  /** Sexta em diante (a semana já pode ser fechada). */
  closable: boolean;
}

export type StepState = 'done' | 'current' | 'upcoming';

/** Ritmo da semana em 4 etapas: lançar → acompanhar → fechar → ciência. */
export function stepStates(p: StepperInput): StepState[] {
  const closedAll = p.total > 0 && p.closedCount === p.total;
  const acked = closedAll && p.ackCount === p.closedCount;
  const canClose = p.closable || !p.isCurrentWeek;
  return [
    p.pointsCount > 0 ? 'done' : 'current',
    canClose ? 'done' : 'current',
    closedAll ? 'done' : canClose ? 'current' : 'upcoming',
    acked ? 'done' : p.closedCount > 0 ? 'current' : 'upcoming',
  ];
}
