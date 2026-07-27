import { useCallback, useState } from 'react';
import type { MapLocation } from '@/components/common/MapView';

interface GeolocationState {
  location: MapLocation | null;
  loading: boolean;
  error: string | null;
}

/**
 * Wraps the browser geolocation API in React state.
 * Returns a `request` function that prompts the user for permission
 * and resolves to the current coordinates — API-ready for passing
 * straight to <MapView customerMarker={…} />.
 */
export function useMapGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
  });

  const request = useCallback((): Promise<MapLocation | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setState({ location: null, loading: false, error: 'Geolocation not supported' });
        resolve(null);
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: MapLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'You',
          };
          setState({ location: loc, loading: false, error: null });
          resolve(loc);
        },
        (err) => {
          const msg = err.code === err.PERMISSION_DENIED
            ? 'Location permission denied'
            : 'Could not get your location';
          setState({ location: null, loading: false, error: msg });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { ...state, request };
}
