import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { User, Feedback } from '../../types';
import { generateInsights, computeTeamHealth } from '../../services/executiveInsights';
import { parseDate } from '../../services/dateUtils';

interface ExecutiveInsightsProps {
  technicians: User[];
  feedbacks: Feedback[];
}

const PRIORITY_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  critical: {
    bg: 'bg-rose-50/60 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-900/50',
    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
    text: 'text-rose-700 dark:text-rose-300',
  },
  high: {
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/50',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-300',
  },
  medium: {
    bg: 'bg-sky-50/60 dark:bg-sky-950/20',
    border: 'border-sky-200 dark:border-sky-900/50',
    badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
    text: 'text-sky-700 dark:text-sky-300',
  },
  low: {
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
};

const TYPE_LABELS: Record<string, string> = {
  alert: 'Alerta',
  opportunity: 'Oportunidade',
  recognition: 'Reconhecimento',
  training: 'Capacitação',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

interface HealthBarProps {
  label: string;
  value: number;
  color: string;
  delay: number;
}

function HealthBar({ label, value, color, delay }: HealthBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="text-[11px] font-extrabold text-zinc-800 dark:text-zinc-200">{value}%</span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  );
}

export default function ExecutiveInsights({ technicians, feedbacks }: ExecutiveInsightsProps) {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [activeFilter, setActiveFilter] = useState<'all' | 'alert' | 'opportunity' | 'recognition' | 'training'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(true);

  const filteredFeedbacks = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === 'monthly') {
      cutoff.setDate(now.getDate() - 30);
    } else if (period === 'quarterly') {
      cutoff.setDate(now.getDate() - 90);
    } else if (period === 'yearly') {
      cutoff.setDate(now.getDate() - 365);
    }
    return feedbacks.filter(fb => {
      const d = parseDate(fb.createdAt);
      return d >= cutoff;
    });
  }, [feedbacks, period]);

  const insights = useMemo(() => generateInsights(technicians, filteredFeedbacks), [technicians, filteredFeedbacks]);
  const health = useMemo(() => computeTeamHealth(technicians, filteredFeedbacks), [technicians, filteredFeedbacks]);

  const generatingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startGenerating = () => {
    setIsGenerating(true);
    clearTimeout(generatingTimer.current);
    generatingTimer.current = setTimeout(() => setIsGenerating(false), 800);
  };
  useEffect(() => {
    generatingTimer.current = setTimeout(() => setIsGenerating(false), 800); // animação inicial
    return () => clearTimeout(generatingTimer.current);
  }, []);

  const filtered = useMemo(() => {
    return insights
      .filter(i => !dismissedIds.has(i.id))
      .filter(i => activeFilter === 'all' || i.type === activeFilter);
  }, [insights, dismissedIds, activeFilter]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: 0, alert: 0, opportunity: 0, recognition: 0, training: 0 };
    insights.filter(i => !dismissedIds.has(i.id)).forEach(i => {
      counts.all++;
      counts[i.type]++;
    });
    return counts;
  }, [insights, dismissedIds]);

  const healthColor =
    health.overall >= 75 ? 'text-emerald-600 dark:text-[#4bdfa1]' :
    health.overall >= 50 ? 'text-amber-600 dark:text-amber-400' :
    'text-rose-600 dark:text-rose-400';

  const healthLabel =
    health.overall >= 75 ? 'Excelente' :
    health.overall >= 50 ? 'Atenção' :
    'Crítico';

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-md">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Insights Executivos (regras automáticas)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              Motor Local
            </span>
          </div>

          {/* Period Filter Selector */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            {(['monthly', 'quarterly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); startGenerating(); }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-zinc-700 text-[#006c49] dark:text-[#4bdfa1] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {p === 'monthly' ? 'Este Mês' : p === 'quarterly' ? 'Último Trimestre' : 'Ano Atual'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium ml-9">
          Análise determinística baseada em dados reais da equipe • Atualizado agora
        </p>
      </motion.div>

      {/* Team Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white dark:bg-[#1e2023] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
              Índice de Saúde da Equipe
            </p>
            <div className="flex items-end gap-2">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-12 h-8 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    <span className="text-[11px] text-zinc-400">Calculando...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-end gap-2"
                  >
                    <span className={`text-4xl font-black leading-none ${healthColor}`}>
                      {health.overall}
                    </span>
                    <span className="text-lg font-bold text-zinc-400 mb-0.5">/100</span>
                    <span className={`text-xs font-bold mb-1 ${healthColor}`}>{healthLabel}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Radial Gauge */}
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-100 dark:text-zinc-800" />
              <motion.circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - health.overall / 100) }}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={healthColor}
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-[11px] font-black ${healthColor}`}>
              {health.overall}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <HealthBar label="Velocidade de Feedback" value={health.feedbackVelocity} color="bg-violet-500" delay={0.2} />
          <HealthBar label="Conclusão de PDIs" value={health.pdiCompletionRate} color="bg-emerald-500" delay={0.3} />
          <HealthBar label="Razão Positivo/Dev" value={health.positiveRatio} color="bg-sky-500" delay={0.4} />
          <HealthBar label="Engajamento Geral" value={health.engagementScore} color="bg-amber-500" delay={0.5} />
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 flex-wrap"
      >
        {(['all', 'alert', 'opportunity', 'recognition', 'training'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
              activeFilter === type
                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                : 'bg-white dark:bg-[#1e2023] text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
            }`}
          >
            {type === 'all' ? 'Todos' :
             type === 'alert' ? '⚠️ Alertas' :
             type === 'opportunity' ? '💡 Oportunidades' :
             type === 'recognition' ? '🌟 Reconhecimentos' :
             '📚 Capacitação'}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeFilter === type ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}>
              {countByType[type]}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Insights List */}
      <AnimatePresence mode="popLayout">
        {isGenerating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-violet-200 dark:border-violet-900" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-violet-600 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              />
            </div>
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
              Analisando dados da equipe...
            </p>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <span className="text-4xl">✅</span>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
              Nenhum insight nesta categoria
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-xs">
              Sua equipe está performando bem neste eixo. Continue monitorando!
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((insight, index) => {
              const colors = PRIORITY_COLORS[insight.priority];
              return (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.95 }}
                  transition={{
                    layout: { duration: 0.3 },
                    default: { duration: 0.4, delay: index * 0.05 }
                  }}
                  className={`relative rounded-xl border p-4 ${colors.bg} ${colors.border} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  {/* Priority accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                    insight.priority === 'critical' ? 'bg-rose-500' :
                    insight.priority === 'high' ? 'bg-amber-500' :
                    insight.priority === 'medium' ? 'bg-sky-500' :
                    'bg-emerald-500'
                  }`} />

                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg shrink-0">{insight.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-zinc-900 dark:text-white leading-tight truncate">
                            {insight.title}
                          </p>
                          {insight.technicianName && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                              👤 {insight.technicianName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                          {TYPE_LABELS[insight.type]}
                        </span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {PRIORITY_LABELS[insight.priority]}
                        </span>
                        <button
                          onClick={() => setDismissedIds(prev => new Set([...prev, insight.id]))}
                          className="w-5 h-5 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-900/10 transition-colors cursor-pointer text-xs"
                          aria-label="Dispensar insight"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                      {insight.description}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      {insight.metric && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Métrica
                          </span>
                          <span className={`text-[10px] font-extrabold ${colors.text}`}>
                            {insight.metric}
                          </span>
                        </div>
                      )}
                      {insight.action && (
                        <div className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${colors.badge} ${colors.border} cursor-default`}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                          {insight.action}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 font-medium"
      >
        Sugestões geradas por regras automáticas, processadas no dispositivo (sem envio externo). Apoio à decisão: não substituem a avaliação do gestor.
      </motion.p>
    </div>
  );
}
