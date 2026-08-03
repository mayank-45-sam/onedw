import { API_BASE_URL } from '@/constants/api';
import { STORAGE_KEYS } from '@/constants/storage';

export type ServiceCategory = 'plumbing' | 'cleaning' | 'ac_repair' | 'electrician' | 'appliance';

export interface AnalysisResult {
  category: ServiceCategory | null;
  confidence: number;
  label: string;
}

const CATEGORY_KEYWORDS: Record<ServiceCategory, string[]> = {
  plumbing: [
    'tap', 'pipe', 'water', 'leak', 'faucet', 'shower', 'bathtub',
    'toilet', 'sink', 'drain', 'plunger', 'tank', 'pump', 'valve', 'wrench',
    'sewer', 'flush', 'basin', 'bucket', 'tub', 'spigot', 'nozzle', 'hose',
    'fountain', 'plumbing', 'drip', 'overflow', 'clog', 'bathroom', 'washbasin',
    'spout', 'showerhead', 'bath', 'water heater', 'geyser',
  ],
  cleaning: [
    'dirty', 'dust', 'mop', 'broom', 'vacuum', 'cleaner', 'sponge', 'brush',
    'detergent', 'soap', 'towel', 'duster', 'rag', 'scrub', 'bleach',
    'squeegee', 'disinfect', 'sweep', 'wipe', 'sanitize', 'polish', 'shampoo',
    'floor', 'tile', 'grout', 'cleaning', 'housework', 'wash', 'laundry',
    'mess', 'stain', 'filth', 'window', 'glass', 'mirror', 'carpet', 'rug',
    'mat', 'sofa', 'couch', 'furniture', 'upholstery', 'curtain', 'bed',
    'linen', 'pillow', 'blanket', 'mattress',
  ],
  ac_repair: [
    'ac', 'air conditioner', 'aircond', 'cooling', 'condenser', 'evaporator',
    'compressor', 'thermostat', 'hvac', 'vent', 'duct', 'cooler',
    'air cooler', 'remote control', 'fan coil', 'chiller', 'refrigerant',
    'defrost', 'temperature', 'blower', 'heater', 'furnace', 'heat pump',
    'radiator', 'coolant', 'exhaust', 'air handler', 'hvac unit',
  ],
  electrician: [
    'wire', 'socket', 'fan', 'switch', 'light', 'lamp', 'electric',
    'circuit', 'fuse', 'bulb', 'led', 'cable', 'plug', 'outlet',
    'breaker', 'panel', 'voltage', 'inverter', 'battery', 'charger',
    'adapter', 'conduit', 'electrical', 'ceiling fan', 'tube light',
    'chandelier', 'lantern', 'spotlight', 'floodlight', 'spark', 'fire',
    'mcb', 'wiring', 'extension cord', 'power strip', 'junction box',
  ],
  appliance: [
    'fridge', 'refrigerator', 'washer', 'washing machine', 'microwave',
    'oven', 'toaster', 'iron', 'blender', 'mixer', 'grinder', 'dryer',
    'dishwasher', 'kettle', 'stove', 'cooler', 'freezer', 'extractor',
    'chimney', 'hob', 'cooker', 'induction', 'air fryer', 'juicer',
    'coffee maker', 'sandwich maker', 'water purifier', 'rice cooker',
    'television', 'tv', 'monitor', 'speaker', 'projector', 'printer',
    'computer', 'laptop', 'router', 'modem', 'cctv', 'camera',
    'home appliance', 'electronic device',
  ],
};

function matchServiceFromLabels(labels: string[]): ServiceCategory | null {
  const text = labels.join(' ').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return cat as ServiceCategory;
    }
  }
  return null;
}

export async function analyzeImage(file: File): Promise<AnalysisResult> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (!token) {
    return { category: null, confidence: 0, label: 'Not authenticated' };
  }

  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    return { category: null, confidence: 0, label: 'Network error' };
  }

  if (!response.ok) {
    return { category: null, confidence: 0, label: `API error ${response.status}` };
  }

  let json: { success: boolean; data: { labels: string[]; category: string | null } };
  try {
    json = await response.json();
  } catch {
    return { category: null, confidence: 0, label: 'Invalid response' };
  }

  if (!json.success || !json.data) {
    return { category: null, confidence: 0, label: 'Analysis failed' };
  }

  const { labels, category } = json.data;

  if (category) {
    return { category: category as ServiceCategory, confidence: 0.8, label: labels.join(', ') };
  }

  const matched = matchServiceFromLabels(labels);
  if (matched) {
    return { category: matched, confidence: 0.7, label: labels.join(', ') };
  }

  return { category: null, confidence: 0, label: labels.join(', ') || 'No matching service' };
}
