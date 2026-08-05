import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, BadgeCheck, Star, ArrowRight, Download,
  Sparkles, Wrench, Smartphone, Apple, Users, Wallet, Zap, TrendingUp, MapPin,
  Camera, UserCheck, Heart, CheckCircle2,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ServiceCard } from '@/components/cards/ServiceCard';
import { WorkerCard } from '@/components/cards/WorkerCard';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { AIRecommendationBanner } from '@/components/common/AIRecommendationBanner';
import { ImageRepairCard } from '@/components/ai/ImageRepairCard';
import { AIWorkerCard } from '@/components/ai/AIWorkerCard';
import { AIServiceCard } from '@/components/ai/AIServiceCard';
import { RecommendationCarousel } from '@/components/ai/RecommendationCarousel';
import { AICardSkeleton } from '@/components/ai/AISkeleton';
import { AIEmptyState, AIErrorState } from '@/components/ai/AIEmptyState';
import { buildRecommendationReason, workerToSignals } from '@/utils/recommendationReason';
import { StarRating } from '@/components/common/StarRating';
import {
  ServiceCardSkeleton, WorkerCardSkeleton, CategoryCardSkeleton,
} from '@/components/common/Skeletons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { EmergencyBookingButton } from '@/components/booking/EmergencyBookingButton';
import { InstantBookingBadge } from '@/components/booking/InstantBookingBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { serviceService } from '@/services/service.service';
import { workerService } from '@/services/worker.service';
import { categoryService } from '@/services/category.service';
import { reviewService } from '@/services/review.service';
import { queryKeys } from '@/lib/queryClient';
import { HOW_IT_WORKS_STEPS, HOMEPAGE_STATS, TRUST_BADGES, APP_NAME } from '@/constants/app';
import { ROUTES } from '@/constants/routes';

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, Camera, UserCheck, MapPin,
};

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, BadgeCheck, CheckCircle2, Star,
};

export default function LandingPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 10 * 60_000 },
    );
  }, []);

  const categories = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.list(),
    refetchOnMount: 'always',
    retry: 2,
    staleTime: 30 * 1000,
  });
  const popularServices = useQuery({
    queryKey: queryKeys.services.all({ sort: 'popular', limit: 6 }),
    queryFn: () => serviceService.list({ sort: 'popular', limit: 6 }),
  });
  const trendingWorkers = useQuery({ queryKey: queryKeys.workers.trending, queryFn: () => workerService.trending() });
  const nearbyWorkers = useQuery({
    queryKey: queryKeys.workers.nearby(coords?.lat ?? 0, coords?.lng ?? 0),
    queryFn: () => workerService.nearby(coords!.lat, coords!.lng, 10, 20),
    enabled: !!coords,
  });
  const reviews = useQuery({
    queryKey: queryKeys.reviews.all({ limit: 4 }),
    queryFn: () => reviewService.list({ limit: 4 }),
    retry: 2,
    staleTime: 30 * 1000,
  });

  const recommendedServices = useQuery({
    queryKey: queryKeys.services.recommended({}),
    queryFn: () => serviceService.recommended({}),
  });
  const recommendedWorkers = useQuery({
    queryKey: queryKeys.workers.recommended({}),
    queryFn: () => workerService.recommended({}),
  });
  const trendingServices = useQuery({
    queryKey: queryKeys.services.all({ sort: 'rating', limit: 8 }),
    queryFn: () => serviceService.list({ sort: 'rating', limit: 8 }),
  });
  const bestRatedWorkers = useQuery({
    queryKey: queryKeys.workers.all({ sort: 'rating', limit: 8 }),
    queryFn: () => workerService.list({ sort: 'rating', limit: 8 }),
  });
  const fastBookingWorkers = useQuery({
    queryKey: queryKeys.workers.fastest({ limit: 8 }),
    queryFn: () => workerService.fastest({ limit: 8 }),
  });
  const budgetFriendlyWorkers = useQuery({
    queryKey: queryKeys.workers.all({ sort: 'price', limit: 8 }),
    queryFn: () => workerService.list({ sort: 'price', limit: 8 }),
  });

  const nearYouWorkers = coords ? nearbyWorkers : trendingWorkers;
  const firstPopularService = popularServices.data?.data?.[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute right-10 top-40 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="container relative py-20 md:py-28 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" /> AI-powered service matching
            </span>
            <h1 className="mt-6 text-4xl font-extrabold font-display leading-[1.1] md:text-6xl lg:text-7xl">
              Home services, <span className="gradient-text">booked in minutes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {APP_NAME} connects you with verified local pros for cleaning, repairs, beauty, and more — with transparent pricing and real-time tracking.
            </p>
            <div className="mt-8 flex justify-center">
              <SearchBar />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {TRUST_BADGES.map((badge) => (
                <span key={badge} className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-success" /> {badge}
                </span>
              ))}
            </div>

            {firstPopularService && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10 flex justify-center"
              >
                <EmergencyBookingButton
                  service={firstPopularService}
                  onBookingComplete={() => window.location.reload()}
                />
              </motion.div>
            )}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Need it now? Tap Emergency Booking and a verified pro will be assigned within minutes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-16 md:py-20">
        <SectionHeader
          title="Browse by category"
          subtitle="Pick a category to explore trusted services near you."
          actionLabel="View all"
          actionTo={ROUTES.categories}
        />
        <div className="mt-8">
          {categories.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
            </div>
          ) : categories.isError ? (
            <ErrorState title="Couldn't load categories" description="Please check your connection and try again." icon={<Search className="h-8 w-8" />} />
          ) : !categories.data?.length ? (
            <EmptyState title="No categories yet" description="Categories will appear here once available." icon={<Search className="h-8 w-8" />} />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.data.slice(0, 6).map((c, i) => <CategoryCard key={c._id} category={c} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* AI IMAGE REPAIR ESTIMATION */}
      <section className="container py-16 md:py-20">
        <ImageRepairCard />
      </section>

      {/* POPULAR SERVICES */}
      <section className="container py-16 md:py-20">
        <SectionHeader
          title="Popular services"
          subtitle="Most-booked services this week, loved by our customers."
          actionLabel="Explore all"
          actionTo={ROUTES.services}
        />
        <div className="mt-8">
          {popularServices.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
            </div>
          ) : popularServices.isError ? (
            <ErrorState title="Couldn't load services" description="Please try again in a moment." icon={<Wrench className="h-8 w-8" />} />
          ) : !popularServices.data?.data?.length ? (
            <EmptyState title="No services yet" description="Services will appear here once available." icon={<Wrench className="h-8 w-8" />} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popularServices.data.data.map((s, i) => <ServiceCard key={s._id} service={s} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* AI RECOMMENDATION BANNER */}
      <section className="container py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <AIRecommendationBanner
            kind="recommended"
            title="Recommended for you"
            description="Based on your past bookings, we think you'll love these services."
            ctaLabel="See picks"
            ctaTo="/search"
          />
          <AIRecommendationBanner
            kind="budget"
            title="Best on a budget"
            description="Top-rated services that fit your wallet, without compromising quality."
            ctaLabel="View deals"
            ctaTo="/offers"
          />
        </div>
      </section>

      {/* AI EXPERIENCE — Recommended Services + Workers */}
      <section className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader
              title="Recommended services"
              subtitle="AI-picked services tailored to what you book most."
              actionLabel="Browse all"
              actionTo={ROUTES.services}
            />
            <div className="mt-6">
              {recommendedServices.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <ServiceCardSkeleton key={i} />)}</div>
              ) : recommendedServices.isError ? (
                <AIErrorState onRetry={() => recommendedServices.refetch()} />
              ) : !recommendedServices.data?.length ? (
                <AIEmptyState
                  title="Personalized picks coming soon"
                  description="Book a few services and our AI will recommend the best ones for you. In the meantime, explore our popular services."
                />
              ) : (
                <RecommendationCarousel
                  items={recommendedServices.data.slice(0, 6)}
                  renderItem={(s, i) => <AIServiceCard service={s} index={i} variant="recommended" />}
                  itemWidth="min-w-[280px] max-w-[280px]"
                />
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              title="Recommended pros"
              subtitle="Workers matched to your needs by our recommendation engine."
              actionLabel="Find a pro"
              actionTo={ROUTES.search}
            />
            <div className="mt-6">
              {recommendedWorkers.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
              ) : recommendedWorkers.isError ? (
                <AIErrorState onRetry={() => recommendedWorkers.refetch()} />
              ) : !recommendedWorkers.data?.length ? (
                <AIEmptyState
                  title="Pro recommendations coming soon"
                  description="Once you book your first service, we'll suggest the perfect pros based on your location and preferences."
                />
              ) : (
                <RecommendationCarousel
                  items={recommendedWorkers.data.slice(0, 6)}
                  renderItem={(w, i) => <AIWorkerCard worker={w} variant="recommended" index={i} />}
                  itemWidth="min-w-[280px] max-w-[280px]"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI EXPERIENCE — Trending Today */}
      <section className="container py-12 md:py-16">
        <SectionHeader
          title="Trending today"
          subtitle="Services surging in bookings right now — jump in before they're fully booked."
          actionLabel="Explore all"
          actionTo={ROUTES.services}
        />
        <div className="mt-8">
          {trendingServices.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <ServiceCardSkeleton key={i} />)}</div>
          ) : trendingServices.isError ? (
            <AIErrorState onRetry={() => trendingServices.refetch()} />
          ) : !trendingServices.data?.data?.length ? (
            <AIEmptyState title="No trending services yet" description="Trending picks will appear here once booking activity picks up." />
          ) : (
            <RecommendationCarousel
              items={trendingServices.data.data}
              renderItem={(s, i) => <AIServiceCard service={s} index={i} variant="trending" />}
              itemWidth="min-w-[260px] max-w-[260px]"
            />
          )}
        </div>
      </section>

      {/* AI EXPERIENCE — Near You */}
      <section className="container py-12 md:py-16">
        <SectionHeader
          title="Near you"
          subtitle="Pros close by who can reach you fast — enable location for sharper picks."
          actionLabel="View all"
          actionTo={ROUTES.workers}
        />
        <div className="mt-8">
          {nearYouWorkers.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)}</div>
          ) : nearYouWorkers.isError ? (
            <AIErrorState onRetry={() => nearYouWorkers.refetch()} />
          ) : !nearYouWorkers.data?.length ? (
            <AIEmptyState title="No pros nearby yet" description="Enable your location to discover verified professionals in your area." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {nearYouWorkers.data.slice(0, 4).map((w, i) => (
                <WorkerCard
                  key={w._id}
                  worker={w}
                  index={i}
                  reason={buildRecommendationReason('nearby', workerToSignals(w), { distanceKm: w.distanceKm, etaMinutes: w.etaMinutes })}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI EXPERIENCE — Best Rated */}
      <section className="container py-12 md:py-16">
        <SectionHeader
          title="Best rated"
          subtitle="The highest-rated pros on the platform, ready to take your booking."
          actionLabel="See all pros"
          actionTo={ROUTES.workers}
        />
        <div className="mt-8">
              {bestRatedWorkers.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
              ) : bestRatedWorkers.isError ? (
                <AIErrorState title="Couldn't load best-rated pros" description="Please try again." />
              ) : !bestRatedWorkers.data?.data?.length ? (
                <AIEmptyState title="No best-rated pros yet" description="Top-rated pros will appear here once they join." />
              ) : (
                <RecommendationCarousel
                  items={bestRatedWorkers.data.data}
                  renderItem={(w, i) => <AIWorkerCard worker={w} variant="highest-rated" index={i} />}
                  itemWidth="min-w-[300px] max-w-[300px]"
                />
              )}
        </div>
      </section>

      {/* AI EXPERIENCE — Fast Booking + Budget Friendly */}
      <section className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader
              title="Fast booking"
              subtitle="Available pros who can reach you the fastest."
              actionLabel="View all"
              actionTo={ROUTES.workers}
            />
            <div className="mt-6">
              {fastBookingWorkers.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
              ) : fastBookingWorkers.isError ? (
                <AIErrorState title="Couldn't load fast booking" description="Please try again." />
              ) : !fastBookingWorkers.data?.length ? (
                <AIEmptyState title="No fast booking options" description="Available pros who can reach you quickly will appear here." />
              ) : (
                <RecommendationCarousel
                  items={fastBookingWorkers.data}
                  renderItem={(w, i) => <AIWorkerCard worker={w} variant="fastest" index={i} />}
                  itemWidth="min-w-[280px] max-w-[280px]"
                />
              )}
            </div>
          </div>

          <div>
            <SectionHeader
              title="Budget friendly"
              subtitle="Quality pros at the best rates — great work doesn't have to cost a lot."
              actionLabel="View all"
              actionTo={ROUTES.workers}
            />
            <div className="mt-6">
              {budgetFriendlyWorkers.isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
              ) : budgetFriendlyWorkers.isError ? (
                <AIErrorState title="Couldn't load budget picks" description="Please try again." />
              ) : !budgetFriendlyWorkers.data?.data?.length ? (
                <AIEmptyState title="No budget picks yet" description="Budget-friendly pros will appear here once they join." />
              ) : (
                <RecommendationCarousel
                  items={budgetFriendlyWorkers.data.data}
                  renderItem={(w, i) => <AIWorkerCard worker={w} variant="budget" index={i} />}
                  itemWidth="min-w-[280px] max-w-[280px]"
                />
              )}
            </div>
          </div>
        </div>
      </section>

       {/* CUSTOM JOB BIDDING DISCOVERY */}
       <section className="container py-16 md:py-20">
         <div className="card-premium card-premium-hover text-center p-8 md:p-12">
           <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
             <span className="text-3xl">📢</span>
           </div>
           <h2 className="text-2xl font-bold font-display">Post Your Problem &amp; Get Offers</h2>
           <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
             Let workers bid and choose the best price — perfect for unique or complex jobs where a fixed price doesn't fit.
           </p>
           <div className="mt-6 flex flex-wrap justify-center gap-3">
             <Button asChild className="btn-glow gap-2 rounded-full">
               <Link to={ROUTES.biddingHome}>
                 <span>📢</span> Post a Job
               </Link>
             </Button>
             <Button asChild variant="outline" className="gap-2 rounded-full">
               <Link to={ROUTES.biddingHome}>
                 Learn how it works
                 <ArrowRight className="h-4 w-4" />
               </Link>
             </Button>
           </div>
         </div>
       </section>

       {/* TRENDING WORKERS */}
      <section className="container py-16 md:py-20">
        <SectionHeader
          title="Trending workers"
          subtitle="Highly-rated pros your neighbors are booking right now."
          actionLabel="Find a pro"
          actionTo="/search"
        />
        <div className="mt-8">
          {trendingWorkers.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
            </div>
          ) : trendingWorkers.isError ? (
            <ErrorState title="Couldn't load workers" description="Please try again in a moment." icon={<Users className="h-8 w-8" />} />
          ) : !trendingWorkers.data?.length ? (
            <EmptyState title="No workers yet" description="Worker profiles will appear here once available." icon={<Users className="h-8 w-8" />} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {trendingWorkers.data.slice(0, 4).map((w, i) => <WorkerCard key={w._id} worker={w} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container">
          <SectionHeader title="How it works" subtitle="Book a pro in four simple steps." className="mb-10" />
          <div className="grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, i) => {
              const Icon = STEP_ICONS[step.icon] ?? Search;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="card-premium card-premium-hover p-6 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                    Step {step.step}
                  </span>
                  <h3 className="mt-3 font-semibold font-display">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container py-16 md:py-20">
        <SectionHeader title="Trusted by lakhs" subtitle="Numbers that speak for our commitment to quality." className="mb-10" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {HOMEPAGE_STATS.map((stat, i) => {
            const Icon = STAT_ICONS[stat.icon] ?? Star;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-premium card-premium-hover p-6 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-extrabold font-display gradient-text md:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm font-semibold">{stat.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <section className="container py-16 md:py-20">
        <SectionHeader title="Loved by customers" subtitle="Real stories from people who booked with OneDW." />
        <div className="mt-8">
          {reviews.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-premium p-6 space-y-3">
                  <div className="shimmer h-12 w-12 rounded-full" />
                  <div className="shimmer h-4 w-3/4" />
                  <div className="shimmer h-16 w-full" />
                </div>
              ))}
            </div>
          ) : reviews.isError ? (
            <div className="card-premium p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Star className="h-7 w-7" />
              </div>
              <h3 className="font-semibold font-display">Reviews are loading soon</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
                Our customers love sharing their experiences. Check back soon to see what they're saying about OneDW!
              </p>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => reviews.refetch()}>
                Refresh
              </Button>
            </div>
          ) : !reviews.data?.data?.length ? (
            <div className="card-premium p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Star className="h-7 w-7" />
              </div>
              <h3 className="font-semibold font-display">Be the first to review</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
                Complete a booking and share your experience! Your review helps others find the best professionals.
              </p>
              <Button asChild size="sm" className="mt-4 btn-glow rounded-full">
                <Link to={ROUTES.services}>Explore Services</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {reviews.data.data.map((r, i) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="card-premium p-6"
                >
                  <StarRating rating={r.rating} size={16} />
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-4">"{r.comment}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.customer?.avatar} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {r.customer?.name?.charAt(0) ?? 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{r.customer?.name ?? 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">on {r.worker?.name ?? 'a service'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DOWNLOAD APP + BECOME WORKER CTA */}
      <section className="container py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-4xl bg-brand-gradient p-8 text-white md:p-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <Smartphone className="h-10 w-10" />
            <h3 className="mt-4 text-2xl font-bold font-display">Take OneDW everywhere</h3>
            <p className="mt-2 max-w-sm text-white/80">Book and track services on the go. Download our app for iOS and Android.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" className="gap-2 rounded-full">
                <Apple className="h-5 w-5" /> App Store
              </Button>
              <Button variant="secondary" className="gap-2 rounded-full">
                <Download className="h-5 w-5" /> Google Play
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-4xl border bg-card p-8 md:p-10">
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
            <Wrench className="h-10 w-10 text-accent" />
            <h3 className="mt-4 text-2xl font-bold font-display">Become a OneDW pro</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">Turn your skills into income. Flexible hours, steady jobs, instant payouts.</p>
            <Button asChild className="btn-glow mt-6 gap-2 rounded-full">
              <Link to={ROUTES.register}>Start earning <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
