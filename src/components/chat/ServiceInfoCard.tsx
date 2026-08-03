import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  SERVICE_CATEGORY_IMAGES,
  SERVICE_CATEGORY_GRADIENTS,
} from '@/utils/serviceImages';
import { cn } from '@/lib/utils';

type ServiceCategory = 'plumbing' | 'cleaning' | 'ac_repair' | 'electrician' | 'appliance';

interface ServiceInfoCardProps {
  type: ServiceCategory;
  problem?: string;
}

const categorySlugMap: Record<ServiceCategory, string> = {
  plumbing: 'plumbing',
  cleaning: 'cleaning',
  ac_repair: 'ac-repair',
  electrician: 'electrical',
  appliance: 'appliance-repair',
};

const categoryLabels: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing Service',
  cleaning: 'Cleaning Service',
  ac_repair: 'AC Repair Service',
  electrician: 'Electrician Service',
  appliance: 'Appliance Repair Service',
};

interface CostRow {
  label: string;
  value: string;
}

interface CostBreakdown {
  rows: CostRow[];
  total: string;
}

const costData: Record<ServiceCategory, CostBreakdown> = {
  plumbing: {
    rows: [
      { label: 'Visit Charge', value: '₹199' },
      { label: 'Basic Repair', value: '₹300 – ₹800' },
      { label: 'Material Cost', value: '₹100 – ₹500' },
    ],
    total: '₹500 – ₹1,500',
  },
  cleaning: {
    rows: [
      { label: 'Visit Charge', value: '₹149' },
      { label: 'Basic Cleaning', value: '₹200 – ₹600' },
      { label: 'Material Cost', value: '₹50 – ₹200' },
    ],
    total: '₹350 – ₹950',
  },
  ac_repair: {
    rows: [
      { label: 'Visit Charge', value: '₹249' },
      { label: 'Repair / Service', value: '₹400 – ₹1,200' },
      { label: 'Parts / Gas', value: '₹200 – ₹1,000' },
    ],
    total: '₹849 – ₹2,449',
  },
  electrician: {
    rows: [
      { label: 'Visit Charge', value: '₹199' },
      { label: 'Basic Repair', value: '₹300 – ₹1,000' },
      { label: 'Material Cost', value: '₹100 – ₹500' },
    ],
    total: '₹500 – ₹1,700',
  },
  appliance: {
    rows: [
      { label: 'Visit Charge', value: '₹249' },
      { label: 'Diagnosis', value: '₹200 – ₹500' },
      { label: 'Repair / Parts', value: '₹500 – ₹2,000' },
    ],
    total: '₹950 – ₹2,749',
  },
};

const timeEstimates: Record<ServiceCategory, string> = {
  plumbing: 'Small issue: 30–60 mins · Medium: 1–2 hrs',
  cleaning: '1–3 hours depending on size',
  ac_repair: '30 mins to 3 hours depending on issue',
  electrician: 'Small issue: 30–60 mins · Medium: 1–2 hrs',
  appliance: '30 mins to 2 hours depending on appliance',
};

export function ServiceInfoCard({ type, problem }: ServiceInfoCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const slug = categorySlugMap[type];
  const imageUrl = SERVICE_CATEGORY_IMAGES[slug];
  const gradient = SERVICE_CATEGORY_GRADIENTS[slug] ?? 'from-gray-400 to-gray-500';
  const breakdown = costData[type];
  const time = timeEstimates[type];

  return (
    <div className="mt-2 overflow-hidden rounded-xl border bg-card">
      {/* Image */}
      {!imgError && imageUrl && (
        <img
          src={imageUrl}
          alt={categoryLabels[type]}
          className="h-32 w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {imgError && (
        <div className={cn('flex h-24 items-center justify-center bg-gradient-to-br', gradient)}>
          <p className="text-lg font-bold text-white">{categoryLabels[type]}</p>
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* Title */}
        <h4 className="font-semibold text-card-foreground">{categoryLabels[type]}</h4>

        {/* Cost Breakdown */}
        <div className="space-y-1 text-sm">
          {breakdown.rows.map((row) => (
            <div key={row.label} className="flex justify-between text-muted-foreground">
              <span>{row.label}</span>
              <span className="font-medium text-card-foreground">{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-1 text-sm font-bold text-card-foreground">
            <span>Estimated Total</span>
            <span>{breakdown.total}</span>
          </div>
        </div>

        {/* Time Estimate */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{time}</span>
        </div>

        {/* Book Button */}
        <Button
          size="sm"
          className="w-full"
          onClick={() =>
            navigate(ROUTES.booking, {
              state: {
                category: type,
                service: categoryLabels[type],
                problem: problem || '',
                source: 'chatbot',
              },
            })
          }
        >
          Book Now
        </Button>
      </div>
    </div>
  );
}

export function shouldShowServiceInfo(message: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes('plumber') || lower.includes('pipe')) return true;
  if (lower.includes('clean')) return true;
  if (lower.includes(' ac ')) return true;
  if (lower.startsWith('ac ')) return true;
  if (lower.startsWith('ac')) return true;
  if (lower.includes(' ac')) return true;
  if (lower.endsWith('ac')) return true;
  if (lower.includes('electric')) return true;
  return false;
}
