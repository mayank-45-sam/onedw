import { motion } from 'framer-motion';
import {
  Calendar,
  ShieldCheck,
  Hourglass,
  MessageSquareWarning,
  Star,
  Megaphone,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { timeAgo } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ActivityEvent, ActivityType } from '@/hooks/useAdminDashboardData';

const TYPE_META: Record<ActivityType, { icon: LucideIcon; className: string; ring: string }> = {
  booking: { icon: Calendar, className: 'text-primary', ring: 'bg-primary/10' },
  verified: { icon: ShieldCheck, className: 'text-success', ring: 'bg-success/10' },
  verification_pending: { icon: Hourglass, className: 'text-warning', ring: 'bg-warning/10' },
  complaint: { icon: MessageSquareWarning, className: 'text-error', ring: 'bg-error/10' },
  review: { icon: Star, className: 'text-[hsl(var(--chart-4))]', ring: 'bg-[hsl(var(--chart-4))]/10' },
  broadcast: { icon: Megaphone, className: 'text-accent', ring: 'bg-accent/10' },
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-3xl border-border/60 bg-card/70 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <h3 className="font-display text-sm font-bold">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">Latest events across the platform</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{events.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-7 w-7" />
            </span>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/70">Bookings, verifications and complaints will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map((e, i) => {
              const meta = TYPE_META[e.type];
              const Icon = meta.icon;
              const content = (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-muted/60"
                >
                  <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.ring, meta.className)}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.description}</p>
                  </div>
                  <span className="shrink-0 pt-1 text-[11px] font-medium text-muted-foreground/70">{timeAgo(e.timestamp)}</span>
                </motion.li>
              );
              return e.to ? (
                <Link key={e.id} to={e.to} className="block rounded-2xl">
                  {content}
                </Link>
              ) : (
                content
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
