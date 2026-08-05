import type { Worker } from '@/types';
import { AIWorkerCard } from './AIWorkerCard';

interface HighestRatedWorkerCardProps {
  worker: Worker;
  index?: number;
}

export function HighestRatedWorkerCard({ worker, index = 0 }: HighestRatedWorkerCardProps) {
  return <AIWorkerCard worker={worker} variant="highest-rated" index={index} />;
}
