import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Check, ChevronRight, ChevronLeft, Wrench, Camera, UserCheck, Calendar, Clock,
  MapPin, CreditCard, CheckCircle2, Loader2, Tag, X,
} from 'lucide-react';
import { serviceService } from '@/services/service.service';
import { workerService } from '@/services/worker.service';
import { bookingService } from '@/services/booking.service';
import { searchService } from '@/services/search.service';
import { couponService } from '@/services/marketing.service';
import { queryKeys } from '@/lib/queryClient';
import { bookingAddressSchema, type BookingAddressFormData } from '@/utils/validation';
import { ApiError } from '@/lib/apiError';
import type { Service, Worker, Address, PaymentMethod, CreateBookingPayload } from '@/types';
import { ImageUpload } from '@/components/common/ImageUpload';
import { AddressPicker } from '@/components/common/AddressPicker';
import type { MapLocation as PickedAddress } from '@/components/common/MapView';
import { StarRating } from '@/components/common/StarRating';
import { MapView, type MapLocation, type NearbyWorker } from '@/components/common/MapView';
import { ServiceCardSkeleton, WorkerCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/States';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AIPriceEstimator } from '@/components/ai/AIPriceEstimator';
import { AIWorkerCard } from '@/components/ai/AIWorkerCard';
import { BudgetWorkerCard } from '@/components/ai/BudgetWorkerCard';
import { FastestWorkerCard } from '@/components/ai/FastestWorkerCard';
import { HighestRatedWorkerCard } from '@/components/ai/HighestRatedWorkerCard';
import { AICardSkeleton } from '@/components/ai/AISkeleton';
import { Sparkles, Zap, Star, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDuration, initials } from '@/utils/format';
import { ROUTES } from '@/constants/routes';

const STEPS = [
  { id: 1, label: 'Service',  icon: Wrench },
  { id: 2, label: 'Problem',  icon: Camera },
  { id: 3, label: 'Images',   icon: Camera },
  { id: 4, label: 'Worker',   icon: UserCheck },
  { id: 5, label: 'Date',     icon: Calendar },
  { id: 6, label: 'Time',     icon: Clock },
  { id: 7, label: 'Address',  icon: MapPin },
  { id: 8, label: 'Payment',  icon: CreditCard },
  { id: 9, label: 'Done',     icon: CheckCircle2 },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'wallet', label: 'Wallet' },
  { id: 'card',   label: 'Card' },
  { id: 'upi',    label: 'UPI' },
  { id: 'cash',   label: 'Cash' },
];

export default function BookingPage() {
  const [, ] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [problem, setProblem] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [pickedAddress, setPickedAddress] = useState<PickedAddress | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const addressForm = useForm<BookingAddressFormData>({
    resolver: zodResolver(bookingAddressSchema),
  });

  const servicesQuery = useQuery({
    queryKey: queryKeys.services.all({ limit: 20 }),
    queryFn: () => serviceService.list({ limit: 20 }),
  });

  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all({ service: selectedService?._id }),
    queryFn: () => workerService.list({ service: selectedService?._id }),
    enabled: step >= 4 && !!selectedService,
  });

  // AI: estimated price + recommended workers for the selected service
  const aiWorkersQuery = useQuery({
    queryKey: queryKeys.search.similarWorkers(selectedService?._id ?? '', { kind: 'similar', limit: 4 }),
    queryFn: () => searchService.similarWorkers(selectedService!._id, { kind: 'similar', limit: 4 }),
    enabled: step >= 4 && !!selectedService,
  });

  // Nearby workers for the map in step 7
  const mapCenterLat = pickedAddress?.lat ?? 12.97;
  const mapCenterLng = pickedAddress?.lng ?? 77.59;
  const nearbyMapQuery = useQuery({
    queryKey: queryKeys.workers.nearby(mapCenterLat, mapCenterLng),
    queryFn: () => workerService.nearby(mapCenterLat, mapCenterLng, 10, 20),
    enabled: step === 7,
  });
  const nearbyMapWorkers: NearbyWorker[] = (nearbyMapQuery.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    profession: w.profession,
    avatar: w.avatar,
    rating: w.rating,
    location: { lat: mapCenterLat + (Math.random() - 0.5) * 0.02, lng: mapCenterLng + (Math.random() - 0.5) * 0.02 },
    distanceKm: w.distance,
  }));

  const createMutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingService.create(payload),
    onSuccess: (booking) => {
      setConfirmedId(booking._id);
      setStep(9);
      toast.success('Booking confirmed!');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Booking failed.'),
  });

  const validateCouponMutation = useMutation({
    mutationFn: () =>
      couponService.validate(couponInput.trim().toUpperCase(), selectedService?.basePrice ?? 0),
    onSuccess: (res) => {
      if (res.valid) {
        setDiscount(res.discount);
        setCouponCode(couponInput.trim().toUpperCase());
        setCouponApplied(true);
        toast.success(`Coupon applied — you save ${formatCurrency(res.discount)}!`);
      } else {
        toast.error('Invalid or expired coupon code.');
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Invalid coupon code.';
      toast.error(msg);
    },
  });

  const removeCoupon = () => {
    setCouponApplied(false);
    setCouponCode('');
    setCouponInput('');
    setDiscount(0);
  };

  const next = () => setStep((s) => Math.min(9, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!selectedService;
      case 2: return problem.length >= 10;
      case 3: return true;
      case 4: return !!selectedWorker;
      case 5: return !!date;
      case 6: return !!time;
      case 7: return addressForm.formState.isValid;
      case 8: return !!paymentMethod;
      default: return true;
    }
  };

  const handleConfirm = () => {
    if (!selectedService || !selectedWorker || !date || !time) return;
    const addr = addressForm.getValues() as Address;
    const payload: CreateBookingPayload = {
      serviceId: selectedService._id,
      workerId: selectedWorker._id,
      problemDescription: problem,
      problemImages: images,
      scheduledDate: date,
      scheduledTime: time,
      address: addr,
      paymentMethod,
      couponCode: couponCode || undefined,
    };
    createMutation.mutate(payload);
  };

  const basePrice = selectedService?.basePrice ?? 0;
  const finalPrice = Math.max(0, basePrice - discount);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="font-semibold font-display">Book a service</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.home)} className="rounded-full">
            Cancel
          </Button>
        </div>
      </div>

      <div className="container py-8">
        {/* step indicator */}
        <div className="mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done   = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition',
                    done   && 'bg-success/15 text-success',
                    active && 'bg-primary text-primary-foreground shadow-glow',
                    !done && !active && 'text-muted-foreground',
                  )}>
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      done   ? 'bg-success text-white'
                             : active ? 'bg-white/20' : 'bg-muted',
                    )}>
                      {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="mx-0.5 h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">

            {/* STEP 1 — service */}
            {step === 1 && (
              <Step key="s1">
                <StepTitle title="Choose a service" subtitle="Pick the service you need help with." />
                {servicesQuery.isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
                  </div>
                ) : !servicesQuery.data?.data?.length ? (
                  <EmptyState title="No services available" icon={<Wrench className="h-8 w-8" />} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {servicesQuery.data.data.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => { setSelectedService(s); setSelectedWorker(null); }}
                        className={cn(
                          'card-premium flex items-center gap-3 p-4 text-left transition',
                          selectedService?._id === s._id && 'border-primary ring-2 ring-primary/30',
                        )}
                      >
                        {s.image && <img src={s.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(s.duration)} · {formatCurrency(s.basePrice)}
                          </p>
                        </div>
                        {selectedService?._id === s._id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Step>
            )}

            {/* STEP 2 — problem description */}
            {step === 2 && (
              <Step key="s2">
                <StepTitle title="Describe your problem" subtitle="Tell your pro what needs fixing." />
                <Textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={6}
                  placeholder="e.g. My kitchen sink is leaking under the cabinet…"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {problem.length}/500 · minimum 10 characters
                </p>
              </Step>
            )}

            {/* STEP 3 — images */}
            {step === 3 && (
              <Step key="s3">
                <StepTitle
                  title="Upload images"
                  subtitle="Add photos so your pro arrives prepared. Tap the button to use your camera or pick from gallery."
                />
                <ImageUpload
                  folder="problem"
                  max={5}
                  urls={images}
                  onChange={setImages}
                  label="Problem images (optional)"
                />
              </Step>
            )}

            {/* STEP 4 — worker */}
            {step === 4 && (
              <Step key="s4">
                <StepTitle title="Choose a worker" subtitle="Compare pros — or let our AI pick the best match." />
                {workersQuery.isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
                  </div>
                ) : !workersQuery.data?.data?.length ? (
                  <EmptyState
                    title="No workers available"
                    description="Try a different service."
                    icon={<UserCheck className="h-8 w-8" />}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {workersQuery.data.data.map((w) => (
                      <button
                        key={w._id}
                        onClick={() => setSelectedWorker(w)}
                        className={cn(
                          'card-premium flex items-center gap-3 p-4 text-left transition',
                          selectedWorker?._id === w._id && 'border-primary ring-2 ring-primary/30',
                        )}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={w.avatar} />
                          <AvatarFallback className="bg-primary/10 text-sm text-primary">
                            {initials(w.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{w.name}</p>
                          <StarRating rating={w.rating} size={12} showValue reviewCount={w.reviewCount} />
                          <p className="text-xs text-muted-foreground">{formatCurrency(w.hourlyRate)}/hr</p>
                        </div>
                        {selectedWorker?._id === w._id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* AI PRICE ESTIMATE + RECOMMENDED WORKERS */}
                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                  <AIPriceEstimator
                    initialServiceId={selectedService?._id}
                    initialServiceName={selectedService?.name}
                  />
                  <div className="card-premium p-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold font-display">AI worker recommendations</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Smart picks for "{selectedService?.name}" — fastest, budget, and premium.
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {aiWorkersQuery.isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <AICardSkeleton key={i} />)
                      ) : !aiWorkersQuery.data?.items?.length ? (
                        <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                          AI recommendations will appear here once available.
                        </p>
                      ) : (
                        aiWorkersQuery.data.items.slice(0, 4).map((w, i) => {
                          const variant = i === 0 ? 'fastest' : i === 1 ? 'budget' : i === 2 ? 'highest-rated' : 'recommended';
                          if (variant === 'budget') return <BudgetWorkerCard key={w._id} worker={w} estimatedPrice={w.hourlyRate} index={i} />;
                          if (variant === 'fastest') return <FastestWorkerCard key={w._id} worker={w} index={i} />;
                          if (variant === 'highest-rated') return <HighestRatedWorkerCard key={w._id} worker={w} index={i} />;
                          return <AIWorkerCard key={w._id} worker={w} variant="recommended" index={i} />;
                        })
                      )}
                    </div>
                  </div>
                </div>
              </Step>
            )}

            {/* STEP 5 — date */}
            {step === 5 && (
              <Step key="s5">
                <StepTitle title="Pick a date" subtitle="When should your pro come?" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="max-w-xs"
                />
              </Step>
            )}

            {/* STEP 6 — time */}
            {step === 6 && (
              <Step key="s6">
                <StepTitle title="Pick a time" subtitle="Choose a time slot that works for you." />
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={cn(
                        'rounded-xl border py-3 text-sm font-medium transition',
                        time === slot
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-primary/50',
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </Step>
            )}

            {/* STEP 7 — address */}
            {step === 7 && (
              <Step key="s7">
                <StepTitle title="Service address" subtitle="Where should the pro show up?" />

                <AddressPicker
                  id="booking-address"
                  label="Service Address"
                  value={pickedAddress}
                  onChange={(addr) => {
                    setPickedAddress(addr);
                    if (addr?.label) {
                      addressForm.setValue('line1', addr.label, { shouldValidate: true });
                    }
                  }}
                  placeholder="Search your address on the map…"
                />

                <div className="mt-4">
                  <MapView
                    customerMarker={pickedAddress ? { lat: pickedAddress.lat, lng: pickedAddress.lng, label: 'You' } : undefined}
                    nearbyWorkers={nearbyMapWorkers}
                    className="h-56 w-full"
                    onUseCurrentLocation={() => {
                      if ('geolocation' in navigator) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const loc: MapLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'You' };
                          setPickedAddress({ ...loc, label: 'Current location' });
                          addressForm.setValue('line1', 'Current location', { shouldValidate: true });
                        });
                      }
                    }}
                  />
                  {nearbyMapWorkers.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {nearbyMapWorkers.length} nearby pros available in this area
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="Address line 1" form={addressForm} name="line1" placeholder="123 Main St" />
                  <FormField label="Address line 2" form={addressForm} name="line2" placeholder="Apt, suite (optional)" />
                  <FormField label="City"        form={addressForm} name="city"       placeholder="New York" />
                  <FormField label="State"       form={addressForm} name="state"      placeholder="NY" />
                  <FormField label="Postal code" form={addressForm} name="postalCode" placeholder="10001" />
                  <FormField label="Country"     form={addressForm} name="country"    placeholder="USA" />
                </div>
              </Step>
            )}

            {/* STEP 8 — payment */}
            {step === 8 && (
              <Step key="s8">
                <StepTitle title="Payment" subtitle="Choose how you'd like to pay." />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        'rounded-2xl border-2 p-4 text-center transition',
                        paymentMethod === m.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50',
                      )}
                    >
                      <p className="font-medium">{m.label}</p>
                    </button>
                  ))}
                </div>

                {/* coupon section */}
                <Card className="mt-6 p-5">
                  <p className="mb-3 text-sm font-medium">Have a coupon?</p>

                  {couponApplied ? (
                    <div className="flex items-center justify-between rounded-xl bg-success/10 px-4 py-3">
                      <div className="flex items-center gap-2 text-success">
                        <Tag className="h-4 w-4" />
                        <span className="font-mono font-bold">{couponCode}</span>
                        <Badge className="bg-success/20 text-success border-success/30 text-xs">
                          Applied
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-full p-1 hover:bg-success/20 text-success"
                        aria-label="Remove coupon"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="font-mono uppercase"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && couponInput.trim()) {
                            validateCouponMutation.mutate();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => validateCouponMutation.mutate()}
                        disabled={!couponInput.trim() || validateCouponMutation.isPending}
                        className="shrink-0"
                      >
                        {validateCouponMutation.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : 'Apply'
                        }
                      </Button>
                    </div>
                  )}

                  {/* price breakdown */}
                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service price</span>
                      <span>{formatCurrency(basePrice)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-success font-medium">
                        <span>Coupon discount</span>
                        <span>− {formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-bold text-base">
                      <span>Total</span>
                      <span>{formatCurrency(finalPrice)}</span>
                    </div>
                  </div>
                </Card>
              </Step>
            )}

            {/* STEP 9 — confirmation */}
            {step === 9 && (
              <Step key="s9">
                <div className="py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <CheckCircle2 className="h-10 w-10" />
                  </motion.div>
                  <h2 className="mt-6 text-2xl font-bold font-display">Booking confirmed!</h2>
                  <p className="mt-2 text-muted-foreground">
                    Your pro has been notified. You'll get updates in real time.
                  </p>
                  {confirmedId && (
                    <div className="mt-6 flex justify-center gap-3">
                      <Button asChild className="btn-glow rounded-full">
                        <Link to={`/bookings/${confirmedId}`}>View booking</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full">
                        <Link to={ROUTES.customerDashboard}>Go to dashboard</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </Step>
            )}
          </AnimatePresence>

          {step < 9 && (
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={prev}
                disabled={step === 1}
                className="gap-1.5 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step === 8 ? (
                <Button
                  onClick={handleConfirm}
                  className="btn-glow gap-2 rounded-full"
                  disabled={createMutation.isPending || !canProceed()}
                >
                  {createMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming…</>
                    : <><Check className="h-4 w-4" /> Confirm booking</>
                  }
                </Button>
              ) : (
                <Button
                  onClick={next}
                  className="btn-glow gap-1.5 rounded-full"
                  disabled={!canProceed()}
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold font-display">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FormField({
  label, name, placeholder, form,
}: {
  label: string;
  name: keyof BookingAddressFormData;
  placeholder: string;
  form: ReturnType<typeof useForm<BookingAddressFormData>>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} placeholder={placeholder} {...form.register(name as 'line1')} />
      {form.formState.errors[name] && (
        <p className="text-sm text-destructive">{form.formState.errors[name]?.message}</p>
      )}
    </div>
  );
}
