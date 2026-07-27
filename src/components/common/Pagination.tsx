import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon"
            className={cn('h-9 w-9 rounded-xl', p === page && 'btn-glow')}
            onClick={() => onPageChange(p as number)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-xl"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const delta = 1;
  const left  = current - delta;
  const right = current + delta;

  const pages: (number | '…')[] = [];

  if (left > 2)  { pages.push(1); pages.push('…'); }
  else           { for (let i = 1; i < left; i++) pages.push(i); }

  for (let i = Math.max(1, left); i <= Math.min(total, right); i++) pages.push(i);

  if (right < total - 1) { pages.push('…'); pages.push(total); }
  else                   { for (let i = right + 1; i <= total; i++) pages.push(i); }

  return pages;
}
