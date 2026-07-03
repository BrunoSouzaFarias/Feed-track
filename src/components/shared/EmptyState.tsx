import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-4">
        <Icon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{description}</p>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-5 px-5 py-2 text-sm font-bold bg-liberty text-white rounded-xl hover:bg-liberty/90 transition-colors cursor-pointer"
        >
          {ctaLabel}
        </button>
      )}
    </motion.div>
  );
}
