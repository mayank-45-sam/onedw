import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/queryClient';
import { SectionHeader } from '@/components/common/SectionHeader';
import { LoadingState, ErrorState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/format';
import { useState } from 'react';

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '12m'>('30d');

  const stats = useQuery({
    queryKey: queryKeys.admin.stats({ range: timeRange }),
    queryFn: () => adminService.stats({ from: timeRange }),
  });

  const revenue = useQuery({
    queryKey: queryKeys.admin.revenue({ range: timeRange }),
    queryFn: () => adminService.revenue({ range: timeRange }),
  });

  const metrics = [
    {
      label: 'Total Revenue',
      value: stats.data ? formatCurrency(stats.data.totalRevenue) : '—',
      icon: DollarSign,
      change: '+12.5%',
      up: true,
      color: 'text-success',
    },
    {
      label: 'Total Bookings',
      value: stats.data?.totalBookings ?? '—',
      icon: Calendar,
      change: '+8.2%',
      up: true,
      color: 'text-primary',
    },
    {
      label: 'Active Workers',
      value: stats.data?.totalWorkers ?? '—',
      icon: Users,
      change: '+5.1%',
      up: true,
      color: 'text-accent',
    },
    {
      label: 'Completion Rate',
      value: stats.data ? `${stats.data.completionRate}%` : '—',
      icon: TrendingUp,
      change: '+2.3%',
      up: true,
      color: 'text-warning',
    },
  ];

  const bookingStatusData = [
    { name: 'Completed', value: 68, fill: 'hsl(var(--success))' },
    { name: 'In Progress', value: 18, fill: 'hsl(var(--primary))' },
    { name: 'Cancelled', value: 9, fill: 'hsl(var(--error))' },
    { name: 'Pending', value: 5, fill: 'hsl(var(--warning))' },
  ];

  const servicePopularityData = [
    { name: 'Plumbing', bookings: 245, revenue: 24500 },
    { name: 'Electrical', bookings: 189, revenue: 18900 },
    { name: 'Cleaning', bookings: 156, revenue: 15600 },
    { name: 'HVAC', bookings: 134, revenue: 13400 },
    { name: 'Carpentry', bookings: 98, revenue: 9800 },
  ];

  const customerGrowthData = [
    { month: 'Jan', customers: 120 },
    { month: 'Feb', customers: 145 },
    { month: 'Mar', customers: 168 },
    { month: 'Apr', customers: 192 },
    { month: 'May', customers: 215 },
    { month: 'Jun', customers: 238 },
  ];

  if (stats.isLoading || revenue.isLoading) {
    return <LoadingState title="Loading analytics..." />;
  }

  if (stats.isError || revenue.isError) {
    return <ErrorState title="Failed to load analytics" icon={<TrendingUp className="h-8 w-8" />} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Analytics</h1>
          <p className="text-muted-foreground">Platform performance insights and trends.</p>
        </div>
        <Select value={timeRange} onValueChange={(v: '7d' | '30d' | '12m') => setTimeRange(v)}>
          <SelectTrigger className="w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${metric.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${metric.up ? 'text-success' : 'text-error'}`}>
                    {metric.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />} {metric.change}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold font-display">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <SectionHeader title="Revenue Trend" subtitle="Revenue over time" className="mb-4" />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenue.data ?? []}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revenueGradient)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Status */}
        <Card className="p-6">
          <SectionHeader title="Booking Status Distribution" className="mb-4" />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={bookingStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {bookingStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Service Popularity */}
        <Card className="p-6">
          <SectionHeader title="Service Popularity" className="mb-4" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={servicePopularityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Customer Growth */}
      <Card className="p-6">
        <SectionHeader title="Customer Growth" subtitle="New customer acquisition over time" className="mb-4" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={customerGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Bar dataKey="customers" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
