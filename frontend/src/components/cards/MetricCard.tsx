/**
 * @fileoverview MetricCard.tsx
 * @module frontend/src/components/cards/MetricCard
 *
 * Input:
//   - (no external imports)
 *
 * Output:
//   - MetricCard
 *
 * Pos: frontend/src/components/cards/MetricCard.tsx
 */

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  accent?: 'red' | 'blue' | 'yellow' | 'green';
}

const accentClasses: Record<NonNullable<MetricCardProps['accent']>, string> = {
  red: 'from-red-500/20 to-red-500/5 border-red-500/40 text-red-200',
  blue: 'from-sky-500/20 to-sky-500/5 border-sky-500/40 text-sky-200',
  yellow: 'from-amber-500/20 to-amber-500/5 border-amber-500/40 text-amber-200',
  green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/40 text-emerald-200'
};

export function MetricCard({ title, value, description, accent = 'red' }: MetricCardProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border bg-gradient-to-br p-6 shadow-lg shadow-slate-950/30 ${
        accentClasses[accent]
      }`}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-slate-200/80">{title}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {description ? <p className="text-sm text-slate-200/70">{description}</p> : null}
    </div>
  );
}
