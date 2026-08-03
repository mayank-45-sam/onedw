import { motion } from 'framer-motion';
import { Sparkles, Camera, Cpu } from 'lucide-react';

const steps = [
  { icon: Camera, label: 'Analyzing image...' },
  { icon: Cpu, label: 'Detecting problem...' },
  { icon: Sparkles, label: 'Generating estimate...' },
];

export function ImageRepairLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="h-10 w-10 text-white" />
        </motion.div>
      </div>

      <motion.h3
        className="mt-6 text-xl font-bold font-display"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        AI is analyzing your image
      </motion.h3>

      <div className="mt-8 space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.8 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.8 }}
            >
              <step.icon className="h-5 w-5 text-primary" />
            </motion.div>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, delay: i * 0.8, ease: 'easeInOut' }}
              />
            </div>
            <span className="min-w-[160px] text-sm text-muted-foreground">{step.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
