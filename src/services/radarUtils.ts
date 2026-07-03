import type { Feedback } from '../types';

export interface RadarScores {
  communication: number;
  teamwork: number;
  technical: number;
  proactivity: number;
  attendance: number;
}

/**
 * Calculates the supervisor evaluation scores (1-5) based on positive and development feedbacks.
 * - Starts at baseline of 3.0.
 * - Positive feedbacks in the category add 0.5.
 * - Development feedbacks in the category subtract 0.5.
 * - Clamped between 1.0 and 5.0.
 */
export function calculateSupervisorScores(feedbacks: Feedback[]): RadarScores {
  const scores = {
    communication: 3.0,
    teamwork: 3.0,
    technical: 3.0,
    proactivity: 3.0,
    attendance: 3.0,
  };

  feedbacks.forEach(fb => {
    const isPositive = fb.type === 'positive';
    const val = isPositive ? 0.5 : -0.5;
    const axis = fb.axis;

    if (axis === 'Comunicação' || axis === 'Relacionamento com o cliente' || axis === 'Qualidade no atendimento') {
      scores.communication += val;
    } else if (axis === 'Trabalho em equipe') {
      scores.teamwork += val;
    } else if (axis === 'Conhecimento técnico' || axis === 'Resolução de problemas' || axis === 'Uso de sistemas') {
      scores.technical += val;
    } else if (axis === 'Proatividade' || axis === 'Gestão do tempo') {
      scores.proactivity += val;
    } else if (axis === 'Comprometimento' || axis === 'Conformidade com processos' || axis === 'Metas e indicadores') {
      scores.attendance += val;
    }
  });

  return {
    communication: Math.min(5, Math.max(1, Math.round(scores.communication * 10) / 10)),
    teamwork: Math.min(5, Math.max(1, Math.round(scores.teamwork * 10) / 10)),
    technical: Math.min(5, Math.max(1, Math.round(scores.technical * 10) / 10)),
    proactivity: Math.min(5, Math.max(1, Math.round(scores.proactivity * 10) / 10)),
    attendance: Math.min(5, Math.max(1, Math.round(scores.attendance * 10) / 10)),
  };
}
