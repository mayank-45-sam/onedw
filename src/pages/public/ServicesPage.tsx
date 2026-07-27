import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Search, Wrench, Sparkles } from 'lucide-react';
import { serviceService } from '@/services/service.service';
import { categoryService } from '@/services/category.service';
import { searchService } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { ServiceCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AIServiceCard } from '@/components/ai/AIServiceCard';
import { RecommendationCarousel } from '@/components/ai/RecommendationCarousel';
import { AIEmptyState, AIErrorState } from '@/components/ai/AIEmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const LIMIT = 12;

export default function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const category = params.get('category') ?? undefined;
  const search = params.get('q') ?? '';
  const sort = (params.get('sort') as 'price-asc' | 'price-desc' | 'rating' | 'popular' | null) ?? 'popular';
  const [searchInput, setSearchInput] = useState(search);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.list(),
    refetchOnMount: 'always',
    retry: 2,
    staleTime: 30 * 1000,
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.all({ category, search, sort, page, limit: LIMIT }),
    queryFn: () => serviceService.list({ category, search, sort, limit: LIMIT, page }),
  });

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const activeCat = useMemo(
    () => categories?.find((c) => c.slug === category),
    [categories, category],
  );

  const totalPages = servicesQuery.data
    ? Math.ceil(servicesQuery.data.total / LIMIT)
    : 1;

  return (
    <div className="container py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold font-display md:text-4xl">
          {activeCat ? activeCat.name : 'All services'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {activeCat?.description ?? 'Browse trusted services and book a verified pro in minutes.'}
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters sidebar */}
        <aside className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold font-display">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateParam('q', searchInput || undefined)}
                  placeholder="Search services…"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('category', undefined)}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-sm transition',
                    !category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  All categories
                </button>
                {categories?.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => updateParam('category', c.slug)}
                    className={cn(
                      'block w-full rounded-lg px-3 py-2 text-left text-sm transition',
                      category === c.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sort} onValueChange={(v) => updateParam('sort', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most popular</SelectItem>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </aside>

        {/* Results */}
        <div>
          {servicesQuery.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
            </div>
          ) : servicesQuery.isError ? (
            <ErrorState
              title="Couldn't load services"
              description="Please try again in a moment."
              icon={<Wrench className="h-8 w-8" />}
            />
          ) : !servicesQuery.data?.data?.length ? (
            <EmptyState
              title="No services found"
              description="Try adjusting your filters or search term."
              icon={<Search className="h-8 w-8" />}
              action={
                <Button onClick={() => { setParams(new URLSearchParams(), { replace: true }); setPage(1); }}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {servicesQuery.data.total} service{servicesQuery.data.total !== 1 ? 's' : ''} found
              </p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {servicesQuery.data.data.map((s, i) => (
                  <ServiceCard key={s._id} service={s} index={i} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="mt-10"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
