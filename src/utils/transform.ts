function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function normalizeKeys<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(normalizeKeys) as T;
  if (!isPlainObject(obj)) return obj;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camel = key === 'id' ? '_id' : toCamelCase(key);
    out[camel] = normalizeKeys(val);
  }
  return out as T;
}
