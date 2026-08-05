import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMapGeolocation } from '@/hooks/useGeolocation';
import { bookingService } from '@/services/booking.service';
import type { MapLocation } from '@/components/common/MapView';
import toast from 'react-hot-toast';
import type { Service } from '@/types';
import { NearbyWorkersModal } from './NearbyWorkersModal';

interface EmergencyBookingButtonProps {
  service: Service;
  className?: string;
  onBookingComplete?: () => void;
}

export function EmergencyBookingButton({ service, className, onBookingComplete }: EmergencyBookingButtonProps) {
  const [showWorkers, setShowWorkers] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
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

  const handleEmergencyBook = async (workerId: string, eta: number) => {
    if (!customerLocation) return;

    setIsBooking(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const time = now.toTimeString().slice(0, 5);

      const result = await bookingService.createInstant({
        serviceId: service._id,
        problemDescription: `Emergency booking for ${service.name}`,
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
        isEmergency: true,
      });

      if (result.fallback) {
        toast.success('No pro available right now. Booking created as a regular request.');
      } else if (result.surgeApplied) {
        toast.success(
          `Emergency booking confirmed! ${result.assignedWorker?.name} is ${eta} min away. (+20% surge)`,
        );
      } else {
        toast.success(
          `Emergency booking confirmed! ${result.assignedWorker?.name} is ${eta} min away.`,
        );
      }
      onBookingComplete?.();
    } catch (err) {
      toast.error('Unable to create emergency booking. Please try again.');
    } finally {
      setIsBooking(false);
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
            'relative border-red-300 bg-gradient-to-r from-red-50 to-orange-50 font-semibold text-red-700 hover:from-red-100 hover:to-orange-100 dark:from-red-950/20 dark:to-orange-900/20 dark:text-red-400',
            className,
          )}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Emergency Booking
        </Button>
      </motion.div>

      <NearbyWorkersModal
        open={showWorkers}
        onClose={() => setShowWorkers(false)}
        serviceId={service._id}
        serviceBasePrice={service.basePrice}
        customerLat={customerLocation?.lat}
        customerLng={customerLocation?.lng}
        onInstantBook={handleEmergencyBook}
      />
    </>
  );
}
