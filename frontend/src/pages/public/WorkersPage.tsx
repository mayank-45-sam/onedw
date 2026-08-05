import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Users } from 'lucide-react';
import { workerService, type WorkerQuery } from '@/services/worker.service';
import { queryKeys } from '@/lib/queryClient';
import { WorkerCard } from '@/components/cards/WorkerCard';
import { WorkerCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LIMIT = 12;

export default function WorkersPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<WorkerQuery['sort']>('rating');
  const [searchInput, setSearchInput] = useState('');

  const query: WorkerQuery = { page, limit: LIMIT, sort, search: search || undefined };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.workers.all(query as Record<string, unknown>),
    queryFn: () => workerService.list(query),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      {/* header */}
      <section className="border-b bg-muted/30 py-10">
        <div className="container">
          <h1 className="text-3xl font-extrabold font-display">Find a Pro</h1>
          <p className="mt-1 text-muted-foreground">
            Browse {data?.total ?? ''} verified professionals ready to help.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, skill, or profession…"
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} className="btn-glow gap-2 rounded-full shrink-0">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Select
              value={sort}
              onValueChange={(v) => { setSort(v as WorkerQuery['sort']); setPage(1); }}
            >
              <SelectTrigger className="w-44 rounded-full">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top rated</SelectItem>
                <SelectItem value="completed">Most jobs</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="price">Lowest price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* grid */}
      <section className="container py-10">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load workers"
            description="Please try again in a moment."
            icon={<Users className="h-8 w-8" />}
          />
        ) : !data?.data?.length ? (
          <EmptyState
            title="No workers found"
            description="Try a different search term or filter."
            icon={<Users className="h-8 w-8" />}
            action={
              <Button variant="outline" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {data.total} professional{data.total !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.data.map((w, i) => (
                <motion.div
                  key={w._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <WorkerCard worker={w} index={i} />
                </motion.div>
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
      </section>
    </div>
  );
}
