import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium',
          'ring-offset-background placeholder:text-muted-foreground/70',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0 focus-visible:border-primary',
          'hover:border-primary/40',
          'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          '[box-shadow:0_1px_3px_rgb(15_23_42/0.06)]',
          'focus-visible:[box-shadow:0_0_0_3px_hsl(var(--primary)/0.12),0_1px_3px_rgb(15_23_42/0.06)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
