import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Star, Wallet, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type AIKind = 'recommended' | 'budget' | 'fastest' | 'highest-rated';

interface AIRecommendationBannerProps {
  kind?: AIKind;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  className?: string;
}

const ICONS: Record<AIKind, React.ReactNode> = {
  recommended: <Sparkles className="h-5 w-5" />,
  budget: <Wallet className="h-5 w-5" />,
  fastest: <Zap className="h-5 w-5" />,
  'highest-rated': <Star className="h-5 w-5" />,
};

const GRADIENTS: Record<AIKind, string> = {
  recommended: 'from-primary/15 to-accent/15',
  budget: 'from-emerald-500/15 to-teal-500/15',
  fastest: 'from-orange-500/15 to-amber-500/15',
  'highest-rated': 'from-rose-500/15 to-pink-500/15',
};

export function AIRecommendationBanner({
  kind = 'recommended',
  title,
  description,
  ctaLabel = 'Explore',
  ctaTo = '/search',
  className,
}: AIRecommendationBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6',
        GRADIENTS[kind],
        className
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl dark:bg-white/5" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card shadow-card">
          {ICONS[kind]}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              AI pick
            </span>
            {kind === 'highest-rated' && <TrendingUp className="h-3.5 w-3.5" />}
          </div>
          <h3 className="font-bold font-display">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <Button asChild size="sm" variant="secondary" className="mt-4 gap-1.5 rounded-full">
            <Link to={ctaTo}>
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
