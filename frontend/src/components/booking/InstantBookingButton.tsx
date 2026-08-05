import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NearbyWorkersModal } from './NearbyWorkersModal';
import { InstantBookingBadge } from './InstantBookingBadge';
import { useMapGeolocation } from '@/hooks/useGeolocation';
import type { MapLocation } from '@/components/common/MapView';
import { bookingService } from '@/services/booking.service';
import toast from 'react-hot-toast';
import type { Service } from '@/types';

interface InstantBookingButtonProps {
  service: Service;
  className?: string;
  onBookingComplete?: () => void;
}

export function InstantBookingButton({ service, className, onBookingComplete }: InstantBookingButtonProps) {
  const [showWorkers, setShowWorkers] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<MapLocation | null>(null);
  const geo = useMapGeolocation();

  const handleOpenWorkers = async () => {
    const loc = await geo.request();
    if (!loc) {
      toast.error('Location access is needed to find nearby pros.');
      return;
    }
    setCustomerLocation(loc);
    setShowWorkers(true);
  };

  const handleInstantBook = async (workerId: string, eta: number) => {
    if (!customerLocation) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    try {
      const result = await bookingService.createInstant({
        serviceId: service._id,
        problemDescription: `Instant booking for ${service.name}`,
        scheduledDate: today,
        scheduledTime: time,
        address: {
          line1: 'Current location',
          city: 'Nearby',
          state: 'Nearby',
          postalCode: '000000',
          country: 'India',
          lat: customerLocation.lat,
          lng: customerLocation.lng,
        },
        customerLat: customerLocation.lat,
        customerLng: customerLocation.lng,
        isEmergency: false,
      });

      if (result.fallback) {
        toast.success('No pro available right now. Booking created as a regular request.');
      } else {
        toast.success(
          `Instant booking confirmed! ${result.assignedWorker?.name} is ${eta} min away.`,
        );
      }
      onBookingComplete?.();
    } catch (err) {
      toast.error('Unable to create instant booking. Please try a regular booking.');
    } finally {
      setShowWorkers(false);
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={handleOpenWorkers}
          variant="outline"
          className={cn(
            'relative border-primary/30 bg-gradient-to-r from-blue-50 to-cyan-50 font-semibold text-blue-700 hover:from-blue-100 hover:to-cyan-100 dark:from-blue-950/20 dark:to-cyan-900/20 dark:text-blue-400',
            className,
          )}
        >
          <Zap className="mr-2 h-4 w-4" />
          Instant Booking
          <InstantBookingBadge type="instant" className="absolute -top-2 -right-2 scale-75" />
        </Button>
      </motion.div>

      <NearbyWorkersModal
        open={showWorkers}
        onClose={() => setShowWorkers(false)}
        serviceId={service._id}
        serviceBasePrice={service.basePrice}
        customerLat={customerLocation?.lat}
        customerLng={customerLocation?.lng}
        onInstantBook={handleInstantBook}
      />
    </>
  );
}
