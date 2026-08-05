import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, actionLabel, actionTo, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
      >
        <h2 className="text-2xl font-bold font-display md:text-3xl tracking-tight">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 text-muted-foreground leading-relaxed max-w-2xl">{subtitle}</p>
        )}
      </motion.div>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="group flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary hover:bg-primary/5 whitespace-nowrap"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
