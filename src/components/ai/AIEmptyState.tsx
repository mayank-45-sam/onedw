import { motion } from 'framer-motion';
import { Sparkles, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIEmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function AIEmptyState({
  title = 'No recommendations available',
  description = "We're still learning about your preferences. Book a few services and personalized picks will appear here.",
  onRetry,
  className,
}: AIEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-dashed bg-gradient-to-br from-primary/5 to-accent/5 p-8 text-center',
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="relative mt-4 text-lg font-semibold font-display">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="relative mt-5 gap-2 rounded-full">
          <RotateCw className="h-4 w-4" /> Refresh recommendations
        </Button>
      )}
    </motion.div>
  );
}

interface AIErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function AIErrorState({
  title = 'Recommendations unavailable',
  description = 'We hit a snag loading AI suggestions. Please try again.',
  onRetry,
  className,
}: AIErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-error/20 bg-error/5 p-8 text-center',
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-error/10 blur-3xl" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-error/10 text-error">
        <RotateCw className="h-7 w-7" />
      </div>
      <h3 className="relative mt-4 text-lg font-semibold font-display">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" className="relative mt-5 gap-2 rounded-full">
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      )}
    </motion.div>
  );
}
