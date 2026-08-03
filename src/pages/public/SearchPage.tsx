import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Wrench, Users, Zap, Star, Wallet, Sparkles, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { serviceService } from '@/services/service.service';
import { workerService } from '@/services/worker.service';
import { searchService } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { WorkerCard } from '@/components/cards/WorkerCard';
import { ServiceCardSkeleton, WorkerCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { AIRecommendationBanner } from '@/components/common/AIRecommendationBanner';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AutocompleteSearch } from '@/components/ai/AutocompleteSearch';
import { VoiceSearchButton } from '@/components/ai/VoiceSearchButton';
import { BudgetWorkerCard } from '@/components/ai/BudgetWorkerCard';
import { FastestWorkerCard } from '@/components/ai/FastestWorkerCard';
import { HighestRatedWorkerCard } from '@/components/ai/HighestRatedWorkerCard';
import { AICardSkeleton } from '@/components/ai/AISkeleton';
import { AIEmptyState, AIErrorState } from '@/components/ai/AIEmptyState';
import type { Worker } from '@/types';
import { MOCK_WORKERS } from '@/utils/mockWorkers';

const RECENT_KEY = 'onedw_recent_searches';
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function deriveFallbackWorker(
  workers: Worker[] | undefined,
  sortFn: (a: Worker, b: Worker) => number,
  mockFallback: Worker,
): Worker {
  if (workers && workers.length > 0) {
    const sorted = [...workers].sort(sortFn);
    return sorted[0];
  }
  return mockFallback;
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const location = params.get('location') ?? '';

  const setQuery = (term: string) => {
    const next = new URLSearchParams(params);
    if (term) next.set('q', term);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.all({ search: q, limit: 12 }),
    queryFn: () => serviceService.list({ search: q, limit: 12 }),
    enabled: q.length > 0,
  });
  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all({ search: q, limit: 8 }),
    queryFn: () => workerService.list({ search: q, limit: 8 }),
    enabled: q.length > 0,
  });

  // AI: popular searches (always loaded for the landing state)
  const popularQuery = useQuery({
    queryKey: queryKeys.search.popular,
    queryFn: () => searchService.popular(),
    staleTime: 5 * 60_000,
  });

  // AI: aggregate search results with recommendations when a query is active
  const aiSearchQuery = useQuery({
    queryKey: queryKeys.search.query({ q, location }),
    queryFn: () => searchService.search({ q, location, limit: 12 }),
    enabled: q.length > 0,
  });

  const recent = loadRecent();
  const recommendedFilters = aiSearchQuery.data?.recommendedFilters ?? [];

  const allWorkers = workersQuery.data?.data;

  console.log('All workers:', allWorkers);
  console.log('AI picks:', {
    budgetWorker: aiSearchQuery.data?.budgetWorker,
    fastestWorker: aiSearchQuery.data?.fastestWorker,
    highestRatedWorker: aiSearchQuery.data?.highestRatedWorker,
  });

  const budgetWorker = aiSearchQuery.data?.budgetWorker
    ?? deriveFallbackWorker(allWorkers, (a, b) => a.hourlyRate - b.hourlyRate, MOCK_WORKERS[0]);

  const fastestWorker = aiSearchQuery.data?.fastestWorker
    ?? deriveFallbackWorker(allWorkers, (a, b) => (b.completedJobs ?? 0) - (a.completedJobs ?? 0), MOCK_WORKERS[1]);

  const highestRatedWorker = aiSearchQuery.data?.highestRatedWorker
    ?? deriveFallbackWorker(allWorkers, (a, b) => (b.rating ?? 0) - (a.rating ?? 0), MOCK_WORKERS[2]);

  return (
    <div className="container py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold font-display md:text-3xl">
          {q ? <>Results for "<span className="gradient-text">{q}</span>"</> : 'Search services & pros'}
        </h1>
        {location && <p className="mt-1 text-muted-foreground">in {location}</p>}
      </motion.div>

      {/* AI SEARCH BAR with autocomplete + voice */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <AutocompleteSearch
          value={q}
          onChange={setQuery}
          onSelect={(s) => setQuery(s.text)}
          autoFocus
          className="flex-1"
        />
        <VoiceSearchButton onResult={setQuery} />
      </div>

      {!q ? (
        <div className="space-y-10">
          {/* Recent + Popular searches */}
          <div className="grid gap-8 lg:grid-cols-2">
            {recent.length > 0 && (
              <div>
                <SectionHeader title="Recent searches" className="mb-4" />
                <div className="flex flex-wrap gap-2">
                  {recent.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <SectionHeader title="Popular searches" subtitle="What everyone's booking right now." className="mb-4" />
              {popularQuery.isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 w-28 rounded-full shimmer" />)}
                </div>
              ) : popularQuery.data?.length ? (
                <div className="flex flex-wrap gap-2">
                  {popularQuery.data.map((p) => (
                    <button
                      key={p.term}
                      onClick={() => setQuery(p.term)}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm transition hover:border-primary hover:bg-primary/5"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-accent" /> {p.term}
                      <span className="text-xs text-muted-foreground">{p.count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Popular searches will appear here.</p>
              )}
            </div>
          </div>

          <EmptyState
            title="Start searching"
            description="Use the search bar above to find services, categories, and verified pros near you."
            icon={<SearchIcon className="h-8 w-8" />}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {/* AI Suggestions + Recommended Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <AIRecommendationBanner kind="fastest" title="Fastest available" description="Pros who can reach you the soonest." ctaTo="/search" />
            <AIRecommendationBanner kind="highest-rated" title="Highest rated" description="Top-rated pros matching your search." ctaTo="/search" />
            <AIRecommendationBanner kind="budget" title="Budget-friendly" description="Quality services that fit your wallet." ctaTo="/offers" />
          </div>

          {/* Recommended filters */}
          {recommendedFilters.length > 0 && (
            <div className="card-premium p-5">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI suggested filters
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setQuery(f.value)}
                    className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs transition hover:border-primary hover:bg-primary/5"
                  >
                    {f.label}
                    {f.count != null && <span className="text-muted-foreground">({f.count})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Nearby Workers — budget / fastest / highest rated */}
          <div>
            <SectionHeader title="AI worker recommendations" subtitle="Smart picks based on your search." className="mb-4" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {aiSearchQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <AICardSkeleton key={i} />)
              ) : (
                <>
                  {budgetWorker ? (
                    <BudgetWorkerCard worker={budgetWorker} estimatedPrice={budgetWorker.hourlyRate} index={0} />
                  ) : (
                    <AIEmptyState title="No budget pick" description="No budget worker match for this search." className="h-full" />
                  )}
                  {fastestWorker ? (
                    <FastestWorkerCard worker={fastestWorker} index={1} />
                  ) : (
                    <AIEmptyState title="No fast pick" description="No fastest worker match for this search." className="h-full" />
                  )}
                  {highestRatedWorker ? (
                    <HighestRatedWorkerCard worker={highestRatedWorker} index={2} />
                  ) : (
                    <AIEmptyState title="No top-rated pick" description="No top-rated worker match for this search." className="h-full" />
                  )}
                </>
              )}
            </div>
          </div>

          <Tabs defaultValue="services">
            <TabsList>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="workers">Professionals</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="mt-6">
              {servicesQuery.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
                </div>
              ) : servicesQuery.isError ? (
                <ErrorState title="Search failed" description="Please try again." icon={<Wrench className="h-8 w-8" />} />
              ) : !servicesQuery.data?.data?.length ? (
                <EmptyState title="No services found" description={`No services match "${q}". Try another term.`} icon={<Wrench className="h-8 w-8" />} />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {servicesQuery.data.data.map((s, i) => <ServiceCard key={s._id} service={s} index={i} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="workers" className="mt-6">
              {workersQuery.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
                </div>
              ) : workersQuery.isError ? (
                <ErrorState title="Search failed" description="Please try again." icon={<Users className="h-8 w-8" />} />
              ) : !workersQuery.data?.data?.length ? (
                <EmptyState title="No pros found" description={`No professionals match "${q}". Try another term.`} icon={<Users className="h-8 w-8" />} />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {workersQuery.data.data.map((w, i) => <WorkerCard key={w._id} worker={w} index={i} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
