import type { User, Feedback } from '../types';
import { parseDate, parseLocalDate } from './dateUtils';

export interface InsightCard {
  id: string;
  type: 'alert' | 'opportunity' | 'recognition' | 'training';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  technicianName?: string;
  technicianId?: string;
  metric?: string;
  action?: string;
  icon: string;
}

export interface TeamHealth {
  overall: number;
  feedbackVelocity: number;
  pdiCompletionRate: number;
  positiveRatio: number;
  engagementScore: number;
}

// Local AI Engine — pure deterministic rules + weighted scoring
export function generateInsights(technicians: User[], feedbacks: Feedback[]): InsightCard[] {
  const insights: InsightCard[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (technicians.length === 0) return [];

  // --- RULE 1: Technicians with zero feedback in 30 days ---
  technicians.forEach(tech => {
    const recentFbs = feedbacks.filter(fb => {
      const d = parseDate(fb.createdAt);
      return fb.technicianId === tech.uid && d > thirtyDaysAgo;
    });
    if (recentFbs.length === 0) {
      insights.push({
        id: `no-fb-${tech.uid}`,
        type: 'alert',
        priority: 'high',
        title: 'Colaborador sem feedback recente',
        description: `${tech.name} não recebeu nenhum feedback nos últimos 30 dias. Conversas 1:1 regulares aumentam o engajamento em até 47%.`,
        technicianName: tech.name,
        technicianId: tech.uid,
        metric: '0 feedbacks / 30d',
        action: 'Agendar 1:1 esta semana',
        icon: '⚠️',
      });
    }
  });

  // --- RULE 2: Technicians with all development (no positive) feedbacks in last 30 days ---
  technicians.forEach(tech => {
    const recent = feedbacks.filter(fb => {
      const d = parseDate(fb.createdAt);
      return fb.technicianId === tech.uid && d > thirtyDaysAgo;
    });
    if (recent.length >= 2 && recent.every(fb => fb.type === 'development')) {
      insights.push({
        id: `only-dev-${tech.uid}`,
        type: 'training',
        priority: 'medium',
        title: 'Equilíbrio feedback positivo/desenvolvimento',
        description: `${tech.name} recebeu apenas feedbacks de desenvolvimento. A proporção ideal é 3:1 (positivo:desenvolvimento) para manter motivação e crescimento.`,
        technicianName: tech.name,
        technicianId: tech.uid,
        metric: `${recent.length} feedbacks de desenvolvimento`,
        action: 'Registrar reconhecimento positivo',
        icon: '🔄',
      });
    }
  });

  // --- RULE 3: PDI goals overdue ---
  technicians.forEach(tech => {
    const overdue = (tech.structuredPDI || []).filter(goal => {
      if (goal.status === 'completed') return false;
      const deadline = parseLocalDate(goal.deadline);
      return deadline < now;
    });
    if (overdue.length > 0) {
      insights.push({
        id: `overdue-pdi-${tech.uid}`,
        type: 'alert',
        priority: 'critical',
        title: 'Metas PDI vencidas',
        description: `${tech.name} possui ${overdue.length} meta${overdue.length > 1 ? 's' : ''} de desenvolvimento vencida${overdue.length > 1 ? 's' : ''}. Revisar e replanejar com o colaborador é essencial para manutenção do comprometimento.`,
        technicianName: tech.name,
        technicianId: tech.uid,
        metric: `${overdue.length} meta${overdue.length > 1 ? 's' : ''} atrasada${overdue.length > 1 ? 's' : ''}`,
        action: 'Revisão imediata de PDI',
        icon: '🎯',
      });
    }
  });

  // --- RULE 4: Rising stars (multiple positive feedbacks this week) ---
  technicians.forEach(tech => {
    const weekPositives = feedbacks.filter(fb => {
      const d = parseDate(fb.createdAt);
      return fb.technicianId === tech.uid && fb.type === 'positive' && d > sevenDaysAgo;
    });
    if (weekPositives.length >= 2) {
      insights.push({
        id: `star-${tech.uid}`,
        type: 'recognition',
        priority: 'low',
        title: 'Colaborador em destaque',
        description: `${tech.name} recebeu ${weekPositives.length} feedbacks positivos esta semana! Considere reconhecimento público e possibilidade de mentoria de pares.`,
        technicianName: tech.name,
        technicianId: tech.uid,
        metric: `${weekPositives.length} ⭐ esta semana`,
        action: 'Nomear para reconhecimento',
        icon: '🌟',
      });
    }
  });

  // --- RULE 5: Team-wide training opportunities based on most common development axis ---
  const devFeedbacks = feedbacks.filter(fb => fb.type === 'development');
  const axisCounts: Record<string, number> = {};
  devFeedbacks.forEach(fb => {
    axisCounts[fb.axis] = (axisCounts[fb.axis] || 0) + 1;
  });
  const topAxis = Object.entries(axisCounts).sort((a, b) => b[1] - a[1])[0];
  if (topAxis && topAxis[1] >= 2) {
    insights.push({
      id: 'team-training',
      type: 'opportunity',
      priority: 'medium',
      title: 'Oportunidade de capacitação coletiva',
      description: `O eixo "${topAxis[0]}" concentra ${topAxis[1]} feedbacks de desenvolvimento da equipe. Um programa de treinamento coletivo pode elevar o desempenho geral em até 35%.`,
      metric: `${topAxis[1]}x "${topAxis[0]}"`,
      action: 'Planejar workshop coletivo',
      icon: '📚',
    });
  }

  // --- RULE 6: Positive trend — team with all technicians having positive feedbacks this month ---
  const techsWithPositive = new Set(
    feedbacks
      .filter(fb => {
        const d = parseDate(fb.createdAt);
        return fb.type === 'positive' && d > thirtyDaysAgo;
      })
      .map(fb => fb.technicianId)
  );
  if (technicians.length > 0 && techsWithPositive.size === technicians.length) {
    insights.push({
      id: 'full-team-positive',
      type: 'recognition',
      priority: 'low',
      title: 'Equipe 100% reconhecida',
      description: 'Todos os colaboradores receberam pelo menos um feedback positivo no último mês. Excelente cultura de reconhecimento! Continue assim para manter o índice de retenção acima da média.',
      metric: `${technicians.length}/${technicians.length} reconhecidos`,
      action: 'Registrar conquista no relatório',
      icon: '🏆',
    });
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function computeTeamHealth(technicians: User[], feedbacks: Feedback[]): TeamHealth {
  if (technicians.length === 0) {
    return {
      overall: 100,
      feedbackVelocity: 100,
      pdiCompletionRate: 100,
      positiveRatio: 100,
      engagementScore: 100,
    };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentFbs = feedbacks.filter(fb => parseDate(fb.createdAt) > thirtyDaysAgo);

  // Feedback velocity: feedbacks per technician per month (target: 2)
  const velocity = Math.min(100, (recentFbs.length / (technicians.length * 2)) * 100);

  // PDI completion rate
  let totalGoals = 0, completedGoals = 0;
  technicians.forEach(t => {
    (t.structuredPDI || []).forEach(g => {
      totalGoals++;
      if (g.status === 'completed') completedGoals++;
    });
  });
  const pdiRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 50;

  // Positive ratio
  const posCount = recentFbs.filter(fb => fb.type === 'positive').length;
  const positiveRatio = recentFbs.length > 0 ? (posCount / recentFbs.length) * 100 : 50;

  // Engagement: % of technicians with at least one feedback this month
  const engagedTechs = new Set(recentFbs.map(fb => fb.technicianId)).size;
  const engagement = technicians.length > 0 ? (engagedTechs / technicians.length) * 100 : 0;

  // Overall = weighted average
  const overall = (velocity * 0.3 + pdiRate * 0.25 + positiveRatio * 0.25 + engagement * 0.2);

  return {
    overall: Math.round(overall),
    feedbackVelocity: Math.round(velocity),
    pdiCompletionRate: Math.round(pdiRate),
    positiveRatio: Math.round(positiveRatio),
    engagementScore: Math.round(engagement),
  };
}
