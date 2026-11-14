import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, Lock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomeOfficeCategory, User } from '../../types';
import { homeOfficeService } from '../../services/homeOfficeService';
import { NOTE_MAX, todayYmd, validatePointInput } from '../../services/homeOfficeLogic';
import { friendlyError } from '../../services/errors';
import EvidenceInput from '../shared/EvidenceInput';

interface HomeOfficeEntryFormProps {
  technician: User;
  categories: HomeOfficeCategory[];
  /** Semana fechada: formulário travado. */
  locked: boolean;
  onAdded: () => void;
}

const field = 'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 outline-none transition focus:border-[#0bbb81] focus:ring-2 focus:ring-[#0bbb81]/25 disabled:opacity-50';
const label = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';

export default function HomeOfficeEntryForm({ technician, categories, locked, onAdded }: HomeOfficeEntryFormProps) {
  const active = categories.filter((c) => c.active);
  const [categoryId, setCategoryId] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayYmd());
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const category = active.find((c) => c.id === categoryId);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    // Atestado nunca recebe imagem: descarta qualquer print já colado.
    if (!active.find((c) => c.id === id)?.requiresEvidence) setEvidence(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validatePointInput({ category, note, occurredOn, hasEvidence: Boolean(evidence) });
    if (problem || !category) {
      toast.error(problem ?? 'Selecione a categoria.');
      return;
    }
    setSaving(true);
    try {
      await homeOfficeService.addPoint({ technician, category, note, occurredOn, evidence: evidence ?? undefined });
      toast.success(`−${category.points} pontos lançados para ${technician.name.split(' ')[0]}.`);
      setNote('');
      setEvidence(null);
      onAdded();
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível lançar a pontuação.'));
    } finally {
      setSaving(false);
    }
  };

  if (locked) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Semana fechada para {technician.name.split(' ')[0]}. Não entram novos lançamentos; para corrigir, reabra a semana
          (só é possível antes de a pessoa assinar a ciência).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#1e2023]/70 p-5 backdrop-blur">
      <div className="grid gap-4 sm:grid-cols-[1fr_9.5rem]">
        <div>
          <label htmlFor="ho-category" className={label}>Categoria</label>
          <select id="ho-category" value={categoryId} onChange={(e) => pickCategory(e.target.value)} className={field}>
            <option value="">Selecione a ocorrência...</option>
            {active.map((c) => <option key={c.id} value={c.id}>{c.label} (−{c.points})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ho-date" className={label}>Data</label>
          <input id="ho-date" type="date" value={occurredOn} max={todayYmd()} onChange={(e) => setOccurredOn(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <label htmlFor="ho-note" className={label}>Observação (por que foi pontuado)</label>
          <span className={`mb-1.5 text-[10px] font-semibold tabular-nums ${note.length > NOTE_MAX ? 'text-rose-500' : 'text-zinc-400'}`}>{note.length}/{NOTE_MAX}</span>
        </div>
        <textarea
          id="ho-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: Card 4821 voltou do N2 por falta de evidência do atendimento."
          className={`${field} resize-none`}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {category && !category.requiresEvidence ? (
          <motion.div
            key="no-evidence" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 overflow-hidden rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3.5 py-3"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Atestados não recebem anexo: documento de saúde é dado sensível. Registre só o motivo na observação.
            </p>
          </motion.div>
        ) : (
          <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className={label}>Print (evidência)</span>
            <EvidenceInput value={evidence} onChange={setEvidence} />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit" disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0bbb81] py-3 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-[#0aa874] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {category ? `Lançar −${category.points} pontos` : 'Lançar pontuação'}
      </button>
    </form>
  );
}
