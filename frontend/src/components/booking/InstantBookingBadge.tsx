import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type InstantBadgeType = 'instant' | 'emergency';

interface InstantBookingBadgeProps {
  type: InstantBadgeType;
  className?: string;
}

const CONFIG: Record<InstantBadgeType, { label: string; icon: string; color: string }> = {
  instant: { label: 'Instant', icon: '⚡', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  emergency: { label: 'Emergency', icon: '🚨', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

export function InstantBookingBadge({ type, className }: InstantBookingBadgeProps) {
  const cfg = CONFIG[type];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        cfg.color,
        className,
      )}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </motion.span>
  );
}
