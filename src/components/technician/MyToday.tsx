import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, CheckCircle2, FileText, Home, Milestone, PenLine, Target } from 'lucide-react';
import type { Feedback, HomeOfficeWeek, SelfAssessment, User } from '../../types';
import { buildCollaboratorActions, type ActionItem, type CollaboratorActionKind } from '../../services/actionCenter';
import { homeOfficeService } from '../../services/homeOfficeService';
import { userService } from '../../services/userService';
import { useDataEffect } from '../../hooks/useDataEffect';
import ScoreRing from '../shared/ScoreRing';
import { Skeleton } from '../shared/Skeleton';

export type TechnicianTab = 'today' | 'feedbacks' | 'pdi' | 'radar' | 'badges' | 'timeline' | 'home-office';

interface MyTodayProps {
  userProfile: User;
  feedbacks: Feedback[];
  onGo: (tab: TechnicianTab) => void;
  onOpenAssessment: () => void;
}

const KIND: Record<CollaboratorActionKind, { icon: typeof Home; tone: string; cta: string }> = {
  home_office_ack: { icon: Home, tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', cta: 'Ver ocorrências e assinar' },
  feedback_unread: { icon: FileText, tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', cta: 'Ler feedback' },
  pdi_due: { icon: Target, tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', cta: 'Ver meta' },
  self_assessment: { icon: PenLine, tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', cta: 'Fazer agora' },
};

/** "Hoje": o que está pendente para o colaborador, começando pela mais importante. */
export default function MyToday({ userProfile, feedbacks, onGo, onOpenAssessment }: MyTodayProps) {
  const now = useMemo(() => new Date(), []);
  const [data, setData] = useState<{ weeks: HomeOfficeWeek[]; assessments: SelfAssessment[] } | null>(null);

  useDataEffect(
    async () => {
      const [weeks, assessments] = await Promise.all([
        homeOfficeService.listMyWeeks(userProfile.uid), userService.getSelfAssessments(userProfile.uid),
      ]);
      return { weeks, assessments };
    },
    setData,
    // Se falhar, mostramos só o que já temos (feedbacks e metas) em vez de uma tela de erro.
    () => setData({ weeks: [], assessments: [] }),
    [userProfile.uid]
  );

  const goals = useMemo(() => userProfile.structuredPDI ?? [], [userProfile.structuredPDI]);
  const actions = useMemo(
    () => data && buildCollaboratorActions({ now, weeks: data.weeks, assessments: data.assessments, feedbacks, goals }),
    [data, now, feedbacks, goals]
  );

  const run = (item: ActionItem<CollaboratorActionKind>) => {
    if (item.kind === 'home_office_ack') onGo('home-office');
    else if (item.kind === 'feedback_unread') onGo('feedbacks');
    else if (item.kind === 'pdi_due') onGo('pdi');
    else onOpenAssessment();
  };

  if (!actions) return <div className="space-y-4"><Skeleton variant="card" /><Skeleton variant="row" /><Skeleton variant="row" /></div>;

  const [first, ...rest] = actions;
  const firstWeek = first?.kind === 'home_office_ack' ? data?.weeks.find((w) => `home_office_ack:${w.id}` === first.id) : undefined;
  const done = goals.filter((g) => g.status === 'completed').length;

  return (
    <div className="space-y-6">
      {actions.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023] px-6 py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-[#0bbb81]" />
          <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Tudo em dia</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nada pendente para você agora. Bom trabalho!</p>
        </section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-labelledby="primeira"
          className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50 dark:from-[#1c2127] dark:to-[#16191d] p-5 sm:p-6"
        >
          <p className="mb-3.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            {first.kind === 'home_office_ack' ? 'Precisa da sua ciência' : 'Comece por aqui'}
          </p>
          <div className="flex items-center gap-4 sm:gap-5">
            {firstWeek ? (
              <ScoreRing score={firstWeek.score} threshold={firstWeek.threshold} size={92} label />
            ) : (
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${KIND[first.kind].tone}`}>
                {(() => { const Icon = KIND[first.kind].icon; return <Icon className="h-7 w-7" />; })()}
              </span>
            )}
            <div className="min-w-0">
              <h2 id="primeira" className="text-lg font-extrabold leading-snug text-zinc-900 dark:text-white">{first.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{first.detail}</p>
            </div>
          </div>
          <button
            type="button" onClick={() => run(first)}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0bbb81] text-[15px] font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-[#0aa874] active:scale-[0.99] cursor-pointer"
          >
            {KIND[first.kind].cta} <ArrowRight className="h-[18px] w-[18px]" />
          </button>
        </motion.section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="tambem" className="space-y-2.5">
          <h2 id="tambem" className="text-xs font-extrabold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">Também hoje</h2>
          {rest.map((item) => {
            const { icon: Icon, tone } = KIND[item.kind];
            return (
              <button
                key={item.id} type="button" onClick={() => run(item)}
                className="flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d] px-3.5 py-3 text-left transition hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
              >
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.title}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span>
                </span>
                <ArrowRight className="h-[18px] w-[18px] shrink-0 text-zinc-400" />
              </button>
            );
          })}
        </section>
      )}

      {goals.length > 0 && (
        <section aria-labelledby="pdi-resumo" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d] p-4">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 id="pdi-resumo" className="text-sm font-extrabold text-zinc-900 dark:text-white">Meu plano (PDI)</h2>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{done} de {goals.length} {done === 1 ? 'concluída' : 'concluídas'}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-2 rounded-full bg-[#0bbb81]" style={{ width: `${(done / goals.length) * 100}%` }} /></div>
        </section>
      )}

      <section aria-labelledby="explorar" className="space-y-2.5">
        <h2 id="explorar" className="text-xs font-extrabold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">Explorar</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { tab: 'radar' as const, label: 'Radar de competências', icon: BarChart3 },
            { tab: 'timeline' as const, label: 'Minha jornada', icon: Milestone },
          ].map(({ tab, label, icon: Icon }) => (
            <button key={tab} type="button" onClick={() => onGo(tab)} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#16191d] px-3.5 py-3 text-left text-sm font-bold text-zinc-800 dark:text-zinc-100 transition hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer">
              <Icon className="h-5 w-5 shrink-0 text-[#0bbb81]" /> {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
