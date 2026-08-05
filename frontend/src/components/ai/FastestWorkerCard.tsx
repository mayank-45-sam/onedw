import type { Worker } from '@/types';
import { AIWorkerCard } from './AIWorkerCard';

interface FastestWorkerCardProps {
  worker: Worker;
  etaMinutes?: number;
  distanceKm?: number;
  index?: number;
}

export function FastestWorkerCard({ worker, etaMinutes, distanceKm, index = 0 }: FastestWorkerCardProps) {
  return <AIWorkerCard worker={worker} variant="fastest" index={index} etaMinutes={etaMinutes} distanceKm={distanceKm} />;
}
