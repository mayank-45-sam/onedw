import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function StarRating({
  rating,
  size = 16,
  showValue = false,
  reviewCount,
  className,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {stars.map((s) => {
          const filled = s <= Math.round(rating);
          const Tag = interactive ? 'button' : 'span';
          return (
            <Tag
              key={s}
              type={interactive ? 'button' : undefined}
              onClick={interactive ? () => onChange?.(s) : undefined}
              className={cn(
                'inline-flex',
                interactive && 'cursor-pointer transition-transform hover:scale-125',
                !filled && 'text-muted-foreground/40',
                filled && 'text-warning'
              )}
              aria-label={`${s} star${s > 1 ? 's' : ''}`}
            >
              <Star size={size} className={filled ? 'fill-warning' : 'fill-transparent'} />
            </Tag>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
      )}
      {typeof reviewCount === 'number' && (
        <span className="text-xs text-muted-foreground">({reviewCount})</span>
      )}
    </div>
  );
}
