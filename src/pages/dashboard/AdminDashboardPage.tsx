import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  DollarSign, Calendar, Users, Wrench, TrendingUp, TrendingDown, ArrowRight, Percent,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { SectionHeader } from '@/components/common/SectionHeader';
import { DashboardSkeleton } from '@/components/common/Skeletons';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: queryKeys.admin.stats(), queryFn: () => adminService.stats() });
  const revenue = useQuery({ queryKey: queryKeys.admin.revenue({ range: '12m' }), queryFn: () => adminService.revenue({ range: '12m' }) });

  const cards = [
    { label: 'Total revenue', value: stats.data ? formatCurrency(stats.data.totalRevenue) : '—', icon: DollarSign, change: '+12.5%', up: true, color: 'text-success' },
    { label: 'Bookings', value: stats.data?.totalBookings ?? '—', icon: Calendar, change: '+8.2%', up: true, color: 'text-primary' },
    { label: 'Workers', value: stats.data?.totalWorkers ?? '—', icon: Wrench, change: '+5.1%', up: true, color: 'text-accent' },
    { label: 'Customers', value: stats.data?.totalCustomers ?? '—', icon: Users, change: '-1.4%', up: false, color: 'text-warning' },
  ];

  const pieData = [
    { name: 'Completed', value: 68, fill: 'hsl(var(--success))' },
    { name: 'In progress', value: 18, fill: 'hsl(var(--primary))' },
    { name: 'Cancelled', value: 9, fill: 'hsl(var(--error))' },
    { name: 'Refunded', value: 5, fill: 'hsl(var(--muted-foreground))' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Admin overview</h1>
          <p className="text-muted-foreground">Platform performance at a glance.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 rounded-full">
          <Link to={ROUTES.coupons}><Percent className="h-4 w-4" /> Manage coupons</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${c.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${c.up ? 'text-success' : 'text-error'}`}>
                    {c.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {c.change}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold font-display">{c.value}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionHeader title="Revenue trend" subtitle="Monthly revenue over the last year." className="mb-4" />
          {revenue.isLoading ? (
            <DashboardSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue.data ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeader title="Booking status" className="mb-4" />
          {stats.isLoading ? (
            <DashboardSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Manage bookings', to: ROUTES.reviews, icon: Calendar },
          { label: 'Manage workers', to: '/search', icon: Wrench },
          { label: 'Categories', to: ROUTES.categories, icon: Users },
          { label: 'Reports', to: ROUTES.wallet, icon: TrendingUp },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.label} to={m.to} className="card-premium card-premium-hover flex items-center justify-between p-5">
              <span className="flex items-center gap-3 font-medium">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                {m.label}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
