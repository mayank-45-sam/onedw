import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { categoryService } from '@/services/category.service';
import { queryKeys } from '@/lib/queryClient';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { CategoryCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState, ErrorState } from '@/components/common/States';

export default function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.list(),
    refetchOnMount: 'always',
    retry: 2,
    staleTime: 30 * 1000,
  });

  return (
    <div className="container py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold font-display md:text-4xl">Service categories</h1>
        <p className="mt-2 text-muted-foreground">Find the right pro for any job — explore our full range of categories.</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load categories"
          description="Please try again in a moment."
          icon={<LayoutGrid className="h-8 w-8" />}
          action={
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Retry
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState title="No categories yet" description="Categories will appear here once available." icon={<LayoutGrid className="h-8 w-8" />} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((c, i) => <CategoryCard key={c._id} category={c} index={i} />)}
        </div>
      )}
    </div>
  );
}
