import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

type ServiceCategory = 'plumbing' | 'cleaning' | 'ac_repair' | 'electrician';

interface BookingCardProps {
  category: ServiceCategory;
  problem?: string;
}

const categoryLabels: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing Service',
  cleaning: 'Cleaning Service',
  ac_repair: 'AC Repair Service',
  electrician: 'Electrician Service',
};

const categoryPrices: Record<ServiceCategory, string> = {
  plumbing: '$15–$40',
  cleaning: '$10–$30',
  ac_repair: '$20–$50',
  electrician: '$15–$45',
};

export function BookingCard({ category, problem }: BookingCardProps) {
  const navigate = useNavigate();

  return (
    <div className="mt-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-medium">{categoryLabels[category]}</p>
      <p className="text-xs text-muted-foreground">{categoryPrices[category]}</p>
      <Button
        size="sm"
        className="mt-2 w-full"
        onClick={() =>
          navigate(ROUTES.booking, {
            state: { category, service: categoryLabels[category], problem: problem || '', source: 'chatbot' },
          })
        }
      >
        Book Now
      </Button>
    </div>
  );
}

export function shouldShowBookingCard(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('book') ||
    lower.includes('venuma') ||
    lower.includes('service')
  );
}

export function detectCategory(message: string): ServiceCategory | null {
  const lower = message.toLowerCase();
  if (lower.includes('plumber') || lower.includes('pipe')) return 'plumbing';
  if (lower.includes('clean')) return 'cleaning';
  if (lower.includes('ac')) return 'ac_repair';
  if (lower.includes('electric')) return 'electrician';
  return null;
}
