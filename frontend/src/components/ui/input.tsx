import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium',
          'ring-offset-background placeholder:text-muted-foreground/70',
          'transition-all duration-200',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 focus-visible:border-primary',
          'hover:border-primary/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[box-shadow:0_1px_3px_rgb(15_23_42/0.06),0_1px_2px_rgb(15_23_42/0.04)]',
          'focus-visible:[box-shadow:0_0_0_3px_hsl(var(--primary)/0.12),0_1px_3px_rgb(15_23_42/0.06)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
