export const APP_NAME = 'OneDW';
export const APP_TAGLINE = 'Premium on-demand services, on your schedule.';
export const APP_DESCRIPTION =
  'Book trusted local pros for home, beauty, and repair services in minutes. Verified workers, transparent pricing, real-time tracking.';

export const CURRENCY = {
  code: 'USD',
  symbol: '$',
  locale: 'en-US',
};

export const SERVICE_ICONS: Record<string, string> = {
  cleaning: 'Sparkles',
  plumbing: 'Wrench',
  electrical: 'Zap',
  beauty: 'Scissors',
  carpentry: 'Hammer',
  painting: 'PaintRoller',
  ac_repair: 'Wind',
  appliance: 'Refrigerator',
  gardening: 'Trees',
  moving: 'Truck',
};

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Choose a service',
    description: 'Browse categories and pick the service you need, with transparent pricing upfront.',
    icon: 'Search',
  },
  {
    step: 2,
    title: 'Describe your problem',
    description: 'Add details and upload photos so your pro arrives fully prepared.',
    icon: 'Camera',
  },
  {
    step: 3,
    title: 'Pick a verified pro',
    description: 'Compare ratings, reviews, and availability — or let our AI recommend the best match.',
    icon: 'UserCheck',
  },
  {
    step: 4,
    title: 'Track & relax',
    description: 'Live ETA, in-app chat, and secure payments. Leave a review when the job is done.',
    icon: 'MapPin',
  },
] as const;

export const STATS = [
  { label: 'Completed jobs', value: '120K+', icon: 'CheckCircle2' },
  { label: 'Verified pros', value: '8,500+', icon: 'BadgeCheck' },
  { label: 'Avg. rating', value: '4.9', icon: 'Star' },
  { label: 'Cities served', value: '42', icon: 'MapPin' },
] as const;

export const TRUST_BADGES = [
  'Background-checked pros',
  'Upfront transparent pricing',
  'Satisfaction guaranteed',
  '24/7 customer support',
] as const;
