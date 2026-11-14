import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ban, Camera, FileHeart } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomeOfficePoint } from '../../types';
import { homeOfficeService } from '../../services/homeOfficeService';
import { friendlyError } from '../../services/errors';
import { formatDate } from '../../services/dateUtils';
import EvidenceLightbox from '../shared/EvidenceLightbox';

interface HomeOfficePointListProps {
  points: HomeOfficePoint[];
  /** Semana fechada: sem cancelar. */
  locked: boolean;
  onChanged: () => void;
}

/** Linha do tempo das ocorrências da semana (mais recente primeiro). */
export default function HomeOfficePointList({ points, locked, onChanged }: HomeOfficePointListProps) {
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmCancel = async (point: HomeOfficePoint) => {
    setBusy(true);
    try {
      await homeOfficeService.cancelPoint(point, reason);
      toast.success('Lançamento cancelado.');
      setCancelling(null);
      setReason('');
      onChanged();
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível cancelar.'));
    } finally {
      setBusy(false);
    }
  };

  if (points.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-xs font-medium text-zinc-400">Nenhuma ocorrência nesta semana. 100 pontos mantidos.</p>;
  }

  return (
    <>
      <ol className="space-y-2.5">
        <AnimatePresence initial={false}>
          {points.map((p) => {
            const cancelled = p.status === 'cancelled';
            return (
              <motion.li
                key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-3.5 ${cancelled ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums ${cancelled ? 'bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                    −{p.points}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold leading-snug ${cancelled ? 'text-zinc-400 line-through' : 'text-zinc-800 dark:text-zinc-100'}`}>{p.categoryLabel}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-400">{formatDate(p.occurredOn)}</p>
                    <p className={`mt-1.5 text-xs leading-relaxed ${cancelled ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}`}>{p.note}</p>
                    {cancelled && <p className="mt-1.5 text-[11px] font-semibold text-zinc-500">Cancelado: {p.cancelReason}</p>}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {p.hasEvidence ? (
                        <button type="button" onClick={() => setOpenEvidence(p.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer">
                          <Camera className="h-3.5 w-3.5" /> Ver print
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400"><FileHeart className="h-3.5 w-3.5" /> Sem anexo</span>
                      )}
                      {!cancelled && !locked && cancelling !== p.id && (
                        <button type="button" onClick={() => { setCancelling(p.id); setReason(''); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                          <Ban className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                    {cancelling === p.id && (
                      <div className="mt-3 space-y-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/15 p-3">
                        <label htmlFor={`cancel-${p.id}`} className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Motivo do cancelamento</label>
                        <input id={`cancel-${p.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: lançado na pessoa errada" className="w-full rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-900 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-300" />
                        <div className="flex gap-2">
                          <button type="button" disabled={busy} onClick={() => confirmCancel(p)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60 cursor-pointer">Confirmar cancelamento</button>
                          <button type="button" onClick={() => setCancelling(null)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-zinc-500 cursor-pointer">Voltar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {openEvidence && <EvidenceLightbox pointId={openEvidence} onClose={() => setOpenEvidence(null)} />}
    </>
  );
}
