import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Briefcase, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/format';
import { initials } from '@/utils/format';
import { RecommendationReason } from '@/components/ai/RecommendationReason';
import { buildRecommendationReason, type RecommendationSignals } from '@/utils/recommendationReason';
import type { RecommendedWorker } from '@/types/imageAnalysis';
import { cn } from '@/lib/utils';

interface RecommendedWorkerCardProps {
  worker: RecommendedWorker;
  index: number;
}

function getTrustColor(score: number | null | undefined) {
  if (score == null) return 'text-muted-foreground';
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-destructive';
}

function getTrustLabel(score: number | null | undefined) {
  if (score == null) return 'Unknown';
  if (score >= 90) return 'AI Trusted';
  if (score >= 70) return 'Verified';
  return 'Review Needed';
}

export function RecommendedWorkerCard({ worker, index }: RecommendedWorkerCardProps) {
  const reasonLines = useMemo(() => {
    const signals: RecommendationSignals = {
      trustScore: worker.trust_score,
      rating: worker.rating,
      reviewCount: null,
      experienceYears: worker.experience_years,
      completedJobs: worker.completed_jobs,
      hourlyRate: worker.hourly_rate,
      isOnline: null,
      profession: worker.profession,
      estimatedArrival: worker.estimated_arrival,
    };
    const lines = buildRecommendationReason('recommended', signals);
    if (worker.estimated_arrival) {
      lines.push(`Estimated arrival in ${worker.estimated_arrival}.`);
    }
    return lines;
  }, [worker]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group rounded-2xl border bg-card p-4 transition-all hover:shadow-lg hover:border-primary/30"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/10">
          <AvatarImage src={worker.avatar} alt={worker.name} />
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
            {initials(worker.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold truncate">{worker.name || 'Unknown Worker'}</h4>
              <p className="text-sm text-muted-foreground">{worker.profession || 'Professional'}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 gap-1 border-0 bg-primary/5',
                getTrustColor(worker.trust_score)
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              {getTrustLabel(worker.trust_score)}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              {(worker.rating ?? 0).toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {worker.experience_years ?? 0} yrs
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {worker.estimated_arrival || 'N/A'}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold">{formatCurrency(worker.hourly_rate)}/hr</span>
            <Button size="sm" className="rounded-xl gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Book Now
            </Button>
          </div>

          <RecommendationReason lines={reasonLines} />
        </div>
      </div>
    </motion.div>
  );
}
