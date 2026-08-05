import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, Star, Phone, CheckCircle2, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarRating } from '@/components/common/StarRating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import type { NearbyWorkerResult } from '@/types';
import { bookingService } from '@/services/booking.service';

interface NearbyWorkersModalProps {
  open: boolean;
  onClose: () => void;
  serviceId?: string;
  serviceBasePrice?: number;
  customerLat?: number;
  customerLng?: number;
  onInstantBook: (workerId: string, eta: number) => void;
}

export function NearbyWorkersModal({
  open,
  onClose,
  serviceId,
  serviceBasePrice = 0,
  customerLat,
  customerLng,
  onInstantBook,
}: NearbyWorkersModalProps) {
  const [workers, setWorkers] = useState<NearbyWorkerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<NearbyWorkerResult | null>(null);

  useEffect(() => {
    if (!open || !customerLat || !customerLng) return;
    setLoading(true);
    bookingService.findNearbyWorkers(customerLat, customerLng, { serviceId })
      .then(setWorkers)
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [open, customerLat, customerLng, serviceId]);

  if (!open) return null;

  const hasCoords = customerLat !== undefined && customerLng !== undefined;

  const handleBook = () => {
    if (!selectedWorker) return;
    onInstantBook(selectedWorker.id, selectedWorker.etaMinutes);
  };

  const finalPrice = serviceBasePrice;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative mx-4 w-full max-w-2xl rounded-2xl bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between rounded-t-2xl border-b px-6 py-4">
            <h3 className="font-semibold font-display text-lg">Nearby Pros</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {!hasCoords ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl h-24 bg-muted" />
                ))}
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl h-24 bg-muted" />
                ))}
              </div>
            ) : workers.length === 0 ? (
              <div className="py-12 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No instant workers available nearby right now. We'll create a regular booking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workers.map((w) => (
                  <WorkerCard
                    key={w.id}
                    worker={w}
                    selected={selectedWorker?.id === w.id}
                    onSelect={setSelectedWorker}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Service price</span>
              <span>{formatCurrency(finalPrice)}</span>
            </div>
            {selectedWorker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>ETA</span>
                  <span className="font-bold">{selectedWorker.etaMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Distance</span>
                  <span>{selectedWorker.distanceKm} km</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Trust score</span>
                  <span>{selectedWorker.trustScore}/100</span>
                </div>
              </motion.div>
            )}
            <Button
              onClick={handleBook}
              disabled={!selectedWorker || loading}
              className="w-full gap-2"
            >
              {workers.length === 0 ? 'Create regular booking' : 'Book now'}
              {selectedWorker && (
                <>
                  <Clock className="h-4 w-4" />
                  {selectedWorker.etaMinutes} min ETA
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WorkerCard({
  worker,
  selected,
  onSelect,
}: {
  worker: NearbyWorkerResult;
  selected: boolean;
  onSelect: (w: NearbyWorkerResult | null) => void;
}) {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground/30',
      )}
      onClick={() => onSelect(selected ? null : worker)}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {worker.avatar ? (
            <img src={worker.avatar} alt={worker.name} className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xs font-bold">
              {worker.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          )}
          {worker.isOnline && (
            <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{worker.name}</h4>
            <StarRating rating={worker.rating} size={12} showValue={false} />
          </div>
          <p className="text-sm text-muted-foreground">{worker.profession}</p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {worker.distanceKm} km
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {worker.etaMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatCurrency(worker.hourlyRate)}/hr
            </span>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
    </Card>
  );
}
