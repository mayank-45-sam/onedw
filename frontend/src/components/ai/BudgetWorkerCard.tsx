import type { Worker } from '@/types';
import { AIWorkerCard } from './AIWorkerCard';

interface BudgetWorkerCardProps {
  worker: Worker;
  estimatedPrice?: number;
  averagePrice?: number;
  distanceKm?: number;
  etaMinutes?: number;
  index?: number;
}

export function BudgetWorkerCard({
  worker,
  estimatedPrice,
  averagePrice,
  distanceKm,
  etaMinutes,
  index = 0,
}: BudgetWorkerCardProps) {
  const savings = averagePrice != null && estimatedPrice != null ? Math.max(0, averagePrice - estimatedPrice) : undefined;
  return (
    <AIWorkerCard
      worker={worker}
      variant="budget"
      index={index}
      estimatedPrice={estimatedPrice}
      savings={savings}
      distanceKm={distanceKm}
      etaMinutes={etaMinutes}
    />
  );
}
