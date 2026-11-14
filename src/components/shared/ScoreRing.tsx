import { motion } from 'motion/react';
import { scoreTone } from '../../services/homeOfficeLogic';

interface ScoreRingProps {
  score: number;
  threshold: number;
  size?: number;
  /** Mostra "pts" sob o número (telas maiores). */
  label?: boolean;
}

const STROKE = { ok: '#0bbb81', warn: '#f59e0b', bad: '#f43f5e' } as const;
const TEXT = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-rose-600 dark:text-rose-400',
} as const;

export default function ScoreRing({ score, threshold, size = 72, label = false }: ScoreRingProps) {
  const tone = scoreTone(score, threshold);
  const stroke = Math.max(6, Math.round(size / 10));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Saldo ${score} de 100 pontos`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-zinc-200 dark:stroke-zinc-800" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={STROKE[tone]}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* marca da nota de corte */}
        <circle
          cx={size / 2 + radius * Math.cos((threshold / 100) * 2 * Math.PI)}
          cy={size / 2 + radius * Math.sin((threshold / 100) * 2 * Math.PI)}
          r={Math.max(2, stroke / 3)} className="fill-zinc-500 dark:fill-zinc-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-extrabold tabular-nums ${TEXT[tone]}`} style={{ fontSize: size * 0.3 }}>{score}</span>
        {label && <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">pontos</span>}
      </div>
    </div>
  );
}
