import { CheckCircle, AlertCircle, PlayCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface StatusBadgeProps {
  status: 'read' | 'pending' | 'in_progress' | 'completed' | 'active' | 'inactive';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    read: {
      label: 'Lido',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      icon: CheckCircle
    },
    pending: {
      label: 'Pendente',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50',
      icon: AlertCircle
    },
    in_progress: {
      label: 'Em progresso',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
      icon: PlayCircle
    },
    completed: {
      label: 'Concluído',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      icon: CheckCircle
    },
    active: {
      label: 'Ativo',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      icon: ToggleRight
    },
    inactive: {
      label: 'Inativo',
      className: 'bg-zinc-150 text-zinc-650 dark:bg-zinc-800/60 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50',
      icon: ToggleLeft
    }
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
