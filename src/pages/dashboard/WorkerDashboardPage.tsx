import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar, Wallet, CheckCircle2, Clock, TrendingUp, ArrowRight, ArrowDownToLine, Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { bookingService } from '@/services/booking.service';
import { walletService } from '@/services/wallet.service';
import { workerService } from '@/services/worker.service';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryClient';
import { BookingCard } from '@/components/cards/BookingCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StarRating } from '@/components/common/StarRating';
import { DashboardSkeleton, BookingCardSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/format';
import type { Worker } from '@/types';

export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const jobs = useQuery({ queryKey: queryKeys.bookings.workerJobs({ status: 'accepted' }), queryFn: () => bookingService.list({ role: 'worker' }) });
  const completed = useQuery({ queryKey: queryKeys.bookings.workerJobs({ status: 'completed' }), queryFn: () => bookingService.list({ role: 'worker', status: 'completed' }) });
  const wallet = useQuery({ queryKey: queryKeys.wallet.detail(), queryFn: () => walletService.detail() });
  const me = useQuery({ queryKey: queryKeys.workers.detail(user?._id ?? ''), queryFn: () => workerService.detail(user?._id ?? ''), enabled: !!user?._id });

  const worker = me.data as Worker | undefined;

  const earningsData = [
    { label: 'Mon', value: 120 }, { label: 'Tue', value: 240 }, { label: 'Wed', value: 180 },
    { label: 'Thu', value: 300 }, { label: 'Fri', value: 260 }, { label: 'Sat', value: 420 }, { label: 'Sun', value: 380 },
  ];
  const performance = [
    { name: 'On-time', value: 92, fill: 'hsl(var(--primary))' },
  ];

  const stats = [
    { label: "Today's jobs", value: jobs.data?.data?.length ?? 0, icon: Clock, color: 'text-primary' },
    { label: 'Completed', value: completed.data?.data?.length ?? 0, icon: CheckCircle2, color: 'text-success' },
    { label: 'Wallet', value: formatCurrency(wallet.data?.balance ?? 0), icon: Wallet, color: 'text-accent' },
    { label: 'Rating', value: worker?.rating?.toFixed(1) ?? '—', icon: Star, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Worker dashboard</h1>
          <p className="text-muted-foreground">Manage your jobs, earnings, and performance.</p>
        </div>
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
          {jobs.isLoading ? (
            <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <BookingCardSkeleton key={i} />)}</div>
          ) : !jobs.data?.data?.length ? (
            <EmptyState title="No upcoming jobs" description="New job requests will appear here." icon={<Calendar className="h-8 w-8" />} />
          ) : (
            <div className="space-y-4">
              {jobs.data.data.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Completed jobs" className="mb-4" />
          {completed.isLoading ? (
            <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <BookingCardSkeleton key={i} />)}</div>
          ) : !completed.data?.data?.length ? (
            <EmptyState title="No completed jobs yet" description="Finished jobs will show here." icon={<CheckCircle2 className="h-8 w-8" />} />
          ) : (
            <div className="space-y-4">
              {completed.data.data.slice(0, 3).map((b, i) => <BookingCard key={b._id} booking={b} index={i} />)}
            </div>
          )}
        </div>
      </div>

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
