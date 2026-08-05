import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LiveWidget } from '@/hooks/useAdminDashboardData';

const TONE_DOT: Record<LiveWidget['tone'], string> = {
  success: 'bg-success',
  primary: 'bg-primary',
  accent: 'bg-accent',
  error: 'bg-error',
  violet: 'bg-[hsl(var(--chart-5))]',
};

export function LiveWidgets({ widgets }: { widgets: LiveWidget[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {widgets.map((w, i) => (
        <motion.div
          key={w.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.05, duration: 0.35 }}
          className="glass flex items-center gap-3 rounded-2xl p-4"
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', TONE_DOT[w.tone])} />
            <span className={cn('relative inline-flex h-3 w-3 rounded-full', TONE_DOT[w.tone])} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold font-display tabular-nums leading-tight">{w.value}</p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">{w.label}</p>
            <p className="truncate text-[10px] text-muted-foreground/60">{w.hint}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
