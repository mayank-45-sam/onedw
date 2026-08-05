import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, BadgeCheck, Star, ArrowRight, Download,
  Sparkles, Wrench, Smartphone, Apple, Users, Wallet, Zap, TrendingUp, MapPin,
  Camera, UserCheck, Heart, CheckCircle2, Shield, Clock, Award,
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

/* ── Hero floating stat cards (matching screenshot) ── */
const HERO_STATS = [
  { icon: Star, label: '4.9 Rating', sub: '50k+ reviews', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  { icon: BadgeCheck, label: 'Verified Pros', sub: '2000+ experts', color: 'text-green-400', bg: 'bg-green-400/20' },
  { icon: Zap, label: 'Fast Booking', sub: '< 2 minutes', color: 'text-blue-300', bg: 'bg-blue-400/20' },
];

/* ── Popular service tags for hero ── */
const POPULAR_TAGS = ['Electrician', 'Plumber', 'Painter', 'Cleaner', 'Carpenter', 'AC Repair'];

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

  const trendingServices = useQuery({
    queryKey: queryKeys.services.all({ sort: 'rating', limit: 8 }),
    queryFn: () => serviceService.list({ sort: 'rating', limit: 8 }),
  });
  const bestRatedWorkers = useQuery({
    queryKey: queryKeys.workers.all({ sort: 'rating', limit: 8 }),
    queryFn: () => workerService.list({ sort: 'rating', limit: 8 }),
  });

  const nearYouWorkers = coords ? nearbyWorkers : trendingWorkers;
  const firstPopularService = popularServices.data?.data?.[0];

  return (
    <div>
      {/* ══════════════════════════════════════════
          HERO SECTION — Bold blue gradient matching screenshot
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden gradient-hero min-h-[580px] md:min-h-[640px]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute left-1/4 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute right-10 top-40 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />

        <div className="container relative py-20 md:py-28 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-center">
            {/* Left: Text + Search */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            >


              {/* Headline */}
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-white font-display sm:text-5xl md:text-6xl lg:text-6xl">
                Find Trusted{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #7dd3fc 0%, #38bdf8 50%, #bfdbfe 100%)' }}>
                  Professionals
                </span>
                <br />Near You
              </h1>

              <p className="mt-5 max-w-xl text-base text-white/75 leading-relaxed md:text-lg">
                Book verified plumbers, electricians, painters and more with AI-powered matching. Guaranteed quality. Transparent pricing. Instant confirmation.
              </p>

              {/* Search bar */}
              <div className="mt-8">
                <SearchBar />
              </div>

              {/* Popular tags */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-white/60 font-medium">Popular:</span>
                {POPULAR_TAGS.map((tag) => (
                  <Link
                    key={tag}
                    to={`/search?q=${tag.toLowerCase()}`}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
                  >
                    {tag}
                  </Link>
                ))}
              </div>



              {/* Emergency booking */}
              {firstPopularService && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-6"
                >
                  <EmergencyBookingButton
                    service={firstPopularService}
                    onBookingComplete={() => window.location.reload()}
                  />
                </motion.div>
              )}
            </motion.div>


          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════
          AI IMAGE REPAIR ESTIMATION
      ══════════════════════════════════════════ */}
      <section className="container py-16 md:py-20">
        <ImageRepairCard />
      </section>

      {/* ══════════════════════════════════════════
          POPULAR SERVICES
      ══════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════
          AI RECOMMENDATION BANNER
      ══════════════════════════════════════════ */}
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



      {/* ══════════════════════════════════════════
          AI EXPERIENCE — Trending Today
      ══════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════
          AI EXPERIENCE — Near You
      ══════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════
          AI EXPERIENCE — Best Rated
      ══════════════════════════════════════════ */}
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



      {/* ══════════════════════════════════════════
          CUSTOM JOB BIDDING
      ══════════════════════════════════════════ */}
       <section className="container py-16 md:py-20">
         <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-accent/10 via-primary/5 to-accent/10 p-8 md:p-12 text-center">
           <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
           <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
           <div className="relative">
             <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20">
               <span className="text-3xl">📢</span>
             </div>
             <h2 className="text-2xl font-bold font-display md:text-3xl">Post Your Problem &amp; Get Offers</h2>
             <p className="mt-3 max-w-2xl mx-auto text-sm text-muted-foreground md:text-base leading-relaxed">
               Let workers bid and choose the best price — perfect for unique or complex jobs where a fixed price doesn't fit.
             </p>
             <div className="mt-7 flex flex-wrap justify-center gap-3">
               <Button asChild className="btn-glow gap-2 rounded-full bg-brand-gradient text-white">
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
         </div>
       </section>

       {/* ══════════════════════════════════════════
           TRENDING WORKERS
      ══════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-muted/40 via-background to-muted/20 py-16 md:py-24">
        <div className="container">
          <SectionHeader title="How it works" subtitle="Book a pro in four simple steps." className="mb-12" />
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
                  className="relative"
                >
                  {/* Connector line */}
                  {i < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="absolute right-0 top-[2.75rem] hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/30 to-accent/30 md:block" style={{ width: 'calc(100% - 3.5rem)', left: '3.5rem' }} />
                  )}

                  <div className="card-premium card-premium-hover p-6 text-center relative z-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="mt-4 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                      Step {step.step}
                    </span>
                    <h3 className="mt-3 font-bold font-display">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="container py-16 md:py-20">
        <SectionHeader title="Trusted by lakhs" subtitle="Numbers that speak for our commitment to quality." className="mb-12" />
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
                className="card-premium card-premium-hover p-6 text-center group"
              >
                <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/15 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-3xl font-extrabold font-display gradient-text md:text-4xl">{stat.value}</p>
                <p className="mt-1.5 text-sm font-bold">{stat.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CUSTOMER REVIEWS
      ══════════════════════════════════════════ */}
      <section className="container py-16 md:py-20">
        <SectionHeader title="Loved by customers" subtitle="Real stories from people who booked with OneDW." />
        <div className="mt-8">
          {reviews.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-premium p-6 space-y-4">
                  <div className="shimmer h-4 w-24 rounded-full" />
                  <div className="shimmer h-16 w-full rounded-xl" />
                  <div className="flex items-center gap-3">
                    <div className="shimmer h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <div className="shimmer h-3 w-24 rounded" />
                      <div className="shimmer h-3 w-16 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.isError ? (
            <div className="card-premium p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Star className="h-7 w-7" />
              </div>
              <h3 className="font-bold font-display">Reviews are loading soon</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
                Our customers love sharing their experiences. Check back soon!
              </p>
              <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => reviews.refetch()}>
                Refresh
              </Button>
            </div>
          ) : !reviews.data?.data?.length ? (
            <div className="card-premium p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Star className="h-7 w-7" />
              </div>
              <h3 className="font-bold font-display">Be the first to review</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
                Complete a booking and share your experience!
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
                  className="card-premium card-premium-hover p-6 flex flex-col gap-4"
                >
                  <StarRating rating={r.rating} size={16} />
                  <p className="text-sm text-muted-foreground line-clamp-4 flex-1 leading-relaxed">"{r.comment}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                      <AvatarImage src={r.customer?.avatar} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {r.customer?.name?.charAt(0) ?? 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold">{r.customer?.name ?? 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">on {r.worker?.name ?? 'a service'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          DOWNLOAD APP + BECOME WORKER
      ══════════════════════════════════════════ */}
      <section className="container py-16 md:py-20">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* App download */}
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient-135 p-8 text-white md:p-10">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/8 blur-xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 mb-5">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold font-display">Take OneDW everywhere</h3>
              <p className="mt-2.5 max-w-sm text-white/75 leading-relaxed">Book and track services on the go. Download our app for iOS and Android.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary" className="gap-2 rounded-full bg-white/20 text-white border-white/20 hover:bg-white/30">
                  <Apple className="h-4 w-4" /> App Store
                </Button>
                <Button variant="secondary" className="gap-2 rounded-full bg-white/20 text-white border-white/20 hover:bg-white/30">
                  <Download className="h-4 w-4" /> Google Play
                </Button>
              </div>
            </div>
          </div>

          {/* Become a worker */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-accent/30 bg-accent/5 p-8 md:p-10">
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 mb-5">
                <Wrench className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold font-display">Become a OneDW pro</h3>
              <p className="mt-2.5 max-w-sm text-muted-foreground leading-relaxed">Turn your skills into income. Flexible hours, steady jobs, instant payouts.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {['Flexible schedule', 'Instant payouts', 'AI job matching'].map((f) => (
                  <span key={f} className="flex items-center gap-1.5 rounded-full bg-background border px-3 py-1.5">
                    <CheckCircle2 className="h-3 w-3 text-success" /> {f}
                  </span>
                ))}
              </div>
              <Button asChild className="btn-glow mt-6 gap-2 rounded-full bg-brand-gradient text-white">
                <Link to={ROUTES.register}>Start earning <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
