import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationReasonProps {
  lines: string[];
  className?: string;
}

export function RecommendationReason({ lines, className }: RecommendationReasonProps) {
  if (!lines.length) return null;
  return (
    <div className={cn('mt-3 rounded-lg border border-primary/10 bg-primary/5 p-2.5', className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
        Why this worker?
      </p>
      <ul className="mt-1 space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="text-[11px] leading-snug text-muted-foreground">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
