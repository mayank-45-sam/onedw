import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecommendationCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth?: string;
  className?: string;
}

export function RecommendationCarousel<T>({
  items,
  renderItem,
  itemWidth = 'min-w-[300px] max-w-[300px]',
  className,
}: RecommendationCarouselProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
            className={cn('snap-start shrink-0', itemWidth)}
          >
            {renderItem(item, i)}
          </motion.div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

      <div className="mt-4 flex justify-center gap-2 md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => scrollBy(1)}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
