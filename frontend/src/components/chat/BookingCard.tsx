import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

type ServiceCategory = 'plumbing' | 'cleaning' | 'ac_repair' | 'electrician' | 'appliance' | 'pest_control' | 'painting';

interface BookingCardProps {
  category: ServiceCategory;
  problem?: string;
}

const categoryLabels: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing Service',
  cleaning: 'Cleaning Service',
  ac_repair: 'AC Repair Service',
  electrician: 'Electrician Service',
  appliance: 'Appliance Repair Service',
  pest_control: 'Pest Control Service',
  painting: 'Home Painting Service',
};

const categoryPrices: Record<ServiceCategory, string> = {
  plumbing: '₹500 – ₹1,500',
  cleaning: '₹350 – ₹950',
  ac_repair: '₹849 – ₹2,449',
  electrician: '₹500 – ₹1,700',
  appliance: '₹950 – ₹2,749',
  pest_control: '₹499 – ₹1,299',
  painting: '₹2,000 – ₹8,000',
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
  if (/(plumb|pipe|leak|tap|sink|drain|toilet|faucet|shower)/.test(lower)) return 'plumbing';
  if (/(clean|maid|vacuum|dust|mop|housekeeping)/.test(lower)) return 'cleaning';
  if (/(\bac\b|air condition|cooling|refrigerant|thermostat|condenser)/.test(lower)) return 'ac_repair';
  if (/(electric|wire|switch|fuse|circuit|voltage|outlet|fan)/.test(lower)) return 'electrician';
  if (/(fridge|refrigerator|washing machine|microwave|oven|toaster|dishwasher|appliance|chimney|geyser)/.test(lower)) return 'appliance';
  if (/(pest|termite|cockroach|ant|rodent|mosquito|bedbug|insect)/.test(lower)) return 'pest_control';
  if (/(paint|painting|paintwork|repaint|wall colour|wall color)/.test(lower)) return 'painting';
  return null;
}
