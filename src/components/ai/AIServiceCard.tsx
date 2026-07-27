import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Clock, Star, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Service } from '@/types';

interface AIServiceCardProps {
  service: Service;
  index?: number;
  variant?: 'recommended' | 'trending' | 'alsoBooked' | 'together';
  onToggleFavorite?: (id: string) => void;
}

const VARIANT_LABEL: Record<NonNullable<AIServiceCardProps['variant']>, { label: string; icon: React.ReactNode; className: string }> = {
  recommended: { label: 'AI pick', icon: <Sparkles className="h-3 w-3" />, className: 'bg-primary text-primary-foreground' },
  trending: { label: 'Trending', icon: <TrendingUp className="h-3 w-3" />, className: 'bg-accent text-accent-foreground' },
  alsoBooked: { label: 'People also booked', icon: <TrendingUp className="h-3 w-3" />, className: 'bg-foreground text-background' },
  together: { label: 'Frequently booked together', icon: <Sparkles className="h-3 w-3" />, className: 'bg-success text-white' },
};

export function AIServiceCard({ service, index = 0, variant = 'recommended', onToggleFavorite }: AIServiceCardProps) {
  const [fav, setFav] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const v = VARIANT_LABEL[variant];

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [service.image]);

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    setFav((p) => !p);
    onToggleFavorite?.(service._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link
        to={`/book?service=${service._id}`}
        className="card-premium card-premium-hover group flex h-full flex-col overflow-hidden p-0"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {service.image && !imgError ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 shimmer" />}
              <img src={service.image} alt={service.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className={cn('gap-1', v.className)}>{v.icon} {v.label}</Badge>
          </div>
          <button
            onClick={handleFav}
            aria-label="Favorite"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground backdrop-blur transition hover:scale-110 dark:bg-black/40"
          >
            <Heart className={cn('h-4 w-4', fav && 'fill-error text-error')} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-1 font-semibold font-display">{service.name}</h3>
          <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{service.description}</p>

          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {service.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">starting at</span>
              <p className="font-bold font-display text-lg">{formatCurrency(service.basePrice)}</p>
            </div>
            <Button size="sm" className="btn-glow gap-1 rounded-full">
              Book <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
