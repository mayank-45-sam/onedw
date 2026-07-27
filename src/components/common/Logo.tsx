import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow"
      >
        <Sparkles className="h-5 w-5" />
      </motion.div>
      {showText && (
        <span className="text-xl font-extrabold tracking-tight font-display">
          One<span className="gradient-text">DW</span>
        </span>
      )}
    </div>
  );
}
