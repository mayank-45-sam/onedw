import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

export function TypingIndicator({ name, className }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center gap-2', className)}
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border bg-card px-3 py-2">
        <TypingDots className="text-muted-foreground" />
      </div>
      {name && <span className="text-xs text-muted-foreground">{name} is typing…</span>}
    </motion.div>
  );
}
