import { BadgeCheck, Briefcase, Globe, Star, ShieldAlert, Ban, MapPin, Clock } from 'lucide-react';
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
      className={cn('group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1.5 [box-shadow:0_2px_8px_rgb(15_23_42/0.06),0_1px_3px_rgb(15_23_42/0.08)] hover:[box-shadow:0_20px_60px_rgb(15_23_42/0.14),0_8px_24px_rgb(15_23_42/0.08)]', isDisabled && 'opacity-70')}
    >
      {/* Cover image / gradient banner */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/30 via-primary/15 to-accent/25">
        {worker.coverImage && (
          <img src={worker.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Online badge */}
        {worker.isOnline && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Online
          </span>
        )}

        {/* Verified badge */}
        {worker.isVerified && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}

        {/* Fraud/disabled badge */}
        {showFraud && (
          <span className={cn(
            'absolute left-3 bottom-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm',
            isDisabled ? 'bg-error/85' : 'bg-orange-500/85'
          )}>
            {isDisabled ? <Ban className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {isDisabled ? 'Disabled' : riskLevel === 'critical' ? 'Critical' : 'High Risk'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="-mt-12 flex flex-1 flex-col px-5 pb-5">
        {/* Avatar */}
        <Avatar className="h-20 w-20 border-4 border-card shadow-lg ring-2 ring-primary/15">
          <AvatarImage src={worker.avatar} alt={worker.name} />
          <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
            {initials(worker.name)}
          </AvatarFallback>
        </Avatar>

        {/* Name + verify icon */}
        <div className="mt-3 flex items-center gap-1.5">
          <h3 className="font-bold font-display truncate text-base group-hover:text-primary transition-colors duration-200">
            {worker.name}
          </h3>
          {worker.isVerified && <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-primary" />}
        </div>

        <p className="text-sm text-muted-foreground font-medium">{worker.profession}</p>

        {/* Verification badge */}
        {worker.verificationBadge && (
          <div className="mt-2">
            <VerificationBadge badge={worker.verificationBadge} trustScore={worker.trustScore} size="xs" showScore />
          </div>
        )}

        {/* Rating */}
        <div className="mt-2.5">
          <StarRating rating={worker.rating} size={14} showValue reviewCount={worker.reviewCount} />
        </div>

        {/* Stats row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-medium">
            <Briefcase className="h-3.5 w-3.5 text-primary/70" />
            <span>{worker.experienceYears}y exp</span>
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            <span>{worker.completedJobs} jobs</span>
          </span>
          {worker.languages?.length > 0 && (
            <>
              <span className="h-3 w-px bg-border" />
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {worker.languages.slice(0, 2).join(', ')}
              </span>
            </>
          )}
        </div>

        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span key={skill} className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {skill}
              </span>
            ))}
          </div>
        )}

        <RecommendationReason lines={reason ?? []} />

        {/* Price + CTA */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <span className="text-xs text-muted-foreground">from</span>
            <p className="font-extrabold font-display text-lg text-foreground">{formatCurrency(worker.hourlyRate)}/hr</p>
          </div>
          <Button asChild size="sm" className="btn-glow rounded-full bg-brand-gradient text-white text-xs px-4">
            <Link to={`/workers/${worker._id}`}>View Profile</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
