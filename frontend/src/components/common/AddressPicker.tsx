import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import type { MapLocation } from '@/components/common/MapView';

interface AddressPickerProps {
  id: string;
  label: string;
  value: MapLocation | null;
  onChange: (location: MapLocation | null) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

// ── Nominatim geocoding helpers ──────────────────────────────────────────

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

async function searchGeocode(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── Component ────────────────────────────────────────────────────────────

export function AddressPicker({
  id,
  label,
  value,
  onChange,
  placeholder = 'Search address or place…',
  required = false,
  className,
  disabled = false,
}: AddressPickerProps) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const hits = await searchGeocode(query);
        setResults(hits);
        setOpen(hits.length > 0);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectResult = useCallback(
    (r: NominatimResult) => {
      const loc: MapLocation = {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        label: r.display_name,
      };
      setQuery(loc.label ?? '');
      setResults([]);
      setOpen(false);
      onChange(loc);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange(null);
    inputRef.current?.focus();
  }, [onChange]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }),
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const label = await reverseGeocode(lat, lng);
      const loc: MapLocation = { lat, lng, label: label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
      setQuery(loc.label!);
      setResults([]);
      setOpen(false);
      onChange(loc);
    } catch {
      // User denied or geolocation failed
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  return (
    <div className={cn('relative w-full', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={id}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="pl-10 pr-9"
          />
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleUseCurrentLocation}
          disabled={disabled || loading}
          title="Use current location"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg dark:bg-gray-900">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectResult(r);
                }}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Current coords display */}
      {value && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}

export default AddressPicker;
