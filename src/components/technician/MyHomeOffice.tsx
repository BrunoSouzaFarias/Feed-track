import { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle2, FileHeart, Home, Loader2, PartyPopper, PenLine, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomeOfficePoint, HomeOfficeWeek, User } from '../../types';
import { homeOfficeService } from '../../services/homeOfficeService';
import { ACK_COMMENT_MAX, weekRangeLabel } from '../../services/homeOfficeLogic';
import { friendlyError } from '../../services/errors';
import { formatDate, tryParseDate } from '../../services/dateUtils';
import { useDataEffect } from '../../hooks/useDataEffect';
import EmptyState from '../shared/EmptyState';
import EvidenceLightbox from '../shared/EvidenceLightbox';
import ScoreRing from '../shared/ScoreRing';
import { Skeleton } from '../shared/Skeleton';

interface MyHomeOfficeProps {
  userProfile: User;
}

interface Loaded {
  weeks: HomeOfficeWeek[];
  points: Record<string, HomeOfficePoint[]>; // por weekId
}

export default function MyHomeOffice({ userProfile }: MyHomeOfficeProps) {
  const [loaded, setLoaded] = useState<(Loaded & { key: number }) | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useDataEffect(
    async () => {
      const weeks = await homeOfficeService.listMyWeeks(userProfile.uid);
      const entries = await Promise.all(weeks.map(async (w) => [w.weekId, await homeOfficeService.listPoints(w.weekId, userProfile.uid)] as const));
      return { weeks, points: Object.fromEntries(entries) };
    },
    (r) => setLoaded({ ...r, key: refresh }),
    (err) => { toast.error(friendlyError(err, 'Não foi possível carregar suas avaliações.')); setLoaded({ weeks: [], points: {}, key: refresh }); },
    [userProfile.uid, refresh]
  );

  if (loaded?.key !== refresh) {
    return <div className="space-y-4"><Skeleton variant="card" /><Skeleton variant="card" /></div>;
  }
  if (loaded.weeks.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="Nenhuma avaliação fechada ainda"
        description="Quando seu supervisor fechar a semana, suas pontuações aparecem aqui, com os prints e as observações."
      />
    );
  }

  const current = openWeek ?? loaded.weeks[0].weekId;

  const acknowledge = async (week: HomeOfficeWeek) => {
    setSaving(true);
    try {
      await homeOfficeService.acknowledge(week, comment);
      toast.success('Ciência registrada. Obrigado!');
      setComment('');
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível registrar a ciência.'));
    } finally {
      // Recarrega sempre: a ciência pode ter sido gravada mesmo que o registro de auditoria tenha falhado.
      setRefresh((n) => n + 1);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/15 px-4 py-3.5">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#006c49] dark:text-[#4bdfa1]" />
        <p className="text-xs font-medium leading-relaxed text-zinc-600 dark:text-zinc-300">
          Toda semana você começa com <strong>100 pontos</strong>. Cada ocorrência registrada pelo seu supervisor desconta pontos; aqui você vê o motivo e a evidência de cada uma.
        </p>
      </div>

      {loaded.weeks.map((week, i) => {
        const open = week.weekId === current;
        const points = loaded.points[week.weekId] ?? [];
        const ackDate = tryParseDate(week.ackAt);
        return (
          <motion.section
            key={week.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023]"
          >
            <button
              type="button" onClick={() => setOpenWeek(open ? '' : week.weekId)} aria-expanded={open}
              className="flex w-full items-center gap-4 p-5 text-left cursor-pointer"
            >
              <ScoreRing score={week.score} threshold={week.threshold} size={72} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Semana de {weekRangeLabel(week.weekId)}</p>
                {week.eligible ? (
                  <p className="mt-1 flex items-center gap-1.5 text-base font-extrabold text-emerald-600 dark:text-emerald-400"><PartyPopper className="h-4 w-4" /> Home office garantido</p>
                ) : (
                  <p className="mt-1 text-base font-extrabold text-rose-600 dark:text-rose-400">Não atingiu a nota de corte ({week.threshold})</p>
                )}
                <p className="mt-0.5 text-xs font-medium text-zinc-500">
                  {points.filter((p) => p.status === 'active').length} ocorrência(s) ·{' '}
                  {week.ackAt ? <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400"><CheckCircle2 className="h-3 w-3" /> ciente</span> : <span className="font-bold text-amber-600 dark:text-amber-400">aguardando sua ciência</span>}
                </p>
              </div>
            </button>

            {open && (
              <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 p-5">
                {points.length === 0 ? (
                  <p className="text-sm font-medium text-zinc-500">Nenhuma ocorrência registrada nesta semana. Parabéns!</p>
                ) : (
                  <ol className="space-y-2.5">
                    {points.map((p) => {
                      const cancelled = p.status === 'cancelled';
                      return (
                        <li key={p.id} className="flex items-start gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3.5">
                          <span className={`mt-0.5 inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums ${cancelled ? 'bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'}`}>−{p.points}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold ${cancelled ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-100'}`}>{p.categoryLabel}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-zinc-400">{formatDate(p.occurredOn)}</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{p.note}</p>
                            {cancelled && <p className="mt-1.5 text-[11px] font-semibold text-zinc-500">Cancelado pelo supervisor: {p.cancelReason}</p>}
                            <div className="mt-2.5">
                              {p.hasEvidence ? (
                                <button type="button" onClick={() => setEvidenceId(p.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"><Camera className="h-3.5 w-3.5" /> Ver print</button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400"><FileHeart className="h-3.5 w-3.5" /> Sem anexo</span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                {week.ackAt ? (
                  <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/20 px-4 py-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300"><PenLine className="h-3.5 w-3.5" /> Ciência registrada{ackDate ? ` em ${ackDate.toLocaleDateString('pt-BR')}` : ''}</p>
                    {week.ackComment && <p className="mt-1.5 text-xs italic text-sky-900 dark:text-sky-100">“{week.ackComment}”</p>}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4">
                    <div className="flex items-end justify-between">
                      <label htmlFor={`ack-${week.id}`} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quer deixar uma observação? (opcional)</label>
                      <span className={`text-[10px] font-semibold tabular-nums ${comment.length > ACK_COMMENT_MAX ? 'text-rose-500' : 'text-zinc-400'}`}>{comment.length}/{ACK_COMMENT_MAX}</span>
                    </div>
                    <textarea
                      id={`ack-${week.id}`} rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                      placeholder="Ex.: Vou ficar atento ao status do WhatsApp no almoço."
                      className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-[#0bbb81] focus:ring-2 focus:ring-[#0bbb81]/25"
                    />
                    <button
                      type="button" disabled={saving || comment.length > ACK_COMMENT_MAX} onClick={() => acknowledge(week)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0bbb81] py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-[#0aa874] disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Estou ciente
                    </button>
                    <p className="text-center text-[11px] text-zinc-400">Sua ciência é registrada com assinatura digital e não pode ser desfeita.</p>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        );
      })}

      {evidenceId && <EvidenceLightbox pointId={evidenceId} onClose={() => setEvidenceId(null)} />}
    </div>
  );
}
