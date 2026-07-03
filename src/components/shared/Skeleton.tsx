import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SkeletonVariant = 'card' | 'row' | 'circle' | 'text' | 'stat';

interface SkeletonProps {
  /** Layout preset */
  variant?: SkeletonVariant;
  /** Extra Tailwind classes applied to the outermost wrapper */
  className?: string;
  /** How many copies of the skeleton to render */
  count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitive block – the shimmer "pill"
// ─────────────────────────────────────────────────────────────────────────────

interface BlockProps {
  className?: string;
}

const Block: React.FC<BlockProps> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`skeleton-shimmer rounded ${className}`}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Variant renderers
// ─────────────────────────────────────────────────────────────────────────────

/** Large number + label underneath — ideal for metric/KPI cards */
const StatVariant: React.FC = () => (
  <div className="flex flex-col gap-2 p-4">
    <Block className="h-8 w-16" />
    <Block className="h-3 w-24" />
  </div>
);

/** Card with header + 3-line body copy */
const CardVariant: React.FC = () => (
  <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)]">
    {/* header */}
    <Block className="h-4 w-32" />
    {/* body lines */}
    <div className="flex flex-col gap-2 mt-1">
      <Block className="h-3 w-full" />
      <Block className="h-3 w-full" />
      <Block className="h-3 w-4/5" />
    </div>
  </div>
);

/** Avatar circle + two text lines — list / table rows */
const RowVariant: React.FC = () => (
  <div className="flex items-center gap-3 py-2">
    {/* avatar */}
    <Block className="h-8 w-8 rounded-full shrink-0" />
    {/* text */}
    <div className="flex flex-col gap-1.5 flex-1">
      <Block className="h-3 w-2/5" />
      <Block className="h-3 w-3/5" />
    </div>
  </div>
);

/** Standalone circle — avatar / icon placeholder */
const CircleVariant: React.FC = () => (
  <Block className="h-10 w-10 rounded-full" />
);

/** Single line of text */
const TextVariant: React.FC = () => (
  <Block className="h-3 w-full" />
);

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton component
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_MAP: Record<SkeletonVariant, React.FC> = {
  stat: StatVariant,
  card: CardVariant,
  row: RowVariant,
  circle: CircleVariant,
  text: TextVariant,
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  className = '',
  count = 1,
}) => {
  const VariantComponent = VARIANT_MAP[variant];
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      role="status"
      aria-label="Carregando…"
      className={`w-full ${className}`}
    >
      {items.map((i) => (
        <VariantComponent key={i} />
      ))}
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonStatCard — 4 stat placeholders side-by-side (SupervisorDashboard)
// ─────────────────────────────────────────────────────────────────────────────

export const SkeletonStatCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    role="status"
    aria-label="Carregando métricas…"
    className={`grid grid-cols-2 sm:grid-cols-4 gap-4 w-full ${className}`}
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)] overflow-hidden"
      >
        <StatVariant />
      </div>
    ))}
    <span className="sr-only">Carregando métricas…</span>
  </div>
);

export default Skeleton;
