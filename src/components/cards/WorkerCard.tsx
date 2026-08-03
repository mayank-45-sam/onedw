import { BadgeCheck, Briefcase, Globe, Star, ShieldAlert, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/common/StarRating';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { RecommendationReason } from '@/components/ai/RecommendationReason';
import { initials } from '@/utils/format';
import { formatCurrency } from '@/utils/format';
import type { Worker } from '@/types';
import { cn } from '@/lib/utils';

interface WorkerCardProps {
  worker: Worker;
  index?: number;
  fraudScore?: number;
  riskLevel?: string;
  isDisabled?: boolean;
  reason?: string[];
}

export function WorkerCard({ worker, index = 0, fraudScore, riskLevel, isDisabled, reason }: WorkerCardProps) {
  const topSkills = worker.skills?.slice(0, 3) ?? [];
  const showFraud = riskLevel && (riskLevel !== 'low' || isDisabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn('card-premium card-premium-hover group flex flex-col overflow-hidden p-0', isDisabled && 'opacity-70')}
    >
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        {worker.coverImage && (
          <img src={worker.coverImage} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {worker.isOnline && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Online
          </span>
        )}
        {worker.isVerified && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
        {showFraud && (
          <span className={cn(
            'absolute left-3 bottom-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm',
            isDisabled ? 'bg-error/80' : 'bg-orange-500/80'
          )}>
            {isDisabled ? <Ban className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {isDisabled ? 'Disabled' : riskLevel === 'critical' ? 'Critical' : 'High Risk'}
          </span>
        )}
      </div>

      <div className="-mt-10 flex flex-1 flex-col px-5 pb-5">
        <Avatar className="h-20 w-20 border-4 border-card shadow-md">
          <AvatarImage src={worker.avatar} alt={worker.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials(worker.name)}
          </AvatarFallback>
        </Avatar>

        <div className="mt-3 flex items-center gap-1.5">
          <h3 className="font-semibold font-display truncate">{worker.name}</h3>
          {worker.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <p className="text-sm text-muted-foreground">{worker.profession}</p>

        {worker.verificationBadge && (
          <div className="mt-2">
            <VerificationBadge badge={worker.verificationBadge} trustScore={worker.trustScore} size="xs" showScore />
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <StarRating rating={worker.rating} size={14} showValue reviewCount={worker.reviewCount} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> {worker.experienceYears}y exp
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-warning text-warning" /> {worker.completedJobs} jobs
          </span>
          {worker.languages?.length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> {worker.languages.slice(0, 2).join(', ')}
            </span>
          )}
        </div>

        {topSkills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <RecommendationReason lines={reason ?? []} />

        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="text-xs text-muted-foreground">from</span>
            <p className="font-bold font-display">{formatCurrency(worker.hourlyRate)}/hr</p>
          </div>
          <Button asChild size="sm" className="btn-glow rounded-full">
            <Link to={`/workers/${worker._id}`}>View Profile</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
