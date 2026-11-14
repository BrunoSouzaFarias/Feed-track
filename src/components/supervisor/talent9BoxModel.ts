import type { User, SelfAssessment } from '../../types';

export interface ProcessedTech {
  tech: User;
  hasAssessment: boolean;
  pdiCount: number;
  completedPdiCount: number;
  performancePercent: number;
  avgPotential: number;
  assessment?: SelfAssessment;
  box: {
    id: number;
    title: string;
    description: string;
    colorClass: string;
    bgClass: string;
    textColor: string;
    xLabel: 'Baixo' | 'Médio' | 'Alto';
    yLabel: 'Baixo' | 'Médio' | 'Alto';
    xIndex: number; // 0, 1, 2
    yIndex: number; // 0, 1, 2
  };
}

// 9-Box definitions according to HR standards
export const BOXES = [
  // Top row (High Potential)
  {
    id: 3,
    xIndex: 0,
    yIndex: 2,
    xLabel: 'Baixo' as const,
    yLabel: 'Alto' as const,
    title: 'Enigma / Dilema',
    description: 'Alto potencial com baixo desempenho no PDI. Necessita de acompanhamento e motivação.',
    colorClass: 'border-amber-450/40 dark:border-amber-700/40',
    bgClass: 'bg-amber-50/45 dark:bg-amber-950/10 hover:bg-amber-100/50 dark:hover:bg-amber-950/20',
    textColor: 'text-amber-700 dark:text-amber-400'
  },
  {
    id: 6,
    xIndex: 1,
    yIndex: 2,
    xLabel: 'Médio' as const,
    yLabel: 'Alto' as const,
    title: 'Potencial Crescente',
    description: 'Alto potencial e bom desempenho. Forte candidato a liderança ou projetos de maior complexidade.',
    colorClass: 'border-emerald-450/30 dark:border-emerald-700/30',
    bgClass: 'bg-emerald-50/20 dark:bg-emerald-950/5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/15',
    textColor: 'text-emerald-700 dark:text-[#4bdfa1]'
  },
  {
    id: 9,
    xIndex: 2,
    yIndex: 2,
    xLabel: 'Alto' as const,
    yLabel: 'Alto' as const,
    title: 'Estrela / Talento',
    description: 'Alto potencial e alto desempenho. Futuro líder, referência e multiplicador de conhecimento.',
    colorClass: 'border-emerald-500/50 dark:border-emerald-450/50',
    bgClass: 'bg-emerald-55/60 dark:bg-emerald-900/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20 border-2 shadow-[0_0_15px_rgba(11,187,129,0.08)]',
    textColor: 'text-emerald-800 dark:text-[#0bbb81]'
  },
  // Middle row (Medium Potential)
  {
    id: 2,
    xIndex: 0,
    yIndex: 1,
    xLabel: 'Baixo' as const,
    yLabel: 'Médio' as const,
    title: 'Questionável',
    description: 'Médio potencial e baixo desempenho. Precisa de plano de melhoria e alinhamento de expectativas.',
    colorClass: 'border-rose-450/40 dark:border-rose-800/35',
    bgClass: 'bg-rose-50/35 dark:bg-rose-950/10 hover:bg-rose-100/40 dark:hover:bg-rose-950/20',
    textColor: 'text-rose-700 dark:text-rose-400'
  },
  {
    id: 5,
    xIndex: 1,
    yIndex: 1,
    xLabel: 'Médio' as const,
    yLabel: 'Médio' as const,
    title: 'Mantenedor / Core',
    description: 'Médio potencial e médio desempenho. Colaborador sólido que entrega o esperado de forma consistente.',
    colorClass: 'border-zinc-200 dark:border-zinc-800',
    bgClass: 'bg-white/50 dark:bg-[#1c1e22]/50 hover:bg-zinc-100/45 dark:hover:bg-zinc-800/40',
    textColor: 'text-zinc-700 dark:text-zinc-350'
  },
  {
    id: 8,
    xIndex: 2,
    yIndex: 1,
    xLabel: 'Alto' as const,
    yLabel: 'Médio' as const,
    title: 'Forte Desempenho',
    description: 'Médio potencial e alto desempenho. Excelente em execução. Deve continuar sendo estimulado.',
    colorClass: 'border-[#006c49]/30 dark:border-emerald-800/30',
    bgClass: 'bg-[#006c49]/5 dark:bg-[#006c49]/5 hover:bg-[#006c49]/10 dark:hover:bg-[#006c49]/10',
    textColor: 'text-[#006c49] dark:text-[#4bdfa1]'
  },
  // Bottom row (Low Potential)
  {
    id: 1,
    xIndex: 0,
    yIndex: 0,
    xLabel: 'Baixo' as const,
    yLabel: 'Baixo' as const,
    title: 'Risco de Desempenho',
    description: 'Baixo potencial e baixo desempenho. Requer plano imediato de ação corretiva ou reposicionamento.',
    colorClass: 'border-red-500/45 dark:border-red-800/40',
    bgClass: 'bg-red-50/40 dark:bg-red-950/15 hover:bg-red-100/50 dark:hover:bg-red-950/25 border-l-4 border-l-red-500',
    textColor: 'text-red-750 dark:text-red-400'
  },
  {
    id: 4,
    xIndex: 1,
    yIndex: 0,
    xLabel: 'Médio' as const,
    yLabel: 'Baixo' as const,
    title: 'Eficaz / Sólido',
    description: 'Baixo potencial e médio desempenho. Profissional focado em rotinas estáveis e bem desenhadas.',
    colorClass: 'border-zinc-200 dark:border-zinc-800',
    bgClass: 'bg-zinc-100/40 dark:bg-zinc-900/30 hover:bg-zinc-150/45 dark:hover:bg-zinc-900/55',
    textColor: 'text-zinc-650 dark:text-zinc-400'
  },
  {
    id: 7,
    xIndex: 2,
    yIndex: 0,
    xLabel: 'Alto' as const,
    yLabel: 'Baixo' as const,
    title: 'Especialista Técnico',
    description: 'Baixo potencial percebido de liderança corporativa, mas altíssimo desempenho técnico individual.',
    colorClass: 'border-[#006c49]/20 dark:border-zinc-700/30',
    bgClass: 'bg-[#006c49]/2 dark:bg-zinc-900/20 hover:bg-[#006c49]/5 dark:hover:bg-zinc-800/40',
    textColor: 'text-[#006c49] dark:text-[#4bdfa1]'
  }
];
