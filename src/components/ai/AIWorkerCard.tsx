import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BadgeCheck, Star, MapPin, Clock, Zap, ArrowRight, Sparkles, TrendingUp, Wallet, Briefcase, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/common/StarRating';
import { formatCurrency, initials } from '@/utils/format';
import type { Worker } from '@/types';

type AIVariant = 'recommended' | 'budget' | 'fastest' | 'highest-rated';

const VARIANT_CONFIG: Record<
  AIVariant,
  { label: string; icon: React.ReactNode; accent: string; ring: string; reason: string }
> = {
  recommended: {
    label: 'AI Pick',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    accent: 'text-primary',
    ring: 'bg-primary/10',
    reason: 'High rating, fast response, and matches your preferences',
  },
  budget: {
    label: 'Budget Pick',
    icon: <Wallet className="h-3.5 w-3.5" />,
    accent: 'text-success',
    ring: 'bg-success/10',
    reason: 'Best value — quality service at the lowest rate',
  },
  fastest: {
    label: 'Fastest',
    icon: <Zap className="h-3.5 w-3.5" />,
    accent: 'text-warning',
    ring: 'bg-warning/10',
    reason: 'Closest available pro — shortest ETA to your location',
  },
  'highest-rated': {
    label: 'Top Rated',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    accent: 'text-rose-500',
    ring: 'bg-rose-500/10',
    reason: 'Highest customer ratings and most positive reviews',
  },
};

interface AIWorkerCardProps {
  worker: Worker;
  variant?: AIVariant;
  index?: number;
  etaMinutes?: number;
  distanceKm?: number;
  estimatedPrice?: number;
  savings?: number;
}

export function AIWorkerCard({
  worker,
  variant = 'recommended',
  index = 0,
  etaMinutes,
  distanceKm,
  estimatedPrice,
  savings,
}: AIWorkerCardProps) {
  const cfg = VARIANT_CONFIG[variant];
  const topSkills = worker.skills?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="card-premium card-premium-hover group relative flex flex-col overflow-hidden p-0"
    >
      <div className={`relative h-20 overflow-hidden bg-gradient-to-br ${cfg.ring}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
        <div className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold backdrop-blur ${cfg.accent}`}>
          {cfg.icon} {cfg.label}
        </div>
      </div>

      <div className="-mt-9 flex flex-1 flex-col px-5 pb-5">
        <Avatar className="h-16 w-16 border-4 border-card shadow-md">
          <AvatarImage src={worker.avatar} alt={worker.name} />
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(worker.name)}</AvatarFallback>
        </Avatar>

        <div className="mt-3 flex items-center gap-1.5">
          <h3 className="truncate font-semibold font-display">{worker.name}</h3>
          {worker.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <p className="text-sm text-muted-foreground">{worker.profession}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StarRating rating={worker.rating} size={13} showValue reviewCount={worker.reviewCount} />
          <span className="flex items-center gap-0.5">
            <Briefcase className="h-3 w-3" /> {worker.experienceYears}y exp
          </span>
          {worker.languages?.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Globe className="h-3 w-3" /> {worker.languages.slice(0, 2).join(', ')}
            </span>
          )}
        </div>

        {/* Why this pro? */}
        <p className="mt-2 text-[11px] text-muted-foreground italic">{cfg.reason}</p>

        {/* Variant-specific metrics */}
        <div className="mt-3 flex flex-wrap gap-2">
          {variant === 'fastest' && (
            <>
              <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> ETA {etaMinutes ?? '—'} min</Badge>
              {distanceKm != null && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {distanceKm} km</Badge>}
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {worker.completedJobs} jobs</Badge>
            </>
          )}
          {variant === 'highest-rated' && (
            <>
              <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {worker.rating.toFixed(1)}</Badge>
              <Badge variant="outline" className="gap-1">{worker.reviewCount} reviews</Badge>
              <Badge className="gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
            </>
          )}
          {variant === 'budget' && (
            <>
              {estimatedPrice != null && (
                <Badge variant="secondary" className="gap-1">{formatCurrency(estimatedPrice)} est.</Badge>
              )}
              {savings != null && savings > 0 && (
                <Badge className="gap-1 bg-success text-white"><Wallet className="h-3 w-3" /> Save {formatCurrency(savings)}</Badge>
              )}
              {distanceKm != null && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {distanceKm} km</Badge>}
            </>
          )}
          {variant === 'recommended' && (
            <>
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {worker.completedJobs} jobs</Badge>
              {worker.isOnline && <Badge className="gap-1 bg-success text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Online</Badge>}
            </>
          )}
        </div>

        {/* Top skills */}
        {topSkills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <span className="text-xs text-muted-foreground">from</span>
            <p className="font-bold font-display">{formatCurrency(worker.hourlyRate)}/hr</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to={`/workers/${worker._id}`}>View Profile</Link>
            </Button>
            <Button asChild size="sm" className="btn-glow gap-1 rounded-full">
              <Link to={`/book?worker=${worker._id}`}>Book Now <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
