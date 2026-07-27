import {
  Wrench, Zap, Wind, Sparkles, Paintbrush, Hammer, Bug, Settings,
  Refrigerator, Droplets, Tv, Waves, Cctv, Sofa, Truck, Flower2,
  HeartPulse, ChefHat, GraduationCap, Baby, PawPrint, Shirt, Car,
  Scissors, Home, type LucideIcon,
} from 'lucide-react';

export const SERVICE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  plumbing: Wrench,
  electrical: Zap,
  'ac-repair': Wind,
  cleaning: Sparkles,
  'home-painting': Paintbrush,
  carpentry: Hammer,
  'pest-control': Bug,
  'appliance-repair': Settings,
  'refrigerator-repair': Refrigerator,
  'washing-machine-repair': Droplets,
  'tv-repair': Tv,
  'ro-water-purifier': Waves,
  'cctv-installation': Cctv,
  'interior-design': Sofa,
  'home-shifting': Truck,
  gardening: Flower2,
  'beauty-at-home': Scissors,
  'spa-massage': HeartPulse,
  'cooking-home-chef': ChefHat,
  'home-tutor': GraduationCap,
  babysitting: Baby,
  'elder-care': HeartPulse,
  'pet-care': PawPrint,
  laundry: Shirt,
  'car-wash': Car,
};

export const SERVICE_CATEGORY_GRADIENTS: Record<string, string> = {
  plumbing: 'from-blue-500 to-cyan-400',
  electrical: 'from-amber-400 to-orange-500',
  'ac-repair': 'from-sky-400 to-blue-500',
  cleaning: 'from-emerald-400 to-teal-500',
  'home-painting': 'from-violet-400 to-purple-500',
  carpentry: 'from-amber-600 to-yellow-500',
  'pest-control': 'from-red-400 to-rose-500',
  'appliance-repair': 'from-slate-400 to-gray-500',
  'refrigerator-repair': 'from-cyan-400 to-sky-500',
  'washing-machine-repair': 'from-indigo-400 to-blue-500',
  'tv-repair': 'from-gray-500 to-zinc-600',
  'ro-water-purifier': 'from-blue-400 to-indigo-500',
  'cctv-installation': 'from-red-500 to-pink-500',
  'interior-design': 'from-pink-400 to-rose-400',
  'home-shifting': 'from-teal-400 to-emerald-500',
  gardening: 'from-green-400 to-emerald-500',
  'beauty-at-home': 'from-fuchsia-400 to-pink-500',
  'spa-massage': 'from-rose-300 to-pink-400',
  'cooking-home-chef': 'from-orange-400 to-red-400',
  'home-tutor': 'from-blue-500 to-indigo-500',
  babysitting: 'from-pink-300 to-rose-300',
  'elder-care': 'from-teal-300 to-cyan-400',
  'pet-care': 'from-amber-400 to-yellow-400',
  laundry: 'from-sky-400 to-blue-400',
  'car-wash': 'from-blue-600 to-indigo-500',
  default: 'from-gray-400 to-gray-500',
};

export const FALLBACK_GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
];

export function getServiceCategorySlug(service: { category?: { slug?: string }; name?: string }): string {
  if (service.category?.slug) return service.category.slug;
  const name = (service.name ?? '').toLowerCase();
  if (name.includes('plumb')) return 'plumbing';
  if (name.includes('electric')) return 'electrical';
  if (name.includes('ac') || name.includes('air')) return 'ac-repair';
  if (name.includes('clean')) return 'cleaning';
  if (name.includes('paint')) return 'home-painting';
  if (name.includes('carpent')) return 'carpentry';
  if (name.includes('pest')) return 'pest-control';
  if (name.includes('beauty') || name.includes('salon')) return 'beauty-at-home';
  if (name.includes('spa') || name.includes('massage')) return 'spa-massage';
  if (name.includes('cook') || name.includes('chef')) return 'cooking-home-chef';
  if (name.includes('tutor')) return 'home-tutor';
  if (name.includes('garden')) return 'gardening';
  if (name.includes('laundry')) return 'laundry';
  if (name.includes('pet')) return 'pet-care';
  if (name.includes('baby') || name.includes('child')) return 'babysitting';
  return 'default';
}

export function getServiceGradient(service: { category?: { slug?: string }; name?: string }, index = 0): string {
  const slug = getServiceCategorySlug(service);
  return SERVICE_CATEGORY_GRADIENTS[slug] ?? FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

export function getServiceIcon(slug: string): LucideIcon {
  return SERVICE_CATEGORY_ICONS[slug] ?? Home;
}
