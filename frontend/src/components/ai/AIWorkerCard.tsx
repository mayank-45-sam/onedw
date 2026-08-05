import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Star, MapPin, Clock, Zap, ArrowRight,
  Sparkles, TrendingUp, Wallet, Briefcase, Globe, ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/common/StarRating';
import { formatCurrency, initials } from '@/utils/format';
import { RecommendationReason } from '@/components/ai/RecommendationReason';
import { buildRecommendationReason, workerToSignals } from '@/utils/recommendationReason';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { Worker } from '@/types';

type AIVariant = 'recommended' | 'nearby' | 'budget' | 'fastest' | 'highest-rated';

const VARIANT_CONFIG: Record<
  AIVariant,
  { label: string; icon: React.ReactNode; headerBg: string; badgeBg: string; accentColor: string }
> = {
  recommended: {
    label: 'AI Pick',
    icon: <Sparkles className="h-3 w-3" />,
    headerBg: 'from-blue-500/20 to-violet-500/10',
    badgeBg: 'bg-blue-600',
    accentColor: '#2563eb',
  },
  nearby: {
    label: 'Near You',
    icon: <MapPin className="h-3 w-3" />,
    headerBg: 'from-cyan-500/20 to-teal-400/10',
    badgeBg: 'bg-cyan-600',
    accentColor: '#0891b2',
  },
  budget: {
    label: 'Budget Pick',
    icon: <Wallet className="h-3 w-3" />,
    headerBg: 'from-emerald-500/20 to-green-400/10',
    badgeBg: 'bg-emerald-600',
    accentColor: '#059669',
  },
  fastest: {
    label: 'Fastest',
    icon: <Zap className="h-3 w-3" />,
    headerBg: 'from-amber-500/20 to-orange-400/10',
    badgeBg: 'bg-amber-500',
    accentColor: '#d97706',
  },
  'highest-rated': {
    label: 'Top Rated',
    icon: <TrendingUp className="h-3 w-3" />,
    headerBg: 'from-rose-500/20 to-pink-400/10',
    badgeBg: 'bg-rose-600',
    accentColor: '#e11d48',
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

  const reasonLines = useMemo(() => {
    const options: { distanceKm?: number; etaMinutes?: number; estimatedPrice?: number; savings?: number } = {};
    const dist = distanceKm ?? worker.distanceKm;
    const eta = etaMinutes ?? worker.etaMinutes;
    if (dist != null) options.distanceKm = dist;
    if (eta != null) options.etaMinutes = eta;
    if (estimatedPrice != null) options.estimatedPrice = estimatedPrice;
    if (savings != null) options.savings = savings;
    return buildRecommendationReason(variant, workerToSignals(worker), options);
  }, [worker, variant, distanceKm, etaMinutes, estimatedPrice, savings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300"
    >
      {/* ── Gradient top banner ── */}
      <div className={cn('relative h-16 bg-gradient-to-br', cfg.headerBg)}>
        {/* Variant badge */}
        <span className={cn('absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm', cfg.badgeBg)}>
          {cfg.icon} {cfg.label}
        </span>
        {/* Online dot */}
        {worker.isOnline && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        )}
      </div>

      {/* ── Avatar ── */}
      <div className="-mt-8 flex justify-center">
        <div className="relative">
          <Avatar className="h-16 w-16 border-4 border-white shadow-md">
            <AvatarImage src={worker.avatar} alt={worker.name} />
            <AvatarFallback
              className="text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${cfg.accentColor}, ${cfg.accentColor}99)` }}
            >
              {initials(worker.name)}
            </AvatarFallback>
          </Avatar>
          {worker.isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600">
              <BadgeCheck className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* ── Name + profession ── */}
      <div className="mt-2 px-4 text-center">
        <h3 className="truncate font-bold text-gray-900 font-display text-sm">{worker.name}</h3>
        <p className="text-xs text-gray-500 truncate">{worker.profession}</p>
      </div>

      {/* ── Rating row ── */}
      <div className="mt-2 flex items-center justify-center gap-1">
        <StarRating rating={worker.rating} size={11} showValue reviewCount={worker.reviewCount} />
      </div>

      {/* ── Stats row ── */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-gray-100">
        <div className="flex flex-col items-center bg-gray-50 py-2 px-1">
          <p className="text-xs font-bold text-gray-800">{worker.completedJobs ?? '—'}</p>
          <p className="text-[10px] text-gray-400">Jobs</p>
        </div>
        <div className="flex flex-col items-center bg-gray-50 py-2 px-1">
          <p className="text-xs font-bold text-gray-800">{worker.experienceYears}y</p>
          <p className="text-[10px] text-gray-400">Exp</p>
        </div>
        <div className="flex flex-col items-center bg-gray-50 py-2 px-1">
          <p className="text-xs font-bold" style={{ color: cfg.accentColor }}>{formatCurrency(worker.hourlyRate)}</p>
          <p className="text-[10px] text-gray-400">/hr</p>
        </div>
      </div>

      {/* ── Variant-specific extra badge ── */}
      <div className="mx-4 mt-2 flex flex-wrap justify-center gap-1.5">
        {variant === 'fastest' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Zap className="h-2.5 w-2.5" /> ETA {etaMinutes ?? worker.etaMinutes ?? '—'} min
          </span>
        )}
        {variant === 'budget' && estimatedPrice != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Wallet className="h-2.5 w-2.5" /> {formatCurrency(estimatedPrice)} est.
          </span>
        )}
        {variant === 'budget' && savings != null && savings > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            Save {formatCurrency(savings)}
          </span>
        )}
        {variant === 'highest-rated' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <Star className="h-2.5 w-2.5 fill-rose-500 text-rose-500" /> {worker.reviewCount} reviews
          </span>
        )}
        {variant === 'nearby' && (distanceKm ?? worker.distanceKm) != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
            <MapPin className="h-2.5 w-2.5" /> {(distanceKm ?? worker.distanceKm)!.toFixed(1)} km
          </span>
        )}
      </div>

      {/* ── Why AI picked — collapsed, 2 lines max ── */}
      {reasonLines.length > 0 && (
        <div className="mx-4 mt-3 rounded-xl bg-blue-50/70 border border-blue-100 p-2.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Why AI picked
          </p>
          <div className="text-[11px] text-gray-600 line-clamp-3 leading-snug">
            <RecommendationReason lines={reasonLines} />
          </div>
        </div>
      )}

      {/* ── Footer buttons ── */}
      <div className="mt-auto p-4 pt-3 flex gap-2">
        <Link
          to={`/workers/${worker._id}`}
          className="flex-1 rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          Profile
        </Link>
        {worker._id && (
          <Link
            to={`${ROUTES.booking}?worker=${worker._id}`}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: `linear-gradient(135deg, ${cfg.accentColor}, ${cfg.accentColor}cc)` }}
          >
            Select <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
