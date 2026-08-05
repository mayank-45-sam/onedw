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
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link
        to={`/services?category=${category.slug}`}
        className="group flex flex-col items-center gap-3.5 rounded-2xl border border-border/50 bg-card p-5 text-center transition-all duration-300 hover:border-primary/30 hover:bg-primary/3 [box-shadow:0_2px_8px_rgb(15_23_42/0.06)] hover:[box-shadow:0_12px_40px_rgb(15_23_42/0.12),0_4px_16px_rgb(15_23_42/0.08)] sm:p-6"
      >
        {/* Icon container */}
        <div
          className={`relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:scale-105`}
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
            <Icon className="h-9 w-9 text-white drop-shadow-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        </div>

        {/* Text */}
        <div className="min-w-0 w-full">
          <p className="truncate font-bold font-display text-sm group-hover:text-primary transition-colors duration-200">{category.name}</p>
          {typeof category.serviceCount === 'number' && category.serviceCount > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground font-medium">
              {category.serviceCount} service{category.serviceCount !== 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
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

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-primary" />
      </Link>
    </motion.div>
  );
}
