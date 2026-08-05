import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Percent, ArrowRight, Calendar } from 'lucide-react';
import { offerService } from '@/services/marketing.service';
import { queryKeys } from '@/lib/queryClient';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';

export default function OffersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.offers.all({ limit: 20 }),
    queryFn: () => offerService.list({ limit: 20 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Offers</h1>
        <p className="text-muted-foreground">Limited-time deals you won't want to miss.</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState title="Couldn't load offers" icon={<Percent className="h-8 w-8" />} />
      ) : !data?.data?.length ? (
        <EmptyState title="No offers right now" description="New offers drop regularly — check back soon." icon={<Percent className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {data.data.map((o, i) => (
            <motion.div key={o._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="card-premium card-premium-hover group overflow-hidden p-0">
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                  {o.image && <img src={o.image} alt={o.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                  {o.badge && <Badge className="absolute left-3 top-3">{o.badge}</Badge>}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold font-display">{o.title}</h3>
                  <p className="text-sm text-muted-foreground">{o.subtitle}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Until {formatDate(o.validUntil)}</span>
                    <Button asChild size="sm" className="btn-glow gap-1.5 rounded-full">
                      <Link to={o.ctaLink}>{o.ctaLabel} <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
