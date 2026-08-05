import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Wrench,
  MessageSquareWarning,
  Megaphone,
  Sparkles,
  Siren,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  hint: string;
  to: string;
  icon: LucideIcon;
  gradient: string;
  badge?: number;
  badgeTone?: 'primary' | 'error';
}

export function QuickActions({ counts }: { counts: { verification: number; complaints: number; emergency: number } }) {
  const actions: QuickAction[] = [
    {
      label: 'Verify Workers',
      hint: 'Approve pending profiles',
      to: ROUTES.adminVerification,
      icon: ShieldCheck,
      gradient: 'from-[hsl(var(--primary))] to-[hsl(var(--chart-2))]',
      badge: counts.verification,
    },
    {
      label: 'Manage Services',
      hint: 'Catalog & pricing',
      to: ROUTES.adminServices,
      icon: Wrench,
      gradient: 'from-[hsl(var(--chart-2))] to-[hsl(var(--success))]',
    },
    {
      label: 'View Complaints',
      hint: 'Resolve open issues',
      to: ROUTES.complaintManagement,
      icon: MessageSquareWarning,
      gradient: 'from-[hsl(var(--error))] to-[hsl(var(--chart-4))]',
      badge: counts.complaints,
      badgeTone: 'error',
    },
    {
      label: 'Broadcast Notification',
      hint: 'Reach customers & workers',
      to: ROUTES.adminBroadcasts,
      icon: Megaphone,
      gradient: 'from-[hsl(var(--accent))] to-[hsl(var(--primary))]',
    },
    {
      label: 'AI Insights',
      hint: 'Trends & predictions',
      to: ROUTES.adminAnalytics,
      icon: Sparkles,
      gradient: 'from-[hsl(var(--chart-5))] to-[hsl(var(--chart-2))]',
    },
    {
      label: 'Emergency Dashboard',
      hint: 'Live bookings & jobs',
      to: ROUTES.adminBookings,
      icon: Siren,
      gradient: 'from-[hsl(var(--warning))] to-[hsl(var(--error))]',
      badge: counts.emergency,
      badgeTone: 'error',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.div key={a.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link
              to={a.to}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110', a.gradient)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{a.label}</p>
                  {!!a.badge && a.badge > 0 && (
                    <span className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white',
                      a.badgeTone === 'error' ? 'bg-error' : 'bg-primary'
                    )}>
                      {a.badge > 99 ? '99+' : a.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.hint}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
