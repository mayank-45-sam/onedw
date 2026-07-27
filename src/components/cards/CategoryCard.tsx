import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Star } from 'lucide-react';
import type { Category } from '@/types';
import { CATEGORY_ICONS, CATEGORY_GRADIENTS } from '@/constants/categoryIcons';

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const slug = category.slug;
  const Icon = CATEGORY_ICONS[slug] ?? CATEGORY_ICONS.default;
  const gradient = CATEGORY_GRADIENTS[slug] ?? 'from-gray-400 to-gray-500';

  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(category.image) && !imageError;

  const professionalCount = (category as unknown as Record<string, unknown>).professionalCount as number | undefined;
  const avgRating = (category as unknown as Record<string, unknown>).avgRating as number | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link
        to={`/services?category=${category.slug}`}
        className="group flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-5 text-center shadow-card transition-all duration-300 hover:border-border hover:shadow-card-hover hover:bg-accent/30 sm:p-6"
      >
        <div
          className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-all duration-300 group-hover:shadow-xl`}
        >
          {hasImage ? (
            <img
              src={category.image}
              alt={category.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
          ) : (
            <Icon className="h-10 w-10 text-white drop-shadow-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
        </div>

        <div className="min-w-0 w-full">
          <p className="truncate font-semibold font-display text-sm">{category.name}</p>
          {typeof category.serviceCount === 'number' && category.serviceCount > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {category.serviceCount} service{category.serviceCount !== 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-1 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
            {typeof professionalCount === 'number' && professionalCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3" /> {professionalCount} pros
              </span>
            )}
            {typeof avgRating === 'number' && avgRating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-warning text-warning" /> {avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
      </Link>
    </motion.div>
  );
}
