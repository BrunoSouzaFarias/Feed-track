import type { User, Feedback, SelfAssessment } from '../types';
import { calculateSupervisorScores } from './radarUtils';
import { parseDate } from './dateUtils';

export interface AIInsight {
  id: string;
  technicianId: string;
  technicianName: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  action: string;
  category: 'training' | 'promotion' | 'one_to_one' | 'calibration';
}

export const aiInsightsService = {
  generateInsights(
    technicians: User[],
    feedbacks: Feedback[],
    assessments: SelfAssessment[]
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    technicians.forEach(tech => {
      const techFeedbacks = feedbacks.filter(f => f.technicianId === tech.uid);
      const techAssessments = assessments.filter(a => a.technicianId === tech.uid);
      
      // Get the latest self-assessment
      const latestAssessment = techAssessments.reduce((latest, curr) => {
        if (!latest) return curr;
        const dateL = parseDate(latest.createdAt);
        const dateC = parseDate(curr.createdAt);
        return dateC > dateL ? curr : latest;
      }, null as SelfAssessment | null);

      const supScores = calculateSupervisorScores(techFeedbacks);

      // 1. Inactivity Alert (no feedback in over 20 days)
      if (techFeedbacks.length > 0) {
        const newestFbDate = techFeedbacks.reduce((newest, current) => {
          const date = parseDate(current.createdAt);
          return date > newest ? date : newest;
        }, new Date(0));

        const diffTime = Math.abs(Date.now() - newestFbDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 20) {
          insights.push({
            id: `inactive-fb-${tech.uid}`,
            technicianId: tech.uid,
            technicianName: tech.name,
            type: 'warning',
            title: 'Ausência de Feedbacks Recentes',
            message: `${tech.name} não recebe um feedback há mais de ${diffDays} dias. Há risco de desalinhamento de expectativas.`,
            action: 'Agende uma conversa 1:1 e registre um novo feedback de desenvolvimento ou reconhecimento.',
            category: 'one_to_one'
          });
        }
      } else {
        insights.push({
          id: `no-fb-${tech.uid}`,
          technicianId: tech.uid,
          technicianName: tech.name,
          type: 'alert',
          title: 'Primeiro Alinhamento Pendente',
          message: `${tech.name} não possui feedbacks registrados no sistema.`,
          action: 'Agende uma conversa 1:1 inicial para definir as primeiras metas da competência.',
          category: 'one_to_one'
        });
      }

      // 2. Skill evaluation & gaps analysis if latest self-assessment is present
      if (latestAssessment) {
        const selfScores = latestAssessment.scores;

        const competencies: { key: keyof typeof selfScores; label: string }[] = [
          { key: 'communication', label: 'Comunicação' },
          { key: 'teamwork', label: 'Trabalho em Equipe' },
          { key: 'technical', label: 'Conhecimento Técnico' },
          { key: 'proactivity', label: 'Proatividade' },
          { key: 'attendance', label: 'Comprometimento' }
        ];

        let highPerformanceCount = 0;

        competencies.forEach(comp => {
          const selfVal = selfScores[comp.key] || 0;
          const supVal = supScores[comp.key] || 0;
          const gap = selfVal - supVal;

          if (supVal >= 4.5) {
            highPerformanceCount++;
          }

          // Technical training suggestion if supervisor score is low (< 2.5)
          if (supVal < 2.5) {
            insights.push({
              id: `training-${tech.uid}-${comp.key}`,
              technicianId: tech.uid,
              technicianName: tech.name,
              type: 'alert',
              title: `Necessidade de Treinamento: ${comp.label}`,
              message: `A pontuação avaliada pelo supervisor na competência de ${comp.label} está criticamente baixa (${supVal}/5.0).`,
              action: `Adicione uma meta no PDI focada em ${comp.label} (ex: Cursos técnicos, shadowing com colegas seniores).`,
              category: 'training'
            });
          }

          // Perception Gaps (Self-assessment vs Supervisor evaluation)
          if (gap >= 1.5) {
            insights.push({
              id: `gap-high-${tech.uid}-${comp.key}`,
              technicianId: tech.uid,
              technicianName: tech.name,
              type: 'warning',
              title: `Desalinhamento Crítico: ${comp.label}`,
              message: `O colaborador se avaliou em ${selfVal}/5.0, enquanto a pontuação por feedbacks é de ${supVal}/5.0 (Gap de +${gap.toFixed(1)}).`,
              action: `Realize um alinhamento fino em 1:1, revisitando os exemplos práticos em que o técnico precisa evoluir em ${comp.label}.`,
              category: 'calibration'
            });
          } else if (gap <= -1.0) {
            insights.push({
              id: `gap-low-${tech.uid}-${comp.key}`,
              technicianId: tech.uid,
              technicianName: tech.name,
              type: 'info',
              title: `Subestimação de Competência: ${comp.label}`,
              message: `${tech.name} se avaliou com ${selfVal}/5.0 em ${comp.label}, mas suas avaliações do supervisor mostram excelente desempenho com ${supVal}/5.0 (Gap de ${gap.toFixed(1)}).`,
              action: `Dê visibilidade a esta discrepância positiva na próxima 1:1, fortalecendo a confiança do colaborador com exemplos práticos de sucesso.`,
              category: 'one_to_one'
            });
          }
        });

        // 3. Promotion Recommendation (Consistent High Performer)
        if (highPerformanceCount >= 4) {
          insights.push({
            id: `promo-${tech.uid}`,
            technicianId: tech.uid,
            technicianName: tech.name,
            type: 'success',
            title: 'Candidato Forte à Promoção',
            message: `${tech.name} demonstra excelência consistente em ${highPerformanceCount} das 5 competências essenciais, com médias do supervisor superiores a 4.5.`,
            action: 'Avalie a viabilidade de promoção de cargo, transição para mentoria de novatos ou atribuição de novos desafios de liderança.',
            category: 'promotion'
          });
        }
      }
    });

    return insights;
  }
};
