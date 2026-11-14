import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { HomeOfficeCategory, HomeOfficeConfig } from '../../types';
import { homeOfficeService } from '../../services/homeOfficeService';
import { friendlyError } from '../../services/errors';
import { useModalA11y } from '../../hooks/useModalA11y';

interface HomeOfficeConfigModalProps {
  config: HomeOfficeConfig;
  onClose: () => void;
  onSaved: () => void;
}

const input = 'w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-center text-sm font-bold tabular-nums outline-none focus:border-[#0bbb81] focus:ring-2 focus:ring-[#0bbb81]/25';

export default function HomeOfficeConfigModal({ config, onClose, onSaved }: HomeOfficeConfigModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const [categories, setCategories] = useState<HomeOfficeCategory[]>(config.categories);
  const [threshold, setThreshold] = useState(config.threshold);
  const [saving, setSaving] = useState(false);

  const patch = (id: string, change: Partial<HomeOfficeCategory>) =>
    setCategories((list) => list.map((c) => (c.id === id ? { ...c, ...change } : c)));

  const save = async () => {
    setSaving(true);
    try {
      await homeOfficeService.saveConfig({ categories, threshold });
      toast.success('Configuração salva. Valem para os próximos lançamentos.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, 'Não foi possível salvar a configuração.'));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm">
      <motion.div
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ho-config-title"
        initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <h3 id="ho-config-title" className="text-base font-bold text-zinc-900 dark:text-white">Pesos e nota de corte</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/15 px-4 py-3">
            <div>
              <label htmlFor="ho-threshold" className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Nota de corte</label>
              <p className="text-[11px] text-zinc-500">Saldo mínimo da semana para ficar elegível ao home office.</p>
            </div>
            <input id="ho-threshold" type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className={input} />
          </div>

          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={c.active} onChange={(e) => patch(c.id, { active: e.target.checked })} className="h-4 w-4 accent-[#0bbb81]" />
                  <span className={`text-sm font-semibold leading-snug ${c.active ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 line-through'}`}>{c.label}</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                  −<input aria-label={`Pontos de ${c.label}`} type="number" min={1} max={100} value={c.points} onChange={(e) => patch(c.id, { points: Number(e.target.value) })} className={input} />
                </label>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-zinc-400">Mudar um peso não altera lançamentos antigos: cada lançamento guarda os pontos do momento em que foi feito.</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">Cancelar</button>
          <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#0bbb81] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#0aa874] disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
