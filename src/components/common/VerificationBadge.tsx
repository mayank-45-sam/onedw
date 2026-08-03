import { Award, ShieldCheck, GraduationCap, Ban } from 'lucide-react';
import type { VerificationBadge as BadgeType } from '@/types';
import { cn } from '@/lib/utils';

const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  gold: { label: 'Gold Verified', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Award },
  pro: { label: 'Verified Pro', className: 'bg-sky-500/10 text-sky-600 border-sky-500/30', icon: ShieldCheck },
  beginner: { label: 'Beginner', className: 'bg-success/10 text-success border-success/30', icon: GraduationCap },
  rejected: { label: 'Rejected', className: 'bg-error/10 text-error border-error/30', icon: Ban },
};

interface VerificationBadgeProps {
  badge: BadgeType;
  trustScore?: number | null;
  size?: 'xs' | 'sm' | 'md';
  showScore?: boolean;
  className?: string;
}

export function VerificationBadge({ badge, trustScore, size = 'sm', showScore = false, className }: VerificationBadgeProps) {
  const config = BADGE_CONFIG[badge];
  const Icon = config.icon;
  const sizes = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizes[size],
        config.className,
        className
      )}
    >
      <Icon className={size === 'md' ? 'h-4 w-4' : size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
      {showScore && trustScore != null && (
        <span className={cn('font-semibold tabular-nums', size === 'md' ? 'text-xs' : 'text-[10px]', 'opacity-80')}>
          · {Math.round(trustScore)}/100
        </span>
      )}
    </span>
  );
}
