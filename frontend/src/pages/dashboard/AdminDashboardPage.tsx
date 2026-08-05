import { lazy, Suspense, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles, BarChart3, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/common/States';
import { Skeleton } from '@/components/common/Skeletons';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { LiveWidgets } from '@/components/admin/dashboard/LiveWidgets';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { AlertsPanel } from '@/components/admin/dashboard/AlertsPanel';
import { AiInsightsPanel } from '@/components/admin/dashboard/AiInsightsPanel';

const DashboardCharts = lazy(() => import('@/components/admin/dashboard/DashboardCharts'));

function SectionHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

function ChartsFallback() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl lg:col-span-3" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { isLoading, isError, data, isRefetching, refresh, metrics, liveWidgets, charts, insights, alerts, activity, totals } = useAdminDashboardData();

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  if (isError && !data) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        description="We couldn't reach the platform analytics. Check your connection and try again."
        icon={<TriangleAlert className="h-9 w-9" />}
        action={<Button onClick={refresh} className="gap-2 rounded-full"><RefreshCw className="h-4 w-4" /> Try again</Button>}
      />
    );
  }

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ── Gradient hero header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-hero glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge className="mb-3 gap-1.5 border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Admin Control Center
            </Badge>
            <h1 className="text-2xl font-bold font-display sm:text-3xl">
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] ?? 'Admin'}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{today} &middot; Here&apos;s what&apos;s happening across OneDW today.</p>
          </div>
          <Button
            variant="outline"
            className="glass gap-2 rounded-full shadow-sm"
            onClick={refresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* ── Live widgets ── */}
      <LiveWidgets widgets={liveWidgets} />

      {/* ── Stat cards ── */}
      <section className="space-y-3">
        <SectionHeading title="Platform Overview" subtitle="Key metrics powering your service marketplace" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {metrics.map((m, i) => <StatCard key={m.id} metric={m} index={i} />)}
        </div>
      </section>

      {/* ── Charts (lazy) ── */}
      <section className="space-y-3">
        <SectionHeading
          title="Analytics"
          subtitle="Trends, distribution and popularity insights"
          right={
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Last 6 months
            </span>
          }
        />
        {charts ? (
          <Suspense fallback={<ChartsFallback />}>
            <DashboardCharts charts={charts} />
          </Suspense>
        ) : (
          <ChartsFallback />
        )}
      </section>

      {/* ── AI insights ── */}
      <AiInsightsPanel insights={insights} />

      {/* ── Activity + Alerts ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RecentActivity events={activity} />
        <AlertsPanel alerts={alerts} />
      </div>

      {/* ── Quick actions ── */}
      <section className="space-y-3">
        <SectionHeading title="Quick Actions" subtitle="Jump straight to the most common admin tasks" />
        <QuickActions counts={{
          verification: totals?.pendingVerifications ?? 0,
          complaints: totals?.openComplaints ?? 0,
          emergency: 0,
        }} />
      </section>
    </div>
  );
}
