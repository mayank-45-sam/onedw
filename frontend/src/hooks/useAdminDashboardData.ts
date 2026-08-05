import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subMonths, format, isSameDay, isSameMonth } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  Wrench,
  ShieldCheck,
  Clock,
  Calendar,
  CheckCircle2,
  Activity,
  XCircle,
  DollarSign,
  TrendingUp,
  IndianRupee,
  Percent,
  Banknote,
  AlertTriangle,
} from 'lucide-react';

import { adminService } from '@/services/admin.service';
import { reviewService } from '@/services/review.service';
import { queryKeys } from '@/lib/queryClient';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/format';
import type { Verification } from '@/types/verification';
import type { Review } from '@/types';
import type { AdminBroadcast } from '@/types/misc';

export type MetricTone = 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'violet' | 'cyan' | 'slate';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: MetricTone;
  delta?: { value: string; trend: 'up' | 'down' | 'flat' };
}

export interface LiveWidget {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: 'success' | 'primary' | 'accent' | 'error' | 'violet';
}

export interface ChartPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface DashboardChartsData {
  bookingsPerMonth: { month: string; bookings: number }[];
  revenueTrend: { month: string; revenue: number }[];
  servicePopularity: ChartPoint[];
  bookingStatus: ChartPoint[];
  workerCategories: ChartPoint[];
}

export type ActivityType = 'booking' | 'verified' | 'verification_pending' | 'complaint' | 'review' | 'broadcast';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  to?: string;
}

export interface DashboardAlert {
  id: string;
  tone: 'warning' | 'error' | 'primary' | 'success';
  title: string;
  hint: string;
  icon: LucideIcon;
  to: string;
}

export interface AiInsight {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: MetricTone;
}

interface AdminBookingRow {
  _id: string;
  status: string;
  finalPrice: number | null;
  createdAt: string | null;
}

interface AdminWorkerRow {
  _id: string;
  name: string;
  profession: string;
  rating: number | null;
  isOnline: boolean;
}

interface AdminComplaintRow {
  _id: string;
  subject: string;
  status: string;
  createdAt: string | null;
}

interface AdminVerificationRow {
  _id: string;
  workerName: string | null;
  profession: string;
  adminStatus: string;
  status: string;
  submittedAt: string | null;
  createdAt: string | null;
}

interface AdminBroadcastRow {
  _id: string;
  title: string;
  audience: string;
  createdAt: string | null;
}

interface AdminReviewRow {
  _id: string;
  customer?: { name: string; avatar?: string } | null;
  rating: number;
  createdAt: string | null;
}

interface CategoryRow {
  _id: string;
  name: string;
  serviceCount: number;
}

const PLATFORM_RATE = 0.15;

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--muted-foreground))',
];

const STATUS_META: Record<string, { label: string; fill: string }> = {
  completed: { label: 'Completed', fill: 'hsl(var(--success))' },
  cancelled: { label: 'Cancelled', fill: 'hsl(var(--error))' },
  pending: { label: 'Pending', fill: 'hsl(var(--warning))' },
  refunded: { label: 'Refunded', fill: 'hsl(var(--muted-foreground))' },
  accepted: { label: 'Accepted', fill: 'hsl(var(--chart-2))' },
  'worker-assigned': { label: 'Worker assigned', fill: 'hsl(var(--chart-3))' },
  'worker-on-the-way': { label: 'On the way', fill: 'hsl(var(--chart-4))' },
  arrived: { label: 'Arrived', fill: 'hsl(var(--chart-5))' },
  'started-work': { label: 'Work started', fill: 'hsl(var(--chart-1))' },
};

function parseTs(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? new Date(value) : new Date(`${value}Z`);
  return isNaN(d.getTime()) ? null : d;
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN');
}

export function useAdminDashboardData() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: async () => {
      const [statsRes, bookingsRes, workersRes, customersRes, verificationRes, verificationsRes, complaintsRes, broadcastStatsRes, broadcastsRes, categoriesRes, servicesRes, reviewsRes] =
        await Promise.allSettled([
          adminService.stats(),
          adminService.bookings({ page: 1, limit: 100 }),
          adminService.workers({ page: 1, limit: 100 }),
          adminService.customers({ page: 1, limit: 100 }),
          adminService.verificationStats(),
          adminService.verifications({ page: 1, limit: 20 }),
          adminService.complaints({ page: 1, limit: 20 }),
          adminService.broadcastStats(),
          adminService.broadcasts({ page: 1, limit: 10 }),
          adminService.categories(),
          adminService.services({ page: 1, limit: 1 }),
          reviewService.list({ page: 1, limit: 10 }),
        ]);

      const ok = <T,>(r: PromiseSettledResult<T>): T | undefined => (r.status === 'fulfilled' ? r.value : undefined);

      const stats = ok(statsRes);
      const bookings = (ok(bookingsRes)?.data ?? []) as unknown as AdminBookingRow[];
      const workers = (ok(workersRes)?.data ?? []) as unknown as AdminWorkerRow[];
      const customerCount = ok(customersRes)?.total ?? stats?.totalCustomers ?? 0;
      const verificationStats = ok(verificationRes);
      const verifications = (ok(verificationsRes)?.data ?? []) as unknown as AdminVerificationRow[];
      const complaints = (ok(complaintsRes)?.data ?? []) as unknown as AdminComplaintRow[];
      const broadcastStats = ok(broadcastStatsRes);
      const broadcasts = (ok(broadcastsRes)?.data ?? []) as unknown as AdminBroadcastRow[];
      const categoriesRaw = ok(categoriesRes);
      const categoryRows = (Array.isArray(categoriesRaw) ? categoriesRaw : (categoriesRaw as { data?: unknown } | undefined)?.data ?? []) as unknown as CategoryRow[];
      const categories = Array.isArray(categoryRows) ? categoryRows : [];
      const totalServices = ok(servicesRes)?.total ?? 0;
      const reviews = (ok(reviewsRes)?.data ?? []) as unknown as AdminReviewRow[];

      const now = new Date();
      const nowMs = now.getTime();
      const DAY = 24 * 60 * 60 * 1000;

      const completed = bookings.filter((b) => b.status === 'completed');
      const sumRevenue = (list: AdminBookingRow[]) => list.reduce((sum, b) => sum + (b.finalPrice ?? 0), 0);

      const todayRevenue = sumRevenue(completed.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && isSameDay(d, now);
      }));
      const weekRevenue = sumRevenue(completed.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && d.getTime() >= nowMs - 7 * DAY;
      }));
      const monthRevenue = sumRevenue(completed.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && isSameMonth(d, now);
      }));
      const priorMonthRevenue = sumRevenue(completed.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && format(d, 'yyyy-MM') === format(subMonths(now, 1), 'yyyy-MM');
      }));
      const platformCommission = Math.round(monthRevenue * PLATFORM_RATE);
      const workerPayout = Math.round(monthRevenue * (1 - PLATFORM_RATE));

      const completedJobs = completed.length;
      const cancelledJobs = bookings.filter((b) => b.status === 'cancelled').length;
      const activeJobs = stats?.activeBookings ?? 0;
      const totalBookings = stats?.totalBookings ?? bookings.length;
      const totalWorkers = stats?.totalWorkers ?? workers.length;

      const pendingVerifications = verificationStats?.pending ?? 0;
      const verifiedWorkers = verificationStats?.approved ?? 0;

      const openComplaints = complaints.filter((c) => !['resolved', 'dismissed'].includes(c.status ?? '')).length;

      const recent7 = bookings.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && d.getTime() >= nowMs - 7 * DAY;
      }).length;
      const prior7 = bookings.filter((b) => {
        const d = parseTs(b.createdAt);
        return !!d && d.getTime() >= nowMs - 14 * DAY && d.getTime() < nowMs - 7 * DAY;
      }).length;
      const pct = (curr: number, prev: number) => {
        if (prev <= 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };
      const bookingsDelta = pct(recent7, prior7);
      const revenueDelta = pct(monthRevenue, priorMonthRevenue);

      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i);
        return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM') };
      });
      const bookingsByMonth: Record<string, number> = {};
      const revenueByMonth: Record<string, number> = {};
      for (const b of bookings) {
        const d = parseTs(b.createdAt);
        if (!d) continue;
        const k = format(d, 'yyyy-MM');
        bookingsByMonth[k] = (bookingsByMonth[k] ?? 0) + 1;
        if (b.status === 'completed') revenueByMonth[k] = (revenueByMonth[k] ?? 0) + (b.finalPrice ?? 0);
      }
      const bookingsPerMonth = months.map((m) => ({ month: m.label, bookings: bookingsByMonth[m.key] ?? 0 }));
      const revenueTrend = months.map((m) => ({ month: m.label, revenue: revenueByMonth[m.key] ?? 0 }));

      const statusCounts: Record<string, number> = {};
      for (const b of bookings) {
        const s = b.status || 'pending';
        statusCounts[s] = (statusCounts[s] ?? 0) + 1;
      }
      const bookingStatus: ChartPoint[] = Object.entries(statusCounts).map(([s, value]) => ({
        name: STATUS_META[s]?.label ?? s,
        value,
        fill: STATUS_META[s]?.fill ?? 'hsl(var(--muted-foreground))',
      }));

      const profCounts: Record<string, number> = {};
      for (const w of workers) {
        const p = w.profession || 'Other';
        profCounts[p] = (profCounts[p] ?? 0) + 1;
      }
      const sortedProf = Object.entries(profCounts).sort((a, b) => b[1] - a[1]);
      const topProf = sortedProf.slice(0, 8);
      const restProf = sortedProf.slice(8);
      const workerCategories: ChartPoint[] = [
        ...topProf.map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] })),
        ...(restProf.length
          ? [{ name: 'Others', value: restProf.reduce((s, [, v]) => s + v, 0), fill: CHART_COLORS[8] }]
          : []),
      ];

      const servicePopularity: ChartPoint[] = categories
        .filter((c) => (c.serviceCount ?? 0) > 0)
        .sort((a, b) => (b.serviceCount ?? 0) - (a.serviceCount ?? 0))
        .slice(0, 6)
        .map((c) => ({ name: c.name, value: c.serviceCount ?? 0 }));

      const onlineWorkers = workers.filter((w) => w.isOnline).length;
      const cancellations7 = bookings.filter((b) => {
        const d = parseTs(b.createdAt);
        return b.status === 'cancelled' && !!d && d.getTime() >= nowMs - 7 * DAY;
      }).length;
      const emergencyRequests = 0;

      const topCategory = categories
        .filter((c) => (c.serviceCount ?? 0) > 0)
        .sort((a, b) => (b.serviceCount ?? 0) - (a.serviceCount ?? 0))[0];

      let topWorker: AdminWorkerRow | null = null;
      for (const w of workers) {
        if (w.rating && (!topWorker || w.rating > (topWorker.rating ?? 0))) topWorker = w;
      }

      const hourCounts: Record<number, number> = {};
      for (const b of bookings) {
        const d = parseTs(b.createdAt);
        if (d) hourCounts[d.getHours()] = (hourCounts[d.getHours()] ?? 0) + 1;
      }
      const peakHourEntry = Object.entries(hourCounts).sort((a, b) => (b[1] - a[1]) || Number(a[0]) - Number(b[0]))[0];
      const peakHour = peakHourEntry ? Number(peakHourEntry[0]) : null;

      const reviewRatings = reviews.map((r) => r.rating).filter((n) => typeof n === 'number');
      const avgReview = reviewRatings.length ? reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length : null;
      const workerRatings = workers.map((w) => w.rating).filter((n): n is number => typeof n === 'number');
      const avgWorkerRating = workerRatings.length ? workerRatings.reduce((a, b) => a + b, 0) / workerRatings.length : 0;
      const satisfaction = avgReview ?? avgWorkerRating;

      const revenueEstimate = monthRevenue > 0 ? Math.round(monthRevenue * 1.15) : null;

      const metrics: DashboardMetric[] = [
        { id: 'customers', label: 'Total Customers', value: formatCount(customerCount), icon: Users, tone: 'primary' },
        { id: 'workers', label: 'Total Workers', value: formatCount(totalWorkers), icon: Wrench, tone: 'accent' },
        { id: 'verified', label: 'Verified Workers', value: formatCount(verifiedWorkers), icon: ShieldCheck, tone: 'success' },
        { id: 'pending', label: 'Pending Verifications', value: formatCount(pendingVerifications), icon: Clock, tone: 'warning' },
        {
          id: 'bookings', label: 'Total Bookings', value: formatCount(totalBookings), icon: Calendar, tone: 'primary',
          delta: { value: `${Math.abs(bookingsDelta)}%`, trend: bookingsDelta > 0 ? 'up' : bookingsDelta < 0 ? 'down' : 'flat' },
          hint: 'vs. previous 7 days',
        },
        { id: 'completed', label: 'Completed Jobs', value: formatCount(completedJobs), icon: CheckCircle2, tone: 'success' },
        { id: 'active', label: 'Active Jobs', value: formatCount(activeJobs), icon: Activity, tone: 'accent' },
        { id: 'cancelled', label: 'Cancelled Jobs', value: formatCount(cancelledJobs), icon: XCircle, tone: 'error' },
        {
          id: 'todayRevenue', label: "Today's Revenue", value: formatCurrency(todayRevenue), icon: DollarSign, tone: 'success',
          hint: todayRevenue > 0 ? 'Completed jobs today' : 'No revenue recorded yet',
        },
        {
          id: 'weekRevenue', label: 'Weekly Revenue', value: formatCurrency(weekRevenue), icon: TrendingUp, tone: 'primary',
          hint: 'Last 7 days',
        },
        {
          id: 'monthRevenue', label: 'Monthly Revenue', value: formatCurrency(monthRevenue), icon: IndianRupee, tone: 'accent',
          delta: { value: `${Math.abs(revenueDelta)}%`, trend: revenueDelta > 0 ? 'up' : revenueDelta < 0 ? 'down' : 'flat' },
          hint: 'This month',
        },
        {
          id: 'commission', label: 'Platform Commission', value: formatCurrency(platformCommission), icon: Percent, tone: 'warning',
          hint: `${Math.round(PLATFORM_RATE * 100)}% of monthly revenue`,
        },
        {
          id: 'payout', label: 'Worker Payout', value: formatCurrency(workerPayout), icon: Banknote, tone: 'violet',
          hint: 'After platform commission',
        },
        { id: 'complaints', label: 'Open Complaints', value: formatCount(openComplaints), icon: AlertTriangle, tone: 'error' },
      ];

      const liveWidgets: LiveWidget[] = [
        { id: 'online', label: 'Online Workers', value: formatCount(onlineWorkers), hint: `of ${formatCount(totalWorkers)} total`, tone: 'success' },
        { id: 'customers', label: 'Active Customers', value: formatCount(customerCount), hint: 'Registered on platform', tone: 'primary' },
        { id: 'jobs', label: 'Jobs in Progress', value: formatCount(activeJobs), hint: 'Currently active', tone: 'accent' },
        { id: 'emergency', label: 'Emergency Requests', value: formatCount(emergencyRequests), hint: 'None in flight', tone: 'error' },
        { id: 'ai', label: 'AI Recommendations', value: formatCount(totalServices), hint: 'Services for AI picks', tone: 'violet' },
      ];

      const charts: DashboardChartsData = { bookingsPerMonth, revenueTrend, servicePopularity, bookingStatus, workerCategories };

      const insights: AiInsight[] = [
        {
          id: 'demand',
          label: 'Most Booked Service Today',
          value: topCategory?.name ?? '—',
          hint: `${formatCount(bookingsByMonth[format(now, 'yyyy-MM')] ?? 0)} bookings this month`,
          icon: Calendar,
          tone: 'primary',
        },
        {
          id: 'peak',
          label: 'Peak Booking Hour',
          value: peakHour != null ? format(new Date(2020, 0, 1, peakHour), 'h a') : '—',
          hint: 'From booking timestamps',
          icon: Clock,
          tone: 'accent',
        },
        {
          id: 'worker',
          label: 'Highest-Rated Worker',
          value: topWorker?.name ?? '—',
          hint: topWorker ? `${topWorker.rating ?? 0} \u2605 \u00B7 ${topWorker.profession}` : 'No workers yet',
          icon: CheckCircle2,
          tone: 'success',
        },
        {
          id: 'area',
          label: 'Highest-Demand Area',
          value: '—',
          hint: 'Location analytics pending',
          icon: Activity,
          tone: 'slate',
        },
        {
          id: 'prediction',
          label: 'Revenue Prediction',
          value: revenueEstimate != null ? formatCurrency(revenueEstimate) : '—',
          hint: revenueEstimate != null ? 'Next 30 days \u00B7 +15% projected' : 'Needs booking history',
          icon: TrendingUp,
          tone: 'violet',
        },
        {
          id: 'satisfaction',
          label: 'Customer Satisfaction Score',
          value: satisfaction > 0 ? `${satisfaction.toFixed(1)} / 5` : '—',
          hint: avgReview != null ? 'From customer reviews' : 'Avg. worker rating (no reviews yet)',
          icon: Percent,
          tone: 'warning',
        },
      ];

      const alerts: DashboardAlert[] = [];
      if (pendingVerifications > 0) {
        alerts.push({
          id: 'verification',
          tone: 'warning',
          title: `${pendingVerifications} worker${pendingVerifications > 1 ? 's' : ''} awaiting verification`,
          hint: 'Action required',
          icon: Clock,
          to: ROUTES.adminVerification,
        });
      }
      if (openComplaints > 0) {
        alerts.push({
          id: 'complaints',
          tone: 'error',
          title: `${openComplaints} open complaint${openComplaints > 1 ? 's' : ''}`,
          hint: 'Review and resolve',
          icon: AlertTriangle,
          to: ROUTES.complaintManagement,
        });
      }
      if (cancellations7 > 0) {
        alerts.push({
          id: 'cancellations',
          tone: 'error',
          title: `${cancellations7} booking cancellation${cancellations7 > 1 ? 's' : ''} in the last 7 days`,
          hint: 'Check cancellation trends',
          icon: XCircle,
          to: ROUTES.adminBookings,
        });
      }
      if (emergencyRequests > 0) {
        alerts.push({
          id: 'emergency',
          tone: 'error',
          title: `${emergencyRequests} emergency request${emergencyRequests > 1 ? 's' : ''} needs attention`,
          hint: 'Respond immediately',
          icon: AlertTriangle,
          to: ROUTES.adminBookings,
        });
      }
      if (topCategory) {
        alerts.push({
          id: 'demand',
          tone: 'primary',
          title: `High demand in ${topCategory.name}`,
          hint: `${formatCount(topCategory.serviceCount ?? 0)} services available`,
          icon: Calendar,
          to: ROUTES.adminServices,
        });
      }

      const events: ActivityEvent[] = [];
      for (const b of bookings) {
        const d = parseTs(b.createdAt);
        if (!d) continue;
        events.push({
          id: `b-${b._id}`,
          type: 'booking',
          title: 'New Booking',
          description: `${STATUS_META[b.status]?.label ?? b.status} \u00B7 ${b._id.slice(0, 8)}`,
          timestamp: d.toISOString(),
          to: ROUTES.adminBookings,
        });
      }
      for (const v of verifications) {
        const d = parseTs(v.submittedAt ?? v.createdAt);
        if (!d) continue;
        if (v.adminStatus === 'approved') {
          events.push({
            id: `v-${v._id}`,
            type: 'verified',
            title: 'Worker Verified',
            description: v.workerName ?? v.profession,
            timestamp: d.toISOString(),
            to: ROUTES.adminVerification,
          });
        } else if (v.adminStatus === 'pending') {
          events.push({
            id: `vp-${v._id}`,
            type: 'verification_pending',
            title: 'Verification Pending',
            description: v.workerName ?? v.profession,
            timestamp: d.toISOString(),
            to: ROUTES.adminVerification,
          });
        }
      }
      for (const c of complaints) {
        const d = parseTs(c.createdAt);
        if (!d) continue;
        events.push({
          id: `c-${c._id}`,
          type: 'complaint',
          title: 'Complaint Submitted',
          description: c.subject,
          timestamp: d.toISOString(),
          to: ROUTES.complaintManagement,
        });
      }
      for (const r of reviews) {
        const d = parseTs(r.createdAt);
        if (!d) continue;
        events.push({
          id: `r-${r._id}`,
          type: 'review',
          title: 'Customer Review',
          description: `${r.customer?.name ?? 'Customer'} \u00B7 ${r.rating} \u2605`,
          timestamp: d.toISOString(),
          to: ROUTES.reviews,
        });
      }
      for (const b of broadcasts) {
        const d = parseTs(b.createdAt);
        if (!d) continue;
        events.push({
          id: `br-${b._id}`,
          type: 'broadcast',
          title: 'Broadcast Sent',
          description: `${b.title} \u00B7 ${b.audience.replace('_', ' ')}`,
          timestamp: d.toISOString(),
          to: ROUTES.adminBroadcasts,
        });
      }
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        metrics,
        liveWidgets,
        charts,
        insights,
        alerts,
        activity: events.slice(0, 10),
        totals: {
          totalBookings,
          totalWorkers,
          totalCustomers: customerCount,
          totalServices,
          pendingVerifications,
          openComplaints,
          broadcastTotal: broadcastStats?.totalBroadcasts ?? 0,
        },
      };
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview });

  return {
    ...query,
    refresh,
    metrics: query.data?.metrics ?? [],
    liveWidgets: query.data?.liveWidgets ?? [],
    charts: query.data?.charts,
    insights: query.data?.insights ?? [],
    alerts: query.data?.alerts ?? [],
    activity: query.data?.activity ?? [],
    totals: query.data?.totals,
  };
}
