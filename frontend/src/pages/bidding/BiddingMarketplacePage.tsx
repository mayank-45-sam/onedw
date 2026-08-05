import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import { ROUTES } from '@/constants/routes';
import { BiddingProvider, useBidding } from '@/features/bidding';
import { PostCustomJobForm } from '@/features/bidding';
import { BidsDashboard } from '@/features/bidding';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomJob } from '@/features/bidding/types';
import type { Category } from '@/types';
import { categoryService } from '@/services';

export function BiddingMarketplacePage() {
  return (
    <BiddingProvider>
      <BiddingMarketplaceContent />
    </BiddingProvider>
  );
}

export default BiddingMarketplacePage;

function BiddingMarketplaceContent() {
  const { user } = useAuth();
  const { getUserJobs, getJobBids, getJob, acceptBid } = useBidding();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<CustomJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CustomJob | null>(null);
  const [showBids, setShowBids] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const userId = user?._id ?? '';

  useEffect(() => {
    if (userId) {
      loadJobs();
      loadCategories();
    }
  }, [userId]);

  const loadJobs = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getUserJobs(userId);
      setJobs(data || []);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.list();
      const arr = Array.isArray(data) ? data : (data as { data?: Category[] }).data ?? [];
      setCategories(arr);
    } catch {
      // handle silently
    }
  };

  const handleJobPosted = (job: CustomJob) => {
    setJobs((prev) => [job, ...prev]);
  };

  const handleViewBids = (job: CustomJob) => {
    setSelectedJob(job);
    setShowBids(true);
  };

  const handleBidAccepted = (result: { job: CustomJob; acceptedBid: import('@/features/bidding/types').WorkerBid }) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === result.job.id ? { ...j, status: result.job.status } : j)),
    );
    setShowBids(false);
    navigate(ROUTES.customerDashboard);
  };

  const filteredJobs = jobs.filter((j) =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Custom Job Marketplace</h1>
            <p className="mt-2 text-muted-foreground">
              Post a custom job and get bids from verified professionals.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Post Custom Job
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your jobs..."
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading your jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No custom jobs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Post your first custom job to get bids from professionals.
            </p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Post Custom Job
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const category = job.categoryId ? categories.find((c) => c._id === job.categoryId) : null;
              const isAccepted = job.status === 'accepted' || job.status === 'completed';
              return (
                <Card key={job.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <span
                          className={
                            job.status === 'open'
                              ? 'text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full'
                              : job.status === 'accepted'
                              ? 'text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full'
                              : 'text-xs font-medium text-muted-foreground bg-muted/20 px-2 py-1 rounded-full'
                          }
                        >
                          {job.status}
                        </span>
                      </div>
                      {category && (
                        <span className="text-xs text-muted-foreground">Category: {category.name}</span>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span>
                          Budget: {formatCurrency(job.budgetMin)} - {formatCurrency(job.budgetMax)}
                        </span>
                        {job.urgency && (
                          <span className="flex items-center gap-1">
                            <span
                              className={
                                job.urgency === 'asap'
                                  ? 'text-red-600'
                                  : job.urgency === 'today'
                                  ? 'text-orange-600'
                                  : 'text-green-600'
                              }
                            >
                              {job.urgency === 'asap'
                                ? '⚡ ASAP'
                                : job.urgency === 'today'
                                ? '📅 Today'
                                : job.urgency === 'weekend'
                                ? '🏠 This Weekend'
                                : '⏰ Anytime'}
                            </span>
                          </span>
                        )}
                      </div>
                      {job.createdAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Posted: {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {!isAccepted && job.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewBids(job)}
                        className="ml-4"
                      >
                        View Bids
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PostCustomJobForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmitSuccess={handleJobPosted}
      />

      {selectedJob && (
        <BidsDashboard
          open={showBids}
          job={selectedJob}
          onClose={() => setShowBids(false)}
          onBidAccepted={handleBidAccepted}
        />
      )}
    </div>
  );
}
