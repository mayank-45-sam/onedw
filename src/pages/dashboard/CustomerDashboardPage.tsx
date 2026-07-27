import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Wallet, Ticket, Award, Bell, Sparkles, ArrowRight, TrendingUp, Wrench, History,
} from 'lucide-react';
import { bookingService } from '@/services/booking.service';
import { workerService } from '@/services/worker.service';
import { serviceService } from '@/services/service.service';
import { walletService } from '@/services/wallet.service';
import { searchService } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { BookingCard } from '@/components/cards/BookingCard';
import { WorkerCard } from '@/components/cards/WorkerCard';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { AIRecommendationBanner } from '@/components/common/AIRecommendationBanner';
import { SectionHeader } from '@/components/common/SectionHeader';
import { DashboardSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/States';
import { AIServiceCard } from '@/components/ai/AIServiceCard';
import { AIWorkerCard } from '@/components/ai/AIWorkerCard';
import { RecommendationCarousel } from '@/components/ai/RecommendationCarousel';
import { AICardSkeleton } from '@/components/ai/AISkeleton';
import { AIEmptyState, AIErrorState } from '@/components/ai/AIEmptyState';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/format';

export default function CustomerDashboardPage() {
  const upcoming = useQuery({ queryKey: queryKeys.bookings.upcoming, queryFn: () => bookingService.upcoming() });
  const recent = useQuery({ queryKey: queryKeys.bookings.recent, queryFn: () => bookingService.recent() });
  const wallet = useQuery({ queryKey: queryKeys.wallet.detail(), queryFn: () => walletService.detail() });
  const recommendedWorkers = useQuery({ queryKey: queryKeys.workers.recommended({}), queryFn: () => workerService.recommended({}) });
  const recommendedServices = useQuery({ queryKey: queryKeys.services.recommended({}), queryFn: () => serviceService.recommended({}) });
  const recentlyViewed = useQuery({ queryKey: queryKeys.search.recentlyViewed, queryFn: () => searchService.recentlyViewed() });

  const stats = [
    { label: 'Upcoming', value: upcoming.data?.length ?? 0, icon: Calendar, to: ROUTES.booking, color: 'text-primary' },
    { label: 'Wallet', value: formatCurrency(wallet.data?.balance ?? 0), icon: Wallet, to: ROUTES.wallet, color: 'text-success' },
    { label: 'Coupons', value: '3', icon: Ticket, to: ROUTES.coupons, color: 'text-accent' },
    { label: 'Reward pts', value: '1,240', icon: Award, to: ROUTES.offers, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display">Welcome back</h1>
        <p className="text-muted-foreground">Here's what's happening with your bookings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={s.to} className="card-premium card-premium-hover block p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${s.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-bold font-display">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <AIRecommendationBanner
        kind="recommended"
        title="Picked for you"
        description="Based on your booking history, we think you'll love these pros."
        ctaLabel="See more"
        ctaTo={ROUTES.search}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader title="Upcoming bookings" actionLabel="Book new" actionTo={ROUTES.booking} className="mb-4" />
          {upcoming.isLoading ? (
            <DashboardSkeleton />
          ) : !upcoming.data?.length ? (
            <EmptyState
              title="No upcoming bookings"
              description="Book a service to see it here."
              icon={<Calendar className="h-8 w-8" />}
              action={<Button asChild className="rounded-full"><Link to={ROUTES.services}>Browse services</Link></Button>}
            />
          ) : (
            <div className="space-y-4">
              {upcoming.data.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Recent bookings" actionLabel="View all" actionTo={ROUTES.reviews} className="mb-4" />
          {recent.isLoading ? (
            <DashboardSkeleton />
          ) : !recent.data?.length ? (
            <EmptyState title="No recent bookings" description="Demo data loading — your booking history will appear here." icon={<TrendingUp className="h-8 w-8" />} />
          ) : (
            <div className="space-y-4">
              {recent.data.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Recommended workers" subtitle="Pros matched to your needs." actionLabel="Explore" actionTo={ROUTES.search} className="mb-4" />
        {recommendedWorkers.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <DashboardSkeleton key={i} />)}
          </div>
        ) : !recommendedWorkers.data?.length ? (
          <EmptyState title="No recommendations yet" description="Demo data loading — recommendations will appear shortly." icon={<Sparkles className="h-8 w-8" />} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedWorkers.data.slice(0, 4).map((w, i) => <WorkerCard key={w._id} worker={w} index={i} />)}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="Recommended services" subtitle="Services you might need next." actionLabel="View all" actionTo={ROUTES.services} className="mb-4" />
        {recommendedServices.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <DashboardSkeleton key={i} />)}
          </div>
        ) : !recommendedServices.data?.length ? (
          <EmptyState title="No recommendations yet" description="Demo data loading — services will appear shortly." icon={<Wrench className="h-8 w-8" />} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedServices.data.slice(0, 3).map((s, i) => <ServiceCard key={s._id} service={s} index={i} />)}
          </div>
        )}
      </div>

      {/* AI — Continue booking */}
      <div>
        <SectionHeader title="Continue booking" subtitle="Pick up where you left off." actionLabel="Book now" actionTo={ROUTES.booking} className="mb-4" />
        {recent.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
        ) : !recent.data?.length ? (
          <EmptyState title="Nothing to continue" description="Demo data loading — your active bookings will appear here." icon={<Calendar className="h-8 w-8" />} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.data.slice(0, 4).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
          </div>
        )}
      </div>

      {/* AI — Recently viewed */}
      <div>
        <SectionHeader title="Recently viewed" subtitle="Pros and services you've browsed lately." className="mb-4" />
        {recentlyViewed.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
        ) : recentlyViewed.isError ? (
          <AIErrorState onRetry={() => recentlyViewed.refetch()} />
        ) : !recentlyViewed.data?.workers?.length && !recentlyViewed.data?.services?.length ? (
          <AIEmptyState title="Nothing here yet" description="Demo data loading — pros and services you view will appear here." />
        ) : (
          <div className="space-y-6">
            {recentlyViewed.data.workers.length > 0 && (
              <RecommendationCarousel
                items={recentlyViewed.data.workers.slice(0, 6)}
                renderItem={(w, i) => <AIWorkerCard worker={w} variant="recommended" index={i} />}
                itemWidth="min-w-[280px] max-w-[280px]"
              />
            )}
            {recentlyViewed.data.services.length > 0 && (
              <RecommendationCarousel
                items={recentlyViewed.data.services.slice(0, 6)}
                renderItem={(s, i) => <AIServiceCard service={s} index={i} variant="recommended" />}
                itemWidth="min-w-[260px] max-w-[260px]"
              />
            )}
          </div>
        )}
      </div>

      {/* AI — Personalized suggestions */}
      <div>
        <SectionHeader title="Personalized suggestions" subtitle="A mix of pros and services tailored just for you." className="mb-4" />
        {recommendedWorkers.isLoading || recommendedServices.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
        ) : !recommendedWorkers.data?.length && !recommendedServices.data?.length ? (
          <AIEmptyState />
        ) : (
          <RecommendationCarousel
            items={[
              ...(recommendedServices.data ?? []).slice(0, 3).map((s) => ({ kind: 'service' as const, service: s })),
              ...(recommendedWorkers.data ?? []).slice(0, 3).map((w) => ({ kind: 'worker' as const, worker: w })),
            ]}
            renderItem={(item, i) =>
              item.kind === 'service'
                ? <AIServiceCard service={item.service} index={i} variant="recommended" />
                : <AIWorkerCard worker={item.worker} variant="recommended" index={i} />
            }
            itemWidth="min-w-[280px] max-w-[280px]"
          />
        )}
      </div>
    </div>
  );
}
