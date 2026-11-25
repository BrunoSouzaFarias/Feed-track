import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Clock, FileText, Home, PenLine, Target } from 'lucide-react';
import type { Feedback, HomeOfficeConfig, HomeOfficePoint, HomeOfficeWeek, SelfAssessment, User } from '../../types';
import { buildSupervisorActions, type ActionItem, type SupervisorActionKind } from '../../services/actionCenter';
import { DEFAULT_HOME_OFFICE_CONFIG, START_SCORE, computeScore, weekIdOf, weekRangeLabel } from '../../services/homeOfficeLogic';
import { homeOfficeService } from '../../services/homeOfficeService';
import { userService } from '../../services/userService';
import { parseDate, parseLocalDate } from '../../services/dateUtils';
import { useDataEffect } from '../../hooks/useDataEffect';
import { Skeleton } from '../shared/Skeleton';
import type { SupervisorTab } from './SupervisorSidebar';

interface ActionCenterProps {
  user: User | null;
  technicians: User[];
  feedbacks: Feedback[];
  isLoading: boolean;
  onGo: (tab: SupervisorTab, technicianId?: string) => void;
  onNewFeedbackFor: (technicianId?: string) => void;
}

interface Extra {
  assessments: SelfAssessment[];
  config: HomeOfficeConfig;
  points: HomeOfficePoint[];
  weeks: HomeOfficeWeek[];
}

const KIND_STYLE: Record<SupervisorActionKind, { icon: typeof Home; tone: string; label: string }> = {
  home_office_close: { icon: Home, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', label: 'Revisar e fechar' },
  no_feedback: { icon: Clock, tone: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', label: 'Escrever feedback' },
  unsigned_feedback: { icon: PenLine, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', label: 'Ver feedbacks' },
  pdi_due: { icon: Target, tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', label: 'Ver meta' },
  self_assessment: { icon: FileText, tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', label: 'Ver equipe' },
};

const greeting = (d: Date) => (d.getHours() < 12 ? 'Bom dia' : d.getHours() < 18 ? 'Boa tarde' : 'Boa noite');

/** Home do supervisor: "o que precisa de mim hoje?" em ordem de urgência. */
export default function ActionCenter({ user, technicians, feedbacks, isLoading, onGo, onNewFeedbackFor }: ActionCenterProps) {
  const now = useMemo(() => new Date(), []);
  const weekId = weekIdOf(now);
  const [extra, setExtra] = useState<Extra | null>(null);

  useDataEffect(
    async () => {
      const [assessments, config, points, weeks] = await Promise.all([
        userService.getSelfAssessments(), homeOfficeService.getConfig(),
        homeOfficeService.listPoints(weekId), homeOfficeService.listWeeks(weekId),
      ]);
      return { assessments, config, points, weeks };
    },
    setExtra,
    // Falha ao buscar dados extras não derruba a home: segue só com o que já temos.
    () => setExtra({ assessments: [], config: DEFAULT_HOME_OFFICE_CONFIG, points: [], weeks: [] }),
    [weekId]
  );

  const active = useMemo(() => technicians.filter((t) => t.active), [technicians]);
  const pointsByTech = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of extra?.points ?? []) if (p.status === 'active') out[p.technicianId] = (out[p.technicianId] ?? 0) + p.points;
    return out;
  }, [extra]);

  const actions = useMemo(() => extra && buildSupervisorActions({
    now, technicians, feedbacks, assessments: extra.assessments, weeks: extra.weeks,
    threshold: extra.config.threshold, pointsByTech,
  }), [extra, now, technicians, feedbacks, pointsByTech]);

  const ready = !isLoading && actions !== null && extra !== null;
  const threshold = extra?.config.threshold ?? DEFAULT_HOME_OFFICE_CONFIG.threshold;

  const monthStats = useMemo(() => {
    const month = feedbacks.filter((f) => { const d = parseDate(f.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const signed = month.filter((f) => f.status === 'read').length;
    const goals = active.flatMap((t) => (t.structuredPDI ?? []).filter((g) => g.status !== 'completed'));
    const onTime = goals.filter((g) => parseLocalDate(g.deadline).getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()).length;
    return { sent: month.length, signedPct: month.length ? Math.round((signed / month.length) * 100) : null, onTime, goals: goals.length };
  }, [feedbacks, active, now]);

  const run = (item: ActionItem<SupervisorActionKind>) => {
    switch (item.kind) {
      case 'home_office_close': return onGo('homeoffice');
      case 'no_feedback': return onNewFeedbackFor(item.technicianId);
      case 'unsigned_feedback': return onGo('feedbacks', item.technicianId);
      case 'pdi_due': return onGo('pdis', item.technicianId);
      case 'self_assessment': return onGo('team', item.technicianId);
    }
  };

  const eyebrow = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const count = actions?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#006c49] dark:text-[#4bdfa1]">{eyebrow}</p>
        <h1 className="mt-1.5 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white dashboard-title">
          {greeting(now)}, {user?.name.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {!ready ? 'Carregando o que precisa de você...'
            : count === 0 ? 'Tudo em dia. Nada precisa de você agora.'
            : `${count} ${count === 1 ? 'coisa precisa' : 'coisas precisam'} de você ${count === 12 ? '(mostrando as 12 mais urgentes)' : 'hoje'}.`}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {/* Precisa de você */}
        <section aria-labelledby="precisa" className="min-w-0 flex-[1.7_1_520px] overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d]">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
            <h2 id="precisa" className="text-base font-extrabold text-zinc-900 dark:text-white">Precisa de você</h2>
            <span className="text-xs font-medium text-zinc-400">ordenado por urgência</span>
          </div>

          {!ready ? (
            <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" />)}</div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <CheckCircle2 className="h-9 w-9 text-[#0bbb81]" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Tudo em dia</p>
              <p className="text-xs text-zinc-400">Sem feedbacks parados, metas vencendo ou semana para fechar.</p>
            </div>
          ) : (
            <ul>
              {actions.map((item, i) => {
                const style = KIND_STYLE[item.kind];
                const Icon = style.icon;
                const urgent = item.priority === 0;
                return (
                  <motion.li
                    key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-zinc-100 dark:border-zinc-800/70 px-6 py-4 last:border-b-0 ${urgent ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : ''}`}
                  >
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tone}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1 basis-56">
                      <span className={`block text-sm leading-snug text-zinc-900 dark:text-zinc-50 ${urgent ? 'font-extrabold' : 'font-bold'}`}>{item.title}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span>
                    </span>
                    <button
                      type="button" onClick={() => run(item)}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition cursor-pointer ${
                        urgent ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
                          : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                    >
                      {style.label} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Coluna direita */}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <section aria-labelledby="ho" className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d] p-6">
            <div className="flex items-baseline justify-between">
              <h2 id="ho" className="text-base font-extrabold text-zinc-900 dark:text-white">Home Office · semana</h2>
              <span className="text-xs font-medium text-zinc-400">{weekRangeLabel(weekId)}</span>
            </div>
            <p className="mb-5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Corte {threshold} · {extra ? extra.weeks.length : '–'} de {active.length} semanas fechadas
            </p>
            {!ready ? <Skeleton variant="card" /> : active.length === 0 ? (
              <p className="text-xs text-zinc-400">Nenhum colaborador ativo.</p>
            ) : (
              <ul className="space-y-3.5">
                {active.slice(0, 6).map((t) => {
                  const closed = extra.weeks.find((w) => w.technicianId === t.uid);
                  const score = closed ? closed.score : computeScore((extra.points).filter((p) => p.technicianId === t.uid));
                  const tone = score >= threshold ? 'bg-[#0bbb81] text-emerald-600 dark:text-emerald-400' : score >= threshold - 15 ? 'bg-amber-400 text-amber-600 dark:text-amber-400' : 'bg-rose-500 text-rose-600 dark:text-rose-400';
                  const [bar, ...text] = tone.split(' ');
                  return (
                    <li key={t.uid}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-100">{t.name}</span>
                        <span className={`font-extrabold tabular-nums ${text.join(' ')}`}>{score}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.min(100, (score / START_SCORE) * 100)}%` }} />
                        <span className="absolute -top-0.5 h-3 w-0.5 bg-zinc-400" style={{ left: `${threshold}%` }} aria-hidden="true" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={() => onGo('homeoffice')} className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#006c49] dark:text-[#4bdfa1] hover:underline cursor-pointer">
              Abrir Home Office <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>

          <section aria-labelledby="ritmo" className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d] p-6">
            <h2 id="ritmo" className="mb-4 text-base font-extrabold text-zinc-900 dark:text-white">Ritmo do mês</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { value: String(monthStats.sent), label: 'feedbacks enviados' },
                { value: monthStats.signedPct === null ? '—' : `${monthStats.signedPct}%`, label: 'já lidos' },
                { value: monthStats.goals ? `${monthStats.onTime}/${monthStats.goals}` : '—', label: 'metas no prazo' },
              ].map((c) => (
                <div key={c.label} className="min-w-[88px] flex-1 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3.5">
                  <div className="text-2xl font-extrabold tabular-nums text-zinc-900 dark:text-white dashboard-title">{c.value}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{c.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
