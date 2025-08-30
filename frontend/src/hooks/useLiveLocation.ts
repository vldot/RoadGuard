import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
}

interface UseLiveLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoStart?: boolean;
  watchPosition?: boolean;
}

interface UseLiveLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  accuracy: number | null;
  getCurrentLocation: () => Promise<void>;
  watchId: number | null;
  startWatching: () => void;
  stopWatching: () => void;
  isSupported: boolean;
}

const DEFAULT_OPTIONS: UseLiveLocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000, // 5 minutes
  autoStart: true,
  watchPosition: false
};

export const useLiveLocation = (options: UseLiveLocationOptions = {}): UseLiveLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const isSupported = 'geolocation' in navigator;

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (lat: number, lng: number): Promise<string | undefined> => {
    try {
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const latLng = new window.google.maps.LatLng(lat, lng);
        
        return new Promise((resolve) => {
          geocoder.geocode({ location: latLng }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              resolve(results[0].formatted_address);
            } else {
              resolve(undefined);
            }
          });
        });
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    }
    return undefined;
  };

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp)
    };

    // Try to get address
    try {
      const address = await reverseGeocode(locationData.latitude, locationData.longitude);
      if (address) {
        locationData.address = address;
      }
    } catch (err) {
      console.warn('Could not get address for location:', err);
    }

    setLocation(locationData);
    setError(null);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Location access denied';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied. Please enable location permissions.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
      default:
        errorMessage = 'An unknown error occurred while retrieving location.';
    }
    
    setError(errorMessage);
    setLoading(false);
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    const positionOptions: PositionOptions = {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocation(position);
        setLoading(false);
      },
      (error) => {
        handleError(error);
      },
      positionOptions
    );
  }, [isSupported, mergedOptions, updateLocation, handleError]);

  const startWatching = useCallback(() => {
    if (!isSupported || watchId) return;

    const positionOptions: PositionOptions = {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge
    };

    const id = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      positionOptions
    );

    setWatchId(id);
  }, [isSupported, watchId, mergedOptions, updateLocation, handleError]);

  const stopWatching = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Auto-start location detection
  useEffect(() => {
    if (mergedOptions.autoStart) {
      if (mergedOptions.watchPosition) {
        startWatching();
      } else {
        getCurrentLocation();
      }
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [mergedOptions.autoStart, mergedOptions.watchPosition]);

  return {
    location,
    loading,
    error,
    accuracy: location?.accuracy || null,
    getCurrentLocation,
    watchId,
    startWatching,
    stopWatching,
    isSupported
  };
};

export default useLiveLocation;