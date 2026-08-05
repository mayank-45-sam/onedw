import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import type { DashboardChartsData } from '@/hooks/useAdminDashboardData';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontSize: 12,
} as const;

const axisProps = {
  tickLine: false,
  axisLine: false,
  fontSize: 12,
  stroke: 'hsl(var(--muted-foreground))',
} as const;

function ChartCard({ title, subtitle, className, children }: { title: string; subtitle: string; className?: string; children: ReactNode }) {
  return (
    <Card className={`rounded-3xl border-border/60 bg-card/70 p-5 backdrop-blur-xl sm:p-6 ${className ?? ''}`}>
      <div className="mb-4">
        <h3 className="font-display text-sm font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <div className="h-10 w-10 rounded-xl bg-muted" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70">New data will appear here automatically.</p>
    </div>
  );
}

export default function DashboardCharts({ charts }: { charts: DashboardChartsData }) {
  const hasBookings = charts.bookingsPerMonth.some((d) => d.bookings > 0);
  const hasRevenue = charts.revenueTrend.some((d) => d.revenue > 0);
  const hasStatus = charts.bookingStatus.length > 0;
  const hasProf = charts.workerCategories.length > 0;
  const hasServices = charts.servicePopularity.length > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ChartCard
        title="Bookings per Month"
        subtitle="Booking volume over the last 6 months"
        className="lg:col-span-2"
      >
        {!hasBookings ? (
          <EmptyChart message="No bookings yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.bookingsPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="bookings" name="Bookings" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Booking Status" subtitle="Current distribution of bookings">
        {!hasStatus ? (
          <EmptyChart message="No bookings yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.bookingStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {charts.bookingStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Revenue Trend"
        subtitle="Completed job revenue over the last 6 months"
        className="lg:col-span-2"
      >
        {!hasRevenue ? (
          <EmptyChart message="No revenue recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.revenueTrend}>
              <defs>
                <linearGradient id="revTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis tickFormatter={(v: number) => formatCurrency(v)} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2.5} fill="url(#revTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Worker Categories" subtitle="Workers by profession">
        {!hasProf ? (
          <EmptyChart message="No workers yet" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.workerCategories} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2}>
                {charts.workerCategories.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Service Popularity"
        subtitle="Top categories by number of live services"
        className="lg:col-span-3"
      >
        {!hasServices ? (
          <EmptyChart message="No services yet" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={charts.servicePopularity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} angle={-18} textAnchor="end" height={46} />
              <YAxis allowDecimals={false} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="value" name="Services" radius={[8, 8, 0, 0]}>
                {charts.servicePopularity.map((_, i) => (
                  <Cell key={i} fill={['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--accent))'][i % 6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
