import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import type { AiInsight, MetricTone } from '@/hooks/useAdminDashboardData';

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

export function AiInsightsPanel({ insights }: { insights: AiInsight[] }) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-border/60 bg-card/70 p-5 backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-br from-[hsl(var(--primary)/0.12)] via-[hsl(var(--chart-5)/0.08)] to-transparent blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--chart-5))] to-[hsl(var(--chart-2))] text-white shadow-md">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Smart signals computed from live platform data</p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/50 p-4 transition hover:border-primary/30 hover:bg-background"
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE_ICON[ins.tone])}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{ins.label}</p>
                <p className="truncate text-base font-bold font-display">{ins.value}</p>
                <p className="truncate text-[11px] text-muted-foreground/70">{ins.hint}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

export function InsightChip({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <Link
      to={ROUTES.adminAnalytics}
      className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium transition hover:border-primary/40"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
    </Link>
  );
}
