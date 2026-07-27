import { Heart, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration } from '@/utils/format';
import type { Service } from '@/types';

interface ServiceCardProps {
  service: Service;
  index?: number;
  onToggleFavorite?: (id: string) => void;
}

export function ServiceCard({ service, index = 0, onToggleFavorite }: ServiceCardProps) {
  const [fav, setFav] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

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
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/book?service=${service._id}`}
        className="card-premium card-premium-hover group flex h-full flex-col overflow-hidden p-0"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {service.image && !imgError ? (
            <>
              {!imgLoaded && <div className="absolute inset-0 shimmer" />}
              <img
                src={service.image}
                alt={service.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            {service.popular && <Badge className="bg-primary text-primary-foreground">Popular</Badge>}
            {service.trending && <Badge className="bg-accent text-accent-foreground">Trending</Badge>}
          </div>
          <button
            onClick={handleFav}
            aria-label="Favorite"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground backdrop-blur transition hover:scale-110 dark:bg-black/40"
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-error text-error' : ''}`} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-semibold font-display line-clamp-1">{service.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">{service.description}</p>

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
            <Button size="sm" className="btn-glow rounded-full">
              Book now
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
