import { cn } from '@/lib/utils';

export function AICardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card-premium overflow-hidden p-0', className)} aria-hidden>
      <div className="relative h-24 shimmer" />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full shimmer" />
          <div className="h-6 w-20 rounded-full shimmer" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-7 w-20 rounded shimmer" />
          <div className="h-9 w-24 rounded-full shimmer" />
        </div>
      </div>
    </div>
  );
}

export function AIBannerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border bg-muted/40 p-6', className)} aria-hidden>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-20 rounded-full shimmer" />
          <div className="h-5 w-3/4 rounded shimmer" />
          <div className="h-4 w-full rounded shimmer" />
          <div className="h-9 w-28 rounded-full shimmer" />
        </div>
      </div>
    </div>
  );
}

export function AIListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-5', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => <AICardSkeleton key={i} />)}
    </div>
  );
}

export function AIInlineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      <div className="h-4 w-1/3 rounded shimmer" />
      <div className="h-20 w-full rounded-2xl shimmer" />
    </div>
  );
}
