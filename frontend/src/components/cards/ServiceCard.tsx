import { Heart, Clock, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration } from '@/utils/format';
import { getServiceImage } from '@/utils/serviceImages';
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

  const primaryImage = service.image;
  const fallbackImage = getServiceImage(service);
  const displayImage = primaryImage && !imgError ? primaryImage : fallbackImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full"
    >
      <Link
        to={`/book?service=${service._id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1.5 [box-shadow:0_2px_8px_rgb(15_23_42/0.06),0_1px_3px_rgb(15_23_42/0.08)] hover:[box-shadow:0_20px_60px_rgb(15_23_42/0.14),0_8px_24px_rgb(15_23_42/0.08)]"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {!imgLoaded && <div className="absolute inset-0 shimmer" />}
          <img
            src={displayImage}
            alt={service.name}
            className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-107 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              if (!imgError) {
                setImgError(true);
              } else {
                setImgLoaded(true);
              }
            }}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {service.popular && (
              <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                <Zap className="h-3 w-3" /> Popular
              </span>
            )}
            {service.trending && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                Trending
              </span>
            )}
          </div>

          {/* Fav button */}
          <button
            onClick={handleFav}
            aria-label="Favorite"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition-all duration-200 hover:scale-110 hover:bg-white active:scale-95 dark:bg-black/50"
          >
            <Heart className={`h-4 w-4 transition-colors ${fav ? 'fill-error text-error' : 'text-muted-foreground'}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-bold font-display text-base line-clamp-1 group-hover:text-primary transition-colors duration-200">
            {service.name}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">{service.description}</p>

          {/* Meta */}
          <div className="mt-3.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-foreground font-semibold">{service.rating.toFixed(1)}</span>
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration)}
            </span>
            {typeof service.reviewCount === 'number' && (
              <>
                <span className="h-3 w-px bg-border" />
                <span>{service.reviewCount} reviews</span>
              </>
            )}
          </div>

          {/* Price + CTA */}
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/50">
            <div>
              <span className="text-xs text-muted-foreground">Starting at</span>
              <p className="font-extrabold font-display text-xl text-foreground">{formatCurrency(service.basePrice)}</p>
            </div>
            <Button size="sm" className="btn-glow rounded-full bg-brand-gradient text-white shadow-card text-xs px-4">
              Book Now
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
