import { motion } from 'motion/react';
import { CheckCircle2, Lock, PenLine, Timer } from 'lucide-react';
import type { HomeOfficeWeek, User } from '../../types';
import Avatar from '../shared/Avatar';
import ScoreRing from '../shared/ScoreRing';

export interface HomeOfficeRow {
  tech: User;
  score: number;
  count: number; // ocorrências ativas
  week?: HomeOfficeWeek;
}

interface HomeOfficeTeamListProps {
  rows: HomeOfficeRow[];
  threshold: number;
  selectedId: string | null;
  onSelect: (technicianId: string) => void;
}

function StatusBadge({ row, threshold }: { row: HomeOfficeRow; threshold: number }) {
  const eligible = row.score >= threshold;
  if (row.week?.ackAt) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/30 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300"><PenLine className="h-3 w-3" /> Ciente</span>;
  }
  if (row.week) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300"><Lock className="h-3 w-3" /> Fechada · aguardando ciência</span>;
  }
  return eligible
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Elegível</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"><Timer className="h-3 w-3" /> Abaixo do corte</span>;
}

export default function HomeOfficeTeamList({ rows, threshold, selectedId, onSelect }: HomeOfficeTeamListProps) {
  return (
    <ul className="space-y-2.5">
      {rows.map((row, i) => {
        const selected = row.tech.uid === selectedId;
        return (
          <motion.li key={row.tech.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <button
              type="button" onClick={() => onSelect(row.tech.uid)} aria-pressed={selected}
              className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                selected
                  ? 'border-[#0bbb81] bg-emerald-50/60 dark:bg-emerald-950/15 shadow-md shadow-emerald-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e2023] hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <ScoreRing score={row.score} threshold={threshold} size={58} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar name={row.tech.name} photoURL={row.tech.photoURL} size="sm" />
                  <span className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">{row.tech.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge row={row} threshold={threshold} />
                  <span className="text-[11px] font-medium text-zinc-400">{row.count === 0 ? 'sem ocorrências' : `${row.count} ocorrência${row.count > 1 ? 's' : ''}`}</span>
                </div>
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
