import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Star, MapPin, Clock, Phone, MessageSquare, Heart,
  Calendar, Award, Briefcase, Globe, Camera, ChevronLeft, Zap,
  ShieldAlert, Ban, AlertTriangle, Sparkles, TrendingUp, Wallet,
} from 'lucide-react';
import { workerService } from '@/services/worker.service';
import { searchService } from '@/services/search.service';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/common/StarRating';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ImageRepairCard } from '@/components/ai/ImageRepairCard';
import { AIWorkerCard } from '@/components/ai/AIWorkerCard';
import { BudgetWorkerCard } from '@/components/ai/BudgetWorkerCard';
import { RecommendationCarousel } from '@/components/ai/RecommendationCarousel';
import { AICardSkeleton } from '@/components/ai/AISkeleton';
import { AIEmptyState, AIErrorState } from '@/components/ai/AIEmptyState';
import { formatCurrency, formatDate, initials } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { MapView } from '@/components/common/MapView';
import { FraudWarningBanner } from '@/components/common/FraudBadge';
import { AITrustBadge } from '@/components/common/AITrustBadge';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { TrustReportDialog } from '@/components/common/TrustReportDialog';
import { HighRiskWarningDialog } from '@/components/common/HighRiskWarningDialog';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Worker } from '@/types/user';

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [fav, setFav] = useState(false);
  const [tab, setTab] = useState<'about' | 'portfolio' | 'certificates' | 'reviews'>('about');
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const workerQuery = useQuery({
    queryKey: queryKeys.workers.detail(id!),
    queryFn: () => workerService.detail(id!),
    enabled: !!id,
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.workers.reviews(id!),
    queryFn: () => workerService.reviews(id!, { limit: 5 }),
    enabled: !!id && tab === 'reviews',
  });

  const fraudQuery = useQuery({
    queryKey: ['fraud-status', id],
    queryFn: () => workerService.fraudStatus(id!),
    enabled: !!id,
    retry: false,
    staleTime: 60_000,
  });

  // AI recommended alternatives — all API-ready via searchService
  const similarQuery = useQuery({
    queryKey: queryKeys.search.similarWorkers(id!, { kind: 'similar', limit: 6 }),
    queryFn: () => searchService.similarWorkers(id!, { kind: 'similar', limit: 6 }),
    enabled: !!id,
  });
  const budgetAltQuery = useQuery({
    queryKey: queryKeys.search.similarWorkers(id!, { kind: 'budget', limit: 1 }),
    queryFn: () => searchService.similarWorkers(id!, { kind: 'budget', limit: 1 }),
    enabled: !!id,
  });
  const premiumAltQuery = useQuery({
    queryKey: queryKeys.search.similarWorkers(id!, { kind: 'premium', limit: 1 }),
    queryFn: () => searchService.similarWorkers(id!, { kind: 'premium', limit: 1 }),
    enabled: !!id,
  });
  const nearbyQuery = useQuery({
    queryKey: queryKeys.search.similarWorkers(id!, { kind: 'nearby', limit: 4 }),
    queryFn: () => searchService.similarWorkers(id!, { kind: 'nearby', limit: 4 }),
    enabled: !!id,
  });

  const demoWorker: Worker = {
    _id: 'demo-rahul',
    name: 'Rahul Kumar',
    email: 'rahul@example.com',
    role: 'worker',
    profession: 'Electrician',
    categoryIds: [],
    bio: 'Experienced electrician with 2 years in residential and commercial wiring, installation, and repair services.',
    experienceYears: 2,
    completedJobs: 18,
    rating: 3.4,
    reviewCount: 12,
    hourlyRate: 250,
    languages: ['Hindi', 'English'],
    skills: ['Wiring', 'Installation', 'Repair', 'Safety Inspection'],
    portfolio: [],
    certificates: [],
    coverImage: '',
    isOnline: false,
    isVerified: false,
    aadhaarVerified: false,
    avatar: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const demoFraud = {
    worker_id: 'demo-rahul',
    fraud_score: 68,
    risk_level: 'high' as const,
    is_disabled: false,
    recommendation: 'manual_verification_required',
  };

  if (workerQuery.isLoading && !demoMode) return <LoadingState className="min-h-[60vh]" />;
  if (workerQuery.isError && !demoMode) return <ErrorState className="min-h-[60vh]" title="Couldn't load this pro" description="Please try again." icon={<Star className="h-8 w-8" />} />;
  if (!workerQuery.data && !demoMode) return <EmptyState className="min-h-[60vh]" title="Pro not found" icon={<Star className="h-8 w-8" />} />;

  const w = demoMode ? demoWorker : workerQuery.data!;
  const fraud = demoMode ? demoFraud : fraudQuery.data;

  const showFraudWarning = fraud && (fraud.risk_level !== 'low' || fraud.is_disabled);

  return (
    <div className="pb-16">
      {/* cover */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 md:h-64">
        {w.coverImage && <img src={w.coverImage} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="container relative">
          <Button asChild variant="secondary" size="sm" className="mt-4 gap-1.5 rounded-full backdrop-blur">
            <Link to={ROUTES.search}><ChevronLeft className="h-4 w-4" /> Back</Link>
          </Button>
        </div>
      </div>

      <div className="container -mt-16">
        <motion.div
          initial={false}
          animate={{ height: demoMode ? 'auto' : 0, opacity: demoMode ? 1 : 0 }}
          className="mb-3 overflow-hidden"
        >
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
            <p className="flex-1 text-sm font-semibold text-orange-700">
              Demo Mode: Viewing High Risk Worker Profile
            </p>
            <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full text-xs" onClick={() => setDemoMode(false)}>
              Exit Demo
            </Button>
          </div>
        </motion.div>

        <button
          onClick={() => setDemoMode((p) => !p)}
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-left text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          <span className="flex-1">{demoMode ? 'Back to current worker' : 'View Demo: High Risk Worker Profile (Rahul Kumar)'}</span>
          <span className="text-xs opacity-60">Demo</span>
        </button>

        {showFraudWarning && (
          <FraudWarningBanner
            riskLevel={fraud.risk_level}
            fraudScore={fraud.fraud_score}
            isDisabled={fraud.is_disabled}
            recommendation={fraud.recommendation}
            className="mb-4"
          />
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Avatar className="h-28 w-28 border-4 border-card shadow-lg">
              <AvatarImage src={w.avatar} alt={w.name} />
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">{initials(w.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-display">{w.name}</h1>
                {w.isVerified && <BadgeCheck className="h-6 w-6 text-primary" />}
                {w.verificationBadge && (
                  <VerificationBadge badge={w.verificationBadge} trustScore={w.trustScore} size="sm" showScore />
                )}
                {w.isOnline && (
                  <Badge className="bg-success/15 text-success border-success/30">
                    <span className="mr-1 h-2 w-2 rounded-full bg-success animate-pulse" /> Online
                  </Badge>
                )}
                {fraud && (
                  <AITrustBadge
                    riskLevel={fraud.risk_level}
                    fraudScore={fraud.fraud_score}
                    isDisabled={fraud.is_disabled}
                    size="small"
                    onClick={() => {
                      const isSafe = fraud.risk_level === 'low' && fraud.fraud_score < 30;
                      if (isSafe) setTrustDialogOpen(true);
                      else setRiskDialogOpen(true);
                    }}
                  />
                )}
              </div>
              <p className="text-muted-foreground">{w.profession}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <StarRating rating={w.rating} size={16} showValue reviewCount={w.reviewCount} />
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {w.completedJobs} jobs</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {w.experienceYears}y exp</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {w.location ? 'On-site' : 'Remote'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => { setFav((p) => !p); toast.success(fav ? 'Removed from favorites' : 'Added to favorites'); }} aria-label="Favorite">
                <Heart className={`h-5 w-5 ${fav ? 'fill-error text-error' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" aria-label="Call">
                <Phone className="h-5 w-5" />
              </Button>
              <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Chat">
                <Link to={ROUTES.chat}><MessageSquare className="h-5 w-5" /></Link>
              </Button>
              <Button asChild className="btn-glow gap-2 rounded-full" disabled={fraud?.is_disabled}>
                <Link to={`${ROUTES.booking}?worker=${w._id}`}><Calendar className="h-4 w-4" /> Book Now</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Zap />} label="Hourly rate" value={formatCurrency(w.hourlyRate)} />
            <Stat icon={<Clock />} label="Experience" value={`${w.experienceYears} years`} />
            <Stat icon={<Briefcase />} label="Completed" value={`${w.completedJobs} jobs`} />
            <Stat icon={<Star />} label="Rating" value={`${w.rating.toFixed(1)} / 5`} />
          </div>
        </motion.div>

        {/* tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-hide">
          {(['about', 'portfolio', 'certificates', 'reviews'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {tab === 'about' && (
              <div className="card-premium p-6">
                <h2 className="font-semibold font-display">About {w.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{w.bio}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Globe className="h-4 w-4" /> Languages</p>
                    <div className="flex flex-wrap gap-2">
                      {w.languages.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Award className="h-4 w-4" /> Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {w.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'portfolio' && (
              <div className="card-premium p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold font-display"><Camera className="h-5 w-5" /> Portfolio</h2>
                {w.portfolio.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {w.portfolio.map((p, i) => (
                      <img key={i} src={p} alt="" className="aspect-square w-full rounded-2xl object-cover" loading="lazy" />
                    ))}
                  </div>
                ) : <EmptyState title="No portfolio yet" description="This pro hasn't added portfolio images." icon={<Camera className="h-8 w-8" />} />}
              </div>
            )}

            {tab === 'certificates' && (
              <div className="card-premium p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold font-display"><Award className="h-5 w-5" /> Certificates</h2>
                {w.certificates.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {w.certificates.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-2xl border p-4">
                        {c.image && <img src={c.image} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                        <div>
                          <p className="font-medium text-sm">{c.title}</p>
                          {c.issuedAt && <p className="text-xs text-muted-foreground">{formatDate(c.issuedAt)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="No certificates" description="This pro hasn't added certificates." icon={<Award className="h-8 w-8" />} />}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="card-premium p-6">
                <h2 className="mb-4 font-semibold font-display">Customer reviews</h2>
                {reviewsQuery.isLoading ? (
                  <LoadingState />
                ) : reviewsQuery.isError ? (
                  <ErrorState title="Couldn't load reviews" icon={<Star className="h-8 w-8" />} />
                ) : !reviewsQuery.data?.data?.length ? (
                  <EmptyState title="No reviews yet" description="Be the first to review this pro." icon={<Star className="h-8 w-8" />} />
                ) : (
                  <div className="space-y-4">
                    {reviewsQuery.data.data.map((r) => (
                      <div key={r._id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={r.customer?.avatar} />
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">{r.customer?.name?.charAt(0) ?? 'C'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{r.customer?.name ?? 'Customer'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                            </div>
                          </div>
                          <StarRating rating={r.rating} size={14} />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* sidebar */}
          <aside className="space-y-4">
            <div className="card-premium p-6">
              {fraud && fraud.risk_level !== 'low' && (
                <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs">
                  <p className="flex items-center gap-1 font-semibold text-orange-700">
                    <ShieldAlert className="h-3.5 w-3.5" /> Risk Level: {fraud.risk_level.charAt(0).toUpperCase() + fraud.risk_level.slice(1)}
                  </p>
                  <p className="mt-0.5 text-orange-600">Trust Score: {Math.round(fraud.fraud_score)}/100</p>
                  {fraud.recommendation && (
                    <p className="mt-0.5 text-orange-600">{fraud.recommendation.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  )}
                </div>
              )}
              {fraud?.is_disabled && (
                <div className="mb-3 rounded-lg border border-error/30 bg-error/5 p-2.5 text-xs">
                  <p className="flex items-center gap-1 font-semibold text-error">
                    <Ban className="h-3.5 w-3.5" /> Bookings Disabled
                  </p>
                  <p className="mt-0.5 text-error/80">This worker cannot accept new bookings.</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Starting from</p>
              <p className="text-3xl font-extrabold font-display gradient-text">{formatCurrency(w.hourlyRate)}<span className="text-base font-normal text-muted-foreground">/hr</span></p>
              <Button asChild className="btn-glow mt-4 w-full gap-2 rounded-xl" disabled={fraud?.is_disabled}>
                <Link to={`${ROUTES.booking}?worker=${w._id}`}><Calendar className="h-4 w-4" /> Book Now</Link>
              </Button>
              <Button asChild variant="outline" className="mt-2 w-full gap-2 rounded-xl">
                <Link to={ROUTES.chat}><MessageSquare className="h-4 w-4" /> Chat</Link>
              </Button>
            </div>

            <div className="card-premium p-6">
              <h3 className="flex items-center gap-2 font-semibold font-display"><MapPin className="h-4 w-4 text-primary" /> Service area</h3>
              <p className="mt-1 text-sm text-muted-foreground">This pro serves the highlighted area on the map.</p>
              <div className="mt-4">
                <MapView
                  workerMarker={
                    w.location?.coordinates
                      ? { lat: w.location.coordinates[1], lng: w.location.coordinates[0], label: w.name, profession: w.profession }
                      : undefined
                  }
                  className="h-56 w-full"
                  onUseCurrentLocation={() => toast('Locating you…')}
                />
              </div>
            </div>

            <ImageRepairCard variant="sidebar" />
          </aside>
        </div>

        {/* AI RECOMMENDED ALTERNATIVES */}
        <div className="mt-12 space-y-10">
          <div>
            <SectionHeader
              title="AI recommended alternatives"
              subtitle="Other pros you might like, based on this pro's skills and your needs."
              className="mb-4"
            />
            {similarQuery.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
            ) : similarQuery.isError ? (
              <AIErrorState onRetry={() => similarQuery.refetch()} />
            ) : !similarQuery.data?.items?.length ? (
              <AIEmptyState />
            ) : (
              <RecommendationCarousel
                items={similarQuery.data.items}
                renderItem={(alt, i) => <AIWorkerCard worker={alt} variant="recommended" index={i} />}
                itemWidth="min-w-[300px] max-w-[300px]"
              />
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Budget alternative */}
            <div>
              <SectionHeader title="Budget alternative" subtitle="A more affordable pro with similar skills." className="mb-4" />
              {budgetAltQuery.isLoading ? (
                <AICardSkeleton />
              ) : budgetAltQuery.isError ? (
                <AIErrorState title="No budget alternative" onRetry={() => budgetAltQuery.refetch()} />
              ) : !budgetAltQuery.data?.items?.length ? (
                <AIEmptyState title="No budget alternative" description="No cheaper pro with similar skills found." />
              ) : (
                <BudgetWorkerCard worker={budgetAltQuery.data.items[0]} estimatedPrice={budgetAltQuery.data.items[0].hourlyRate} />
              )}
            </div>

            {/* Premium alternative */}
            <div>
              <SectionHeader title="Premium alternative" subtitle="A higher-tier pro for a premium experience." className="mb-4" />
              {premiumAltQuery.isLoading ? (
                <AICardSkeleton />
              ) : premiumAltQuery.isError ? (
                <AIErrorState title="No premium alternative" onRetry={() => premiumAltQuery.refetch()} />
              ) : !premiumAltQuery.data?.items?.length ? (
                <AIEmptyState title="No premium alternative" description="No premium pro with similar skills found." />
              ) : (
                <AIWorkerCard worker={premiumAltQuery.data.items[0]} variant="highest-rated" />
              )}
            </div>
          </div>

          {/* Nearby workers */}
          <div>
            <SectionHeader title="Nearby pros" subtitle="Other professionals close to this one." className="mb-4" />
            {nearbyQuery.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)}</div>
            ) : nearbyQuery.isError ? (
              <AIErrorState onRetry={() => nearbyQuery.refetch()} />
            ) : !nearbyQuery.data?.items?.length ? (
              <AIEmptyState title="No nearby pros" />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {nearbyQuery.data.items.map((alt, i) => <AIWorkerCard key={alt._id} worker={alt} variant="nearby" index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <TrustReportDialog
        open={trustDialogOpen}
        onClose={() => setTrustDialogOpen(false)}
        workerName={w.name}
        completedJobs={w.completedJobs}
        rating={w.rating}
        trustScore={fraud ? Math.max(0, 100 - fraud.fraud_score) : 96}
      />

      <HighRiskWarningDialog
        open={riskDialogOpen}
        onClose={() => setRiskDialogOpen(false)}
        workerName={w.name}
        isDemo={demoMode}
      />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold font-display">{value}</p>
    </div>
  );
}
