import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Wrench, Star } from 'lucide-react';
import { categoryService } from '@/services/category.service';
import { queryKeys } from '@/lib/queryClient';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { ServiceCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/constants/routes';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

const LIMIT = 12;

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const categoryQuery = useQuery({
    queryKey: [...queryKeys.categories.detail(slug!), 'slug'],
    queryFn: () => categoryService.bySlug(slug!),
    enabled: !!slug,
  });

  const servicesQuery = useQuery({
    queryKey: ['categories', 'services', slug, { page, limit: LIMIT }],
    queryFn: () => categoryService.services(slug!, { page, limit: LIMIT }),
    enabled: !!slug,
  });

  if (categoryQuery.isLoading) return <LoadingState className="min-h-[60vh]" />;
  if (categoryQuery.isError) return (
    <ErrorState
      className="min-h-[60vh]"
      title="Category not found"
      icon={<Star className="h-8 w-8" />}
      action={<Button asChild variant="outline"><Link to={ROUTES.categories}>Back to categories</Link></Button>}
    />
  );

  const category = categoryQuery.data;
  const totalPages = servicesQuery.data
    ? Math.ceil(servicesQuery.data.total / LIMIT)
    : 1;

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b bg-muted/30 py-12">
        {category?.image && (
          <img
            src={category.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-10"
          />
        )}
        <div className="container relative">
          <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5 rounded-full">
            <Link to={ROUTES.categories}>
              <ArrowLeft className="h-4 w-4" /> All categories
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {category?.slug && CATEGORY_ICONS[category.slug] && (() => {
              const Icon = CATEGORY_ICONS[category.slug];
              return (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              );
            })()}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold font-display">{category?.name}</h1>
                {category?.serviceCount !== undefined && (
                  <Badge variant="secondary">{category.serviceCount} services</Badge>
                )}
              </div>
              {category?.description && (
                <p className="mt-1 max-w-xl text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* services grid */}
      <section className="container py-10">
        {servicesQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
          </div>
        ) : servicesQuery.isError ? (
          <ErrorState
            title="Couldn't load services"
            description="Please try again."
            icon={<Wrench className="h-8 w-8" />}
          />
        ) : !servicesQuery.data?.data?.length ? (
          <EmptyState
            title="No services yet"
            description="Services in this category will appear here once available."
            icon={<Wrench className="h-8 w-8" />}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {servicesQuery.data.total} service{servicesQuery.data.total !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {servicesQuery.data.data.map((s, i) => (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ServiceCard service={s} index={i} />
                </motion.div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-10"
            />
          </>
        )}
      </section>
    </div>
  );
}
