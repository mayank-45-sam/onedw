import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Navigation, Clock, Ruler, LocateFixed, Users, X, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

// ── Fix Leaflet default icon issue in Vite ──────────────────────────────
// We use L.divIcon for all custom markers, so the default icon issue
// doesn't affect us. But we fix it anyway for safety.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

// ── Types ────────────────────────────────────────────────────────────────

export interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface NearbyWorker {
  id: string;
  name: string;
  profession?: string;
  avatar?: string;
  rating?: number;
  location: MapLocation;
  distanceKm?: number;
  etaMinutes?: number;
}

interface MapViewProps {
  /** Customer's current/pinned location (blue marker). */
  customerMarker?: MapLocation;
  /** The assigned worker's location (accent marker). */
  workerMarker?: MapLocation & { profession?: string };
  /** Other nearby workers (small accent dots). */
  nearbyWorkers?: NearbyWorker[];
  /** ETA in minutes for the assigned worker. */
  etaMinutes?: number;
  /** Distance in km for the assigned worker. */
  distanceKm?: number;
  /** Polyline route between worker and customer. */
  routePath?: { lat: number; lng: number }[];
  className?: string;
  /** Fired when the user uses the current-location button. */
  onUseCurrentLocation?: () => void;
  /** Fired when a nearby worker marker is clicked. */
  onSelectWorker?: (worker: NearbyWorker) => void;
  /** Controlled center override (otherwise auto-fits bounds). */
  center?: MapLocation;
  /** Initial zoom when no markers present. */
  zoom?: number;
}

// ── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bangalore
const DEFAULT_ZOOM = 13;
const NEARBY_RADIUS_M = 3000;

// ── Custom SVG icons via L.divIcon ───────────────────────────────────────

function customerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 2C10.5 2 6 6.5 6 12c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/>
      <circle cx="16" cy="12" r="4" fill="white"/>
    </svg>`,
  });
}

function workerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M16 2C10.5 2 6 6.5 6 12c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z" fill="#0d9488" stroke="#0f766e" stroke-width="1.5"/>
      <circle cx="16" cy="12" r="4" fill="white"/>
    </svg>`,
  });
}

function nearbyDotIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7" fill="#0d9488" stroke="white" stroke-width="2"/>
    </svg>`,
  });
}

// ── Helper: auto-fit bounds to all markers ────────────────────────────────

function FitBounds({ customerMarker, workerMarker, nearbyWorkers, center, zoom }: {
  customerMarker?: MapLocation;
  workerMarker?: MapLocation;
  nearbyWorkers: NearbyWorker[];
  center?: MapLocation;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    const points: L.LatLngExpression[] = [];
    if (customerMarker) points.push([customerMarker.lat, customerMarker.lng]);
    if (workerMarker) points.push([workerMarker.lat, workerMarker.lng]);
    nearbyWorkers.forEach((w) => points.push([w.location.lat, w.location.lng]));

    if (points.length === 0) {
      const c = center ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
      map.setView([c.lat, c.lng], zoom ?? DEFAULT_ZOOM);
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points).pad(0.15));
    }
  }, [map, customerMarker, workerMarker, nearbyWorkers, center, zoom]);

  return null;
}

// ── Component ────────────────────────────────────────────────────────────

export function MapView({
  customerMarker,
  workerMarker,
  nearbyWorkers = [],
  etaMinutes,
  distanceKm,
  routePath,
  className,
  onUseCurrentLocation,
  onSelectWorker,
  center,
  zoom,
}: MapViewProps) {
  const [selectedWorker, setSelectedWorker] = useState<NearbyWorker | null>(null);

  const mapCenter: [number, number] = center
    ? [center.lat, center.lng]
    : customerMarker
      ? [customerMarker.lat, customerMarker.lng]
      : workerMarker
        ? [workerMarker.lat, workerMarker.lng]
        : DEFAULT_CENTER;

  const routePositions: [number, number][] = useMemo(() => {
    if (!routePath || routePath.length < 2) return [];
    return routePath.map((p) => [p.lat, p.lng]);
  }, [routePath]);

  const cIcon = useMemo(() => customerIcon(), []);
  const wIcon = useMemo(() => workerIcon(), []);
  const dotIcon = useMemo(() => nearbyDotIcon(), []);

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border', className)}>
      <MapContainer
        center={mapCenter}
        zoom={zoom ?? DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
      >
        {/* CartoDB Positron — clean, minimal tile style */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <FitBounds
          customerMarker={customerMarker}
          workerMarker={workerMarker}
          nearbyWorkers={nearbyWorkers}
          center={center}
          zoom={zoom}
        />

        {/* Customer marker (blue) */}
        {customerMarker && (
          <Marker
            position={[customerMarker.lat, customerMarker.lng]}
            icon={cIcon}
          >
            {customerMarker.label && (
              <Popup>
                <span className="text-xs font-semibold">{customerMarker.label}</span>
              </Popup>
            )}
          </Marker>
        )}

        {/* Assigned worker marker (accent) */}
        {workerMarker && (
          <Marker
            position={[workerMarker.lat, workerMarker.lng]}
            icon={wIcon}
          >
            <Popup>
              <div className="whitespace-nowrap text-xs font-medium">
                {workerMarker.label ?? 'Worker'}
                {workerMarker.profession && (
                  <div className="text-gray-500">{workerMarker.profession}</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby workers (small dots) */}
        {nearbyWorkers.map((w) => (
          <Marker
            key={w.id}
            position={[w.location.lat, w.location.lng]}
            icon={dotIcon}
            eventHandlers={{
              click: () => {
                setSelectedWorker(w);
                onSelectWorker?.(w);
              },
            }}
          />
        ))}

        {/* Search radius circle around customer */}
        {customerMarker && nearbyWorkers.length > 0 && (
          <Circle
            center={[customerMarker.lat, customerMarker.lng]}
            radius={NEARBY_RADIUS_M}
            pathOptions={{
              fillColor: '#2563eb',
              fillOpacity: 0.06,
              color: '#2563eb',
              opacity: 0.25,
              weight: 1,
            }}
          />
        )}

        {/* Route polyline */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: '#2563eb',
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}

        {/* Selected nearby worker popup */}
        {selectedWorker && (
          <Popup
            position={[selectedWorker.location.lat, selectedWorker.location.lng]}
            eventHandlers={{ remove: () => setSelectedWorker(null) }}
          >
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{selectedWorker.name}</p>
              {selectedWorker.profession && (
                <p className="text-gray-500">{selectedWorker.profession}</p>
              )}
              <div className="flex gap-3 pt-1 text-gray-500">
                {selectedWorker.rating != null && (
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {selectedWorker.rating.toFixed(1)}
                  </span>
                )}
                {selectedWorker.distanceKm != null && (
                  <span>{selectedWorker.distanceKm.toFixed(1)} km</span>
                )}
                {selectedWorker.etaMinutes != null && (
                  <span>{selectedWorker.etaMinutes} min</span>
                )}
              </div>
              <Link
                to={`/workers/${selectedWorker.id}`}
                className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-medium text-white no-underline hover:bg-blue-700"
              >
                View Profile
              </Link>
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Top-left badge */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full bg-white/85 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
        {nearbyWorkers.length > 0
          ? `${nearbyWorkers.length} nearby pros`
          : 'Live map'}
      </div>

      {/* Current location button */}
      {onUseCurrentLocation && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onUseCurrentLocation}
          className="absolute right-3 top-3 z-[1000] gap-1.5 rounded-full shadow-md"
        >
          <LocateFixed className="h-3.5 w-3.5" /> Current location
        </Button>
      )}

      {/* ETA / Distance / Navigate footer card */}
      {(etaMinutes != null || distanceKm != null) && (
        <div className="absolute inset-x-3 bottom-3 z-[1000] flex items-center gap-2 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
          {etaMinutes != null && (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-4 w-4 text-blue-600" /> {etaMinutes} min
            </span>
          )}
          {distanceKm != null && (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Ruler className="h-4 w-4 text-teal-600" /> {distanceKm.toFixed(1)} km
            </span>
          )}
          <a
            href={buildNavLink(customerMarker, workerMarker)}
            target="_blank"
            rel="noreferrer"
            className="ml-auto"
          >
            <Button size="sm" className="btn-glow gap-1.5 rounded-full">
              <Navigation className="h-4 w-4" /> Navigate
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Builds a Google Maps navigation deep-link from two points. */
function buildNavLink(customer?: MapLocation, worker?: MapLocation): string {
  if (customer && worker) {
    return `https://www.google.com/maps/dir/?api=1&origin=${worker.lat},${worker.lng}&destination=${customer.lat},${customer.lng}&travelmode=driving`;
  }
  if (customer) {
    return `https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`;
  }
  return 'https://www.google.com/maps';
}

// Re-export for convenience
export type { MapLocation as MapPoint };
