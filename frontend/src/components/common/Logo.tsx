import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import onedwLogo from '@/assets/onedw-logo.jpg';

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.img
        src={onedwLogo}
        alt="OneDW"
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="h-12 w-auto rounded-md object-contain md:h-14"
      />
      {showText && (
        <span className="text-xl font-extrabold tracking-tight font-display">
          One<span className="gradient-text">DW</span>
        </span>
      )}
    </div>
  );
}
