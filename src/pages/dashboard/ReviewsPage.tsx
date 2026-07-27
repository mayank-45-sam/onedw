import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { reviewService } from '@/services/review.service';
import { queryKeys } from '@/lib/queryClient';
import { StarRating } from '@/components/common/StarRating';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/format';

const LIMIT = 10;

export default function ReviewsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.reviews.all({ page, limit: LIMIT }),
    queryFn: () => reviewService.list({ page, limit: LIMIT }),
    retry: 2,
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Reviews</h1>
        <p className="text-muted-foreground">Feedback from customers on your completed jobs.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="shimmer h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="shimmer h-4 w-1/3 rounded" />
                  <div className="shimmer h-3 w-1/4 rounded" />
                </div>
              </div>
              <div className="shimmer h-4 w-1/2 rounded" />
              <div className="shimmer h-16 w-full rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="card-premium p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-error/10 text-error">
            <Star className="h-7 w-7" />
          </div>
          <h3 className="font-semibold font-display">Couldn't load reviews</h3>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            Something went wrong while loading your reviews. Please check your connection and try again.
          </p>
          <Button onClick={() => refetch()} size="sm" className="mt-4 rounded-full gap-2">
            Try again
          </Button>
        </div>
      ) : !data?.data?.length ? (
        <div className="card-premium p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="font-semibold font-display">No reviews yet</h3>
          <p className="mt-2 max-w-sm mx-auto text-sm text-muted-foreground">
            Reviews from customers will appear here once you complete jobs. Keep up the great work!
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {data.data.map((r, i) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={r.customer?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {r.customer?.name?.charAt(0) ?? 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{r.customer?.name ?? 'Customer'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    {r.recommends && (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <ThumbsUp className="h-3 w-3" /> Recommends
                      </span>
                    )}
                  </div>
                  <StarRating rating={r.rating} size={16} className="mt-3" />
                  <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>
                  {r.workImages?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.workImages.slice(0, 4).map((img, idx) => (
                        <img key={idx} src={img} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-3 text-center text-xs">
                    {(['behaviour', 'quality', 'price', 'time'] as const).map((k) => (
                      <div key={k}>
                        <p className="font-bold">{r[k]}</p>
                        <p className="capitalize text-muted-foreground">{k}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
