import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Ticket, Calendar, Copy, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { couponService } from '@/services/marketing.service';
import { queryKeys } from '@/lib/queryClient';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils/format';

export default function CouponsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.coupons.all({ limit: 20 }),
    queryFn: () => couponService.list({ limit: 20 }),
  });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Code copied');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Coupons</h1>
        <p className="text-muted-foreground">Save on your next booking with these offers.</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load coupons" icon={<Ticket className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No coupons available" description="Check back soon for new deals." icon={<Ticket className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.data.map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="relative overflow-hidden p-0">
                <div className="flex">
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-brand-gradient p-4 text-white">
                    <span className="text-2xl font-extrabold">{c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}</span>
                    <span className="text-xs">OFF</span>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold font-display">{c.title}</h3>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                      </div>
                      {c.isActive ? <Badge className="bg-success/15 text-success border-success/30">Active</Badge> : <Badge variant="secondary">Expired</Badge>}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Until {formatDate(c.validUntil)}</span>
                      <button onClick={() => copy(c.code)} className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-primary px-3 py-1 font-mono text-sm font-bold text-primary transition hover:bg-primary/5">
                        {copied === c.code ? <><CheckCheck className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> {c.code}</>}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
