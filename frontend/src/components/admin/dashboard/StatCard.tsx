import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricTone } from '@/hooks/useAdminDashboardData';

const TONE_ICON: Record<MetricTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  accent: 'bg-accent/10 text-accent',
  violet: 'bg-[hsl(var(--chart-5))]/10 text-[hsl(var(--chart-5))]',
  cyan: 'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]',
  slate: 'bg-muted text-muted-foreground',
};

function TrendBadge({ delta }: { delta: NonNullable<DashboardMetric['delta']> }) {
  const Icon = delta.trend === 'up' ? ArrowUpRight : delta.trend === 'down' ? ArrowDownRight : Minus;
  const cls = delta.trend === 'up' ? 'text-success' : delta.trend === 'down' ? 'text-error' : 'text-muted-foreground';
  return (
    <span className={cn('flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold', cls)}>
      <Icon className="h-3 w-3" />
      {delta.value}
    </span>
  );
}

export function StatCard({ metric, index }: { metric: DashboardMetric; index: number }) {
  const Icon = metric.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.5), duration: 0.4 }}
    >
      <Card className="group relative h-full overflow-hidden rounded-2xl border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
        <div className="flex items-start justify-between gap-2">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE_ICON[metric.tone])}>
            <Icon className="h-5 w-5" />
          </div>
          {metric.delta && <TrendBadge delta={metric.delta} />}
        </div>
        <p className="mt-3 truncate text-xl font-bold font-display tabular-nums sm:text-2xl">{metric.value}</p>
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        {metric.hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{metric.hint}</p>}
      </Card>
    </motion.div>
  );
}
