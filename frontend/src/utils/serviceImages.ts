import {
  Wrench, Zap, Wind, Sparkles, Paintbrush, Hammer, Bug, Settings,
  Refrigerator, Droplets, Tv, Waves, Cctv, Sofa, Truck, Flower2,
  HeartPulse, ChefHat, GraduationCap, Baby, PawPrint, Shirt, Car,
  Scissors, Home, type LucideIcon,
} from 'lucide-react';

const _U = 'https://images.unsplash.com';
const _Q = 'w=400&h=300&fit=crop&q=80';
const img = (id: string) => `${_U}/${id}?${_Q}`;

export const SERVICE_CATEGORY_IMAGES: Record<string, string> = {
  plumbing: img('photo-1585704032915-c3400ca199e7'),
  electrical: img('photo-1621905251918-48416bd8575a'),
  'ac-repair': img('photo-1621905252507-b35492cc74b4'),
  cleaning: img('photo-1581578731548-c64695cc6952'),
  'home-painting': img('photo-1589939705384-5185137a7f0f'),
  carpentry: img('photo-1588854337236-6889d631faa8'),
  'pest-control': img('photo-1574362848149-11496d93a7c7'),
  'appliance-repair': img('photo-1556909114-f6e7ad7d3136'),
  'refrigerator-repair': img('photo-1571175443880-49e1d25b2bc5'),
  'washing-machine-repair': img('photo-1626806787461-102c1bfaaea1'),
  'tv-repair': img('photo-1593784991095-a205069470b6'),
  'ro-water-purifier': img('photo-1562281302-809108fd533c'),
  'cctv-installation': img('photo-1557862921-37829c790f19'),
  'interior-design': img('photo-1618221195710-dd6b41faaea6'),
  'home-shifting': img('photo-1600518464441-9154a4dea21b'),
  gardening: img('photo-1416879595882-3373a0480b5b'),
  'beauty-at-home': img('photo-1560066984-138dadb4c035'),
  'spa-massage': img('photo-1600334089648-b0d9d3028eb2'),
  'cooking-home-chef': img('photo-1556910103-1c02745aae4d'),
  'home-tutor': img('photo-1503676260728-1c00da094a0b'),
  babysitting: img('photo-1504439468489-c8920d796a29'),
  'elder-care': img('photo-1579154204601-01588f351e67'),
  'pet-care': img('photo-1530281700549-e82e7bf110d6'),
  laundry: img('photo-1582735689369-4fe89db7114c'),
  'car-wash': img('photo-1507136566006-cfc505b114fc'),
};

const SERVICE_NAME_IMAGES: Record<string, string> = {
  // ── Plumbing ──
  'pipe repair':            img('photo-1585704032915-c3400ca199e7'),
  'drain cleaning':         img('photo-1504328345606-18bbc8c9d7d1'),
  'faucet installation':    img('photo-1584622650111-993a426fbf0a'),
  'toilet repair':          img('photo-1607472586893-edb57bdc0e39'),
  'water tank cleaning':    img('photo-1504307651254-35680f356dfd'),
  'bathroom fitting':       img('photo-1513694203232-719a280e022f'),
  'geyser installation':    img('photo-1621905251189-08b45d6a269e'),
  'kitchen sink repair':    img('photo-1558618666-fcd25c85f82e'),
  // ── Electrical ──
  'wiring repair':          img('photo-1621905251918-48416bd8575a'),
  'switch board repair':    img('photo-1513506003901-1e6a229e2d15'),
  'fan installation':       img('photo-1558449028-b53a39d100fc'),
  'light installation':     img('photo-1497366216548-37526070297c'),
  'mcb tripping fix':       img('photo-1621905251189-08b45d6a269e'),
  'generator service':      img('photo-1620714223084-8fcacc6dfd8d'),
  'inverter installation':  img('photo-1504280390367-361c6d9f38f4'),
  // ── AC Repair ──
  'ac servicing':           img('photo-1621905252507-b35492cc74b4'),
  'ac installation':        img('photo-1585771724684-38269d6639fd'),
  'ac gas refill':          img('photo-1562281302-809108fd533c'),
  'ac repair':              img('photo-1504215680853-026ed2a45def'),
  'ac deep cleaning':       img('photo-1501426026826-31c667bdf23d'),
  // ── Cleaning ──
  'deep home cleaning':     img('photo-1581578731548-c64695cc6952'),
  'bathroom cleaning':      img('photo-1628177142898-93e36e4e3a50'),
  'kitchen cleaning':       img('photo-1527515637462-cff94eecc1ac'),
  'sofa cleaning':          img('photo-1584820927498-cfe5211fd8bf'),
  'carpet cleaning':        img('photo-1497366811353-6870744d04b2'),
  'office cleaning':        img('photo-1527515545081-5db817172677'),
  'window cleaning':        img('photo-1558317374-067fb5f30001'),
  // ── Home Painting ──
  'room painting':          img('photo-1589939705384-5185137a7f0f'),
  'full home painting':     img('photo-1562281302-809108fd533c'),
  'exterior painting':      img('photo-1513694203232-719a280e022f'),
  'texture work':           img('photo-1560448204-e02f11c3d0e2'),
  'waterproof painting':    img('photo-1517816428104-797678c7cf0c'),
  'wood polish':            img('photo-1416339442236-8ceb164046f8'),
  // ── Carpentry ──
  'furniture repair':       img('photo-1588854337236-6889d631faa8'),
  'door installation':      img('photo-1504148455328-c376907d081c'),
  'shelf installation':     img('photo-1504307651254-35680f356dfd'),
  'wardrobe repair':        img('photo-1595515106969-1ce29566ff1c'),
  'window frame repair':    img('photo-1513694203232-719a280e022f'),
  'custom woodwork':        img('photo-1416339442236-8ceb164046f8'),
  // ── Pest Control ──
  'general pest control':   img('photo-1574362848149-11496d93a7c7'),
  'termite treatment':      img('photo-1615963244664-5b845b2025ee'),
  'mosquito fogging':       img('photo-1506748686214-e9df14d4d9d0'),
  'bed bug treatment':      img('photo-1585320806297-9794b3e4eeae'),
  'rat control':            img('photo-1574362848149-11496d93a7c7'),
  // ── Appliance Repair ──
  'mixer grinder repair':   img('photo-1556909114-f6e7ad7d3136'),
  'iron repair':            img('photo-1585704032915-c3400ca199e7'),
  'water purifier service': img('photo-1584622650111-993a426fbf0a'),
  'microwave repair':       img('photo-1501426026826-31c667bdf23d'),
  'fan repair':             img('photo-1527515545081-5db817172677'),
  'printer repair':         img('photo-1618221195710-dd6b41faaea6'),
  // ── Refrigerator Repair ──
  'fridge not cooling':     img('photo-1571175443880-49e1d25b2bc5'),
  'fridge gas charging':    img('photo-1584568694244-14fbdf83bd30'),
  'compressor repair':      img('photo-1504307651254-35680f356dfd'),
  'fridge thermostat fix':  img('photo-1621905251189-08b45d6a269e'),
  'water dispenser repair': img('photo-1501426026826-31c667bdf23d'),
  // ── Washing Machine Repair ──
  'wm not draining':        img('photo-1626806787461-102c1bfaaea1'),
  'wm drum repair':         img('photo-1582735689369-4fe89db7114c'),
  'wm spin fix':            img('photo-1585704032915-c3400ca199e7'),
  'wm belt replacement':    img('photo-1504328345606-18bbc8c9d7d1'),
  'wm full service':        img('photo-1626806787461-102c1bfaaea1'),
  // ── TV Repair ──
  'led tv repair':          img('photo-1593784991095-a205069470b6'),
  'smart tv software fix':  img('photo-1517816428104-797678c7cf0c'),
  'tv wall mounting':       img('photo-1588854337236-6889d631faa8'),
  'home theatre setup':     img('photo-1558449028-b53a39d100fc'),
  'tv panel replacement':   img('photo-1593784991095-a205069470b6'),
  // ── RO Water Purifier ──
  'ro service':             img('photo-1562281302-809108fd533c'),
  'ro filter change':       img('photo-1585704032915-c3400ca199e7'),
  'ro installation':        img('photo-1504328345606-18bbc8c9d7d1'),
  'ro leak repair':         img('photo-1513694203232-719a280e022f'),
  'uv bulb replacement':    img('photo-1562281302-809108fd533c'),
  // ── CCTV Installation ──
  'cctv camera installation': img('photo-1557862921-37829c790f19'),
  'cctv camera repair':     img('photo-1527515545081-5db817172677'),
  'dvr setup':              img('photo-1588854337236-6889d631faa8'),
  'night vision camera':    img('photo-1558449028-b53a39d100fc'),
  'cctv annual maintenance': img('photo-1557862921-37829c790f19'),
  // ── Interior Design ──
  'living room design':     img('photo-1618221195710-dd6b41faaea6'),
  'bedroom design':         img('photo-1616486338812-3dadae4b4ace'),
  'modular kitchen':        img('photo-1616594039964-ae9021a400a0'),
  'space planning':         img('photo-1524758631624-e2822e304c36'),
  'false ceiling':          img('photo-1618221195710-dd6b41faaea6'),
  // ── Home Shifting ──
  'local shifting':         img('photo-1600518464441-9154a4dea21b'),
  'office shifting':        img('photo-1586528116311-ad8dd3c8310d'),
  'single room shifting':   img('photo-1504307651254-35680f356dfd'),
  'packing only':           img('photo-1621905251189-08b45d6a269e'),
  'furniture moving':       img('photo-1504674900247-0877df9cc836'),
  // ── Gardening ──
  'garden maintenance':     img('photo-1416879595882-3373a0480b5b'),
  'lawn mowing':            img('photo-1585320806297-9794b3e4eeae'),
  'planting service':       img('photo-1466692476868-aef1dfb1e735'),
  'garden cleanup':         img('photo-1523348837708-15d4a09cfac2'),
  'irrigation setup':       img('photo-1416879595882-3373a0480b5b'),
  // ── Beauty at Home ──
  'full body massage':      img('photo-1560066984-138dadb4c035'),
  'facial & cleanup':       img('photo-1570172619644-dfd03ed5d881'),
  'hair styling':           img('photo-1522337360788-8b13dee7a37e'),
  'manicure & pedicure':    img('photo-1604654894610-df63bc536371'),
  'waxing service':         img('photo-1516975080664-ed2fc6a32937'),
  'bridal makeup':          img('photo-1487412720507-e7ab37603c6f'),
  // ── Spa & Massage ──
  'swedish massage':        img('photo-1600334089648-b0d9d3028eb2'),
  'deep tissue massage':    img('photo-1519823551278-64ac92734fb1'),
  'thai massage':           img('photo-1507003211169-0a1dd7228f2d'),
  'aromatherapy':           img('photo-1544161515-4ab6ce6db874'),
  'head & shoulder massage': img('photo-1600334089648-b0d9d3028eb2'),
  // ── Cooking / Home Chef ──
  'party catering':         img('photo-1556910103-1c02745aae4d'),
  'daily tiffin service':   img('photo-1504674900247-0877df9cc836'),
  'special diet meals':     img('photo-1512621776951-a57141f2eefd'),
  'festival special cooking': img('photo-1555939594-58d7cb561ad1'),
  'bbq & grill service':    img('photo-1556910103-1c02745aae4d'),
  // ── Home Tutor ──
  'math tutoring':          img('photo-1503676260728-1c00da094a0b'),
  'science tutoring':       img('photo-1532094349884-543bc11b234d'),
  'english speaking':       img('photo-1456513080510-7bf3a84b82f8'),
  'board exam prep':        img('photo-1523580846011-d3a5bc25702b'),
  'programming tutor':      img('photo-1461749280684-dccba630e2f6'),
  // ── Babysitting ──
  'full day babysitting':   img('photo-1504439468489-c8920d796a29'),
  'evening babysitting':    img('photo-1515488042361-ee00e0ddd4e4'),
  'newborn care':           img('photo-1519689680058-324335c77eba'),
  'toddler activities':     img('photo-1503454537195-1dcabb73ffb9'),
  'night babysitting':      img('photo-1516627145497-ae6968895b74'),
  // ── Elder Care ──
  'senior companion care':  img('photo-1579154204601-01588f351e67'),
  'post-surgery care':      img('photo-1579684385127-1ef15d508118'),
  'physiotherapy at home':  img('photo-1576091160550-2173dba999ef'),
  'medication management':  img('photo-1584308666744-24d5c474f2ae'),
  'daily routine assistance': img('photo-1579154204601-01588f351e67'),
  // ── Pet Care ──
  'dog grooming':           img('photo-1530281700549-e82e7bf110d6'),
  'pet walking':            img('photo-1543466835-00a7907e9de1'),
  'pet bathing':            img('photo-1601758228041-f3b2795255f1'),
  'pet sitting':            img('photo-1628009368231-7bb7cfcb0def'),
  'vet visit escort':       img('photo-1587300003388-59208cc962cb'),
  // ── Laundry ──
  'wash & fold':            img('photo-1582735689369-4fe89db7114c'),
  'dry cleaning':           img('photo-1545173168-9f1947eebb7f'),
  'ironing service':        img('photo-1527515637462-cff94eecc1ac'),
  'stain removal':          img('photo-1497366216548-37526070297c'),
  'curtain cleaning':       img('photo-1582735689369-4fe89db7114c'),
  // ── Car Wash ──
  'exterior car wash':      img('photo-1507136566006-cfc505b114fc'),
  'full car detailing':     img('photo-1542362567-b07e54358753'),
  'interior cleaning':      img('photo-1489824904134-891ab64532f1'),
  'car polishing':          img('photo-1503376780353-7e6692767b70'),
  'engine bay cleaning':    img('photo-1486262715619-67b85e0b08d3'),
};

const FALLBACK_IMAGE = img('photo-1527515545081-5db817172677');

export function getServiceImage(service: { category?: { slug?: string }; name?: string }): string {
  const name = (service.name ?? '').toLowerCase();
  if (SERVICE_NAME_IMAGES[name]) return SERVICE_NAME_IMAGES[name];
  for (const [key, url] of Object.entries(SERVICE_NAME_IMAGES)) {
    if (name.includes(key)) return url;
  }
  const slug = service.category?.slug;
  if (slug && SERVICE_CATEGORY_IMAGES[slug]) return SERVICE_CATEGORY_IMAGES[slug];
  return FALLBACK_IMAGE;
}

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
  if (name.includes('elder') || name.includes('senior') || name.includes('old')) return 'elder-care';
  if (name.includes('ro') || name.includes('filter') || name.includes('purif')) return 'ro-water-purifier';
  if (name.includes('car') && name.includes('wash')) return 'car-wash';
  if (name.includes('wash') && name.includes('machine')) return 'washing-machine-repair';
  if (name.includes('tv') || name.includes('television')) return 'tv-repair';
  if (name.includes('cctv') || name.includes('camera') || name.includes('surveillance')) return 'cctv-installation';
  if (name.includes('interior') || name.includes('decor')) return 'interior-design';
  if (name.includes('shift') || name.includes('mov')) return 'home-shifting';
  if (name.includes('refrigerator') || name.includes('fridge')) return 'refrigerator-repair';
  if (name.includes('appliance')) return 'appliance-repair';
  return 'default';
}

export function getServiceGradient(service: { category?: { slug?: string }; name?: string }, index = 0): string {
  const slug = getServiceCategorySlug(service);
  return SERVICE_CATEGORY_GRADIENTS[slug] ?? FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

export function getServiceIcon(slug: string): LucideIcon {
  return SERVICE_CATEGORY_ICONS[slug] ?? Home;
}
