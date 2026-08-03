import { Shield, ShieldAlert, ShieldOff, AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FraudBadgeProps {
  riskLevel?: string;
  fraudScore?: number;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

function getRiskColor(level: string, isSafe: boolean): string {
  if (isSafe) return 'text-green-600 border-green-400/40 bg-green-50';
  switch (level) {
    case 'critical': return 'text-error border-error/40 bg-error/10';
    case 'high': return 'text-orange-600 border-orange-400/40 bg-orange-50';
    case 'medium': return 'text-yellow-600 border-yellow-400/40 bg-yellow-50';
    default: return 'text-green-600 border-green-400/40 bg-green-50';
  }
}

export function FraudBadge({ riskLevel, fraudScore, isDisabled, size = 'sm', showScore, className }: FraudBadgeProps) {
  if (isDisabled) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', 'text-error border-error/40 bg-error/10', className)}>
        <Ban className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Bookings Disabled
      </span>
    );
  }

  const level = riskLevel ?? 'low';
  const score = fraudScore ?? 0;
  const isSafe = level === 'low' && score < 30;
  const colorClass = getRiskColor(level, isSafe);

  if (isSafe) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', colorClass, className)}>
        <CheckCircle2 className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        Fraud Safe
      </span>
    );
  }

  const icon = level === 'critical' || level === 'high' ? ShieldAlert : level === 'medium' ? AlertTriangle : Shield;

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', colorClass, className)}>
      {icon({ className: size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5' })}
      {level === 'critical' ? 'Critical Risk' : level === 'high' ? 'High Risk' : level === 'medium' ? 'Medium Risk' : 'Low Risk'}
      {showScore && <span className={cn('ml-0.5 font-bold', 'text-green-600')}>({Math.round(score)})</span>}
    </span>
  );
}

export function FraudWarningBanner({ riskLevel, fraudScore, isDisabled, recommendation, className }: {
  riskLevel?: string;
  fraudScore?: number;
  isDisabled?: boolean;
  recommendation?: string;
  className?: string;
}) {
  if (!riskLevel && !isDisabled) return null;
  if (riskLevel === 'low' && !isDisabled) return null;

  const isHighRisk = riskLevel === 'high' || riskLevel === 'critical' || isDisabled;

  if (!isHighRisk) return null;

  return (
    <div className={cn(
      'rounded-xl border p-3',
      isDisabled ? 'border-error/30 bg-error/5' : 'border-orange-300/40 bg-orange-50',
      className
    )}>
      <div className="flex items-start gap-2">
        <div className={cn('mt-0.5 shrink-0', isDisabled ? 'text-error' : 'text-orange-500')}>
          {isDisabled ? <Ban className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', isDisabled ? 'text-error' : 'text-orange-700')}>
            {isDisabled ? 'Booking Disabled - Safety Concern' : 'High Risk Worker'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recommendation
              ? `Recommendation: ${recommendation.replace(/_/g, ' ')}`
              : 'This worker has been flagged by our fraud detection system. Proceed with caution.'}
          </p>
        </div>
      </div>
    </div>
  );
}
