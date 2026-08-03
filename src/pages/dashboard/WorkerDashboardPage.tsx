import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar, Wallet, CheckCircle2, Clock, TrendingUp, ArrowRight, ArrowDownToLine, Star, Bell, MapPin, DollarSign, Wrench, Shield, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { bookingService } from '@/services/booking.service';
import { walletService } from '@/services/wallet.service';
import { workerService } from '@/services/worker.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSocketEvent } from '@/hooks/useSocket';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/lib/apiError';
import { BookingCard } from '@/components/cards/BookingCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StarRating } from '@/components/common/StarRating';
import { DashboardSkeleton, BookingCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { formatCurrency } from '@/utils/format';
import type { Worker } from '@/types';
import type { BookingSocketEvent } from '@/types/realtime';

export default function WorkerDashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.workerVerified) !== 'true') {
      navigate(ROUTES.workerVerification, { replace: true });
    }
  }, []);
  const upcoming = useQuery({ queryKey: queryKeys.bookings.upcoming, queryFn: () => bookingService.upcoming() });
  const recent = useQuery({ queryKey: queryKeys.bookings.recent, queryFn: () => bookingService.recent() });
  const wallet = useQuery({ queryKey: queryKeys.wallet.detail(), queryFn: () => walletService.detail() });
  const me = useQuery({ queryKey: queryKeys.workers.detail(user?._id ?? ''), queryFn: () => workerService.detail(user?._id ?? ''), enabled: !!user?._id });

  const worker = me.data as Worker | undefined;

  const requests = (upcoming.data ?? []).filter((b) => b.status === 'pending');
  const upcomingJobs = (upcoming.data ?? []).filter((b) => b.status !== 'pending');
  const completedJobs = (recent.data ?? []).filter((b) => b.status === 'completed');

  const invalidateBookings = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.bookings.upcoming });
    qc.invalidateQueries({ queryKey: queryKeys.bookings.recent });
    qc.invalidateQueries({ queryKey: ['bookings'] });
  }, [qc]);

  const acceptMutation = useMutation({
    mutationFn: (id: string) => bookingService.accept(id),
    onSuccess: () => {
      toast.success('Booking accepted');
      invalidateBookings();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not accept request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => bookingService.reject(id),
    onSuccess: () => {
      toast.success('Request rejected');
      invalidateBookings();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not reject request'),
  });

  const newRequestEvent = useSocketEvent<BookingSocketEvent>('booking:new');
  useEffect(() => {
    if (!newRequestEvent.data) return;
    toast.success('New booking request received');
    invalidateBookings();
  }, [newRequestEvent.data, invalidateBookings]);

  const bookingUpdateEvent = useSocketEvent<BookingSocketEvent>('booking:updated');
  useEffect(() => {
    if (!bookingUpdateEvent.data) return;
    invalidateBookings();
  }, [bookingUpdateEvent.data, invalidateBookings]);

  const earningsData = [
    { label: 'Mon', value: 120 }, { label: 'Tue', value: 240 }, { label: 'Wed', value: 180 },
    { label: 'Thu', value: 300 }, { label: 'Fri', value: 260 }, { label: 'Sat', value: 420 }, { label: 'Sun', value: 380 },
  ];
  const performance = [
    { name: 'On-time', value: 92, fill: 'hsl(var(--primary))' },
  ];

  const stats = [
    { label: "Today's jobs", value: upcomingJobs.length, icon: Clock, color: 'text-primary' },
    { label: 'Completed', value: completedJobs.length, icon: CheckCircle2, color: 'text-success' },
    { label: 'Wallet', value: formatCurrency(wallet.data?.balance ?? 0), icon: Wallet, color: 'text-accent' },
    { label: 'Rating', value: worker?.rating?.toFixed(1) ?? '—', icon: Star, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display">Worker dashboard</h1>
          {localStorage.getItem(STORAGE_KEYS.workerVerified) === 'true' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <Shield className="h-3.5 w-3.5" /> Verified Worker ✅
            </span>
          )}
        </div>
        <p className="text-muted-foreground">Manage your jobs, earnings, and performance.</p>
        <Button asChild className="btn-glow gap-2 rounded-full">
          <Link to={ROUTES.wallet}><ArrowDownToLine className="h-4 w-4" /> Withdraw</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-2xl font-bold font-display">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Incoming Requests */}
      <Card className="p-6">
        <SectionHeader title="Incoming Requests" subtitle="New service requests from customers." className="mb-4" />
        {upcoming.isLoading ? (
          <DashboardSkeleton />
        ) : requests.length === 0 ? (
          <EmptyState title="No pending requests" description="New requests will appear here in real time." icon={<Wrench className="h-8 w-8" />} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => (
              <Card key={r._id} className="p-4 border-l-4 border-l-primary">
                <div className="flex items-start justify-between">
                  <p className="font-semibold font-display flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" /> {r.service?.name ?? 'Service'} Job
                  </p>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {r.address?.city ?? '—'}</p>
                  <p className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /> {formatCurrency(r.finalPrice ?? 0)}</p>
                  <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {r.scheduledDate} · {r.scheduledTime}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-full"
                    onClick={() => acceptMutation.mutate(r._id)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending && acceptMutation.variables === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => rejectMutation.mutate(r._id)}
                    disabled={rejectMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionHeader title="Earnings this week" subtitle="Your daily earnings overview." className="mb-4" />
          {wallet.isLoading ? (
            <DashboardSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeader title="On-time rate" className="mb-4" />
          {me.isLoading ? <DashboardSkeleton /> : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={performance} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="-mt-24 text-3xl font-bold font-display">{performance[0].value}%</p>
              <p className="mt-12 text-sm text-muted-foreground">Based on last 30 jobs</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader title="Upcoming jobs" actionLabel="View all" actionTo={ROUTES.chat} className="mb-4" />
          {upcoming.isLoading ? (
            <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <BookingCardSkeleton key={i} />)}</div>
          ) : !upcomingJobs.length ? (
            <EmptyState title="No upcoming jobs" description="New job requests will appear here." icon={<Calendar className="h-8 w-8" />} />
          ) : (
            <div className="space-y-4">
              {upcomingJobs.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Completed jobs" className="mb-4" />
          {recent.isLoading ? (
            <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <BookingCardSkeleton key={i} />)}</div>
          ) : !completedJobs.length ? (
            <EmptyState title="No completed jobs yet" description="Finished jobs will show here." icon={<CheckCircle2 className="h-8 w-8" />} />
          ) : (
            <div className="space-y-4">
              {completedJobs.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <Card className="p-6">
        <SectionHeader title="Notifications" className="mb-4" />
        <div className="space-y-3">
          {[
            { icon: Bell, color: 'text-primary', msg: 'New service request available' },
            { icon: CheckCircle2, color: 'text-success', msg: 'Booking completed — payment released' },
          ].map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border p-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${n.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm">{n.msg}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader title="Customer reviews" actionLabel="View all" actionTo={ROUTES.reviews} className="mb-4" />
        {worker ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-4xl font-extrabold font-display gradient-text">{worker.rating?.toFixed(1)}</p>
              <StarRating rating={worker.rating} size={18} className="mt-1 justify-center sm:justify-start" />
              <p className="mt-1 text-sm text-muted-foreground">{worker.reviewCount} reviews</p>
            </div>
            <Button asChild variant="outline" className="gap-2 rounded-full">
              <Link to={ROES_REVIEWS}><TrendingUp className="h-4 w-4" /> View reviews</Link>
            </Button>
          </div>
        ) : (
          <DashboardSkeleton />
        )}
      </Card>
    </div>
  );
}

const ROES_REVIEWS = ROUTES.reviews;
