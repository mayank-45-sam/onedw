import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardAlert } from '@/hooks/useAdminDashboardData';

const TONE_CHIP: Record<DashboardAlert['tone'], string> = {
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
};

export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-border/60 bg-card/70 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold">Notifications</h3>
            <p className="text-xs text-muted-foreground">Alerts requiring your attention</p>
          </div>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{alerts.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <BellOff className="h-7 w-7" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">You're all caught up</p>
            <p className="text-xs text-muted-foreground/70">No pending verifications, complaints or cancellations right now.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {alerts.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.li key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <Link
                    to={a.to}
                    className="group flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-muted/60"
                  >
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE_CHIP[a.tone])}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.hint}</p>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
