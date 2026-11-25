import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CornerDownLeft, FileText, Home, Plus, Search, Target, Users } from 'lucide-react';
import type { Feedback, User } from '../../types';
import { searchPalette, type PaletteAction, type PaletteResult } from '../../services/commandPalette';
import { useModalA11y } from '../../hooks/useModalA11y';

interface CommandPaletteProps {
  technicians: User[];
  feedbacks: Feedback[];
  onClose: () => void;
  onPick: (action: PaletteAction) => void;
}

function iconFor(r: PaletteResult) {
  if (r.group === 'Pessoas') return Users;
  if (r.id.startsWith('feedback:')) return FileText;
  if (r.id.startsWith('goal:')) return Target;
  return r.action.type === 'new_feedback' ? Plus : Home;
}

/** Busca rápida (Ctrl+K): pessoas, feedbacks, metas e atalhos, com navegação pelo teclado. */
export default function CommandPalette({ technicians, feedbacks, onClose, onPick }: CommandPaletteProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => searchPalette(query, { technicians, feedbacks }), [query, technicians, feedbacks]);
  const active = Math.min(cursor, Math.max(0, results.length - 1));

  const move = (delta: number) => {
    if (results.length === 0) return;
    const next = (active + delta + results.length) % results.length;
    setCursor(next);
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); onPick(results[active].action); }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-start justify-center bg-zinc-950/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Busca rápida"
        initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-700/70 bg-white dark:bg-[#16191d] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-[#0bbb81]" />
          <input
            value={query} onChange={(e) => { setQuery(e.target.value); setCursor(0); }} onKeyDown={onKeyDown}
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list"
            aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            aria-label="Buscar pessoa, feedback ou meta" placeholder="Buscar pessoa, feedback ou meta"
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-zinc-900 dark:text-white outline-none placeholder:text-zinc-400"
          />
          <kbd className="rounded-md border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-300">Esc</kbd>
        </div>

        <ul id="palette-list" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto p-2.5">
          {results.length === 0 && (
            <li className="px-4 py-10 text-center text-sm font-medium text-zinc-400">Nada encontrado para "{query}".</li>
          )}
          {results.map((r, i) => {
            const Icon = iconFor(r);
            const header = i === 0 || results[i - 1].group !== r.group;
            return (
              <li key={r.id} role="presentation">
                {header && <p className="px-3 pb-1.5 pt-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-400">{r.group}</p>}
                <button
                  type="button" id={`palette-${i}`} role="option" aria-selected={i === active} data-index={i}
                  onMouseEnter={() => setCursor(i)} onClick={() => onPick(r.action)}
                  className={`flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition cursor-pointer ${
                    i === active ? 'bg-emerald-50 dark:bg-emerald-500/15 ring-1 ring-emerald-500/30' : ''}`}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">{r.title}</span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{r.subtitle}</span>
                  </span>
                  {i === active && <CornerDownLeft className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span><b className="text-zinc-700 dark:text-zinc-200">↑ ↓</b> navegar</span>
          <span><b className="text-zinc-700 dark:text-zinc-200">Enter</b> abrir</span>
          <span><b className="text-zinc-700 dark:text-zinc-200">Esc</b> fechar</span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
