import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface MechanicLocation {
  position: number;
  title: string;
  rating?: number;
  reviews?: number;
  price?: string;
  type: string;
  address: string;
  description?: string;
  place_id: string;
  distance?: number;
  links?: {
    phone?: string;
    directions?: string;
  };
}

interface UseNearbyMechanicsOptions {
  query?: string;
  serviceTypes?: string[];
  maxResults?: number;
  autoFetch?: boolean;
}

export const useNearbyMechanics = (
  latitude: number | null,
  longitude: number | null,
  options: UseNearbyMechanicsOptions = {}
) => {
  const [mechanics, setMechanics] = useState<MechanicLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMechanics = useCallback(async () => {
    if (!latitude || !longitude) {
      setError('Location coordinates required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        latitude,
        longitude,
        query: options.query || 'Mechanic',
        maxResults: options.maxResults || 20
      };

      if (options.serviceTypes && options.serviceTypes.length > 0) {
        params.serviceTypes = options.serviceTypes.join(',');
      }

      const response = await axios.get('/api/mechanics/nearby', { params });
      
      if (response.data.success) {
        setMechanics(response.data.mechanics);
      } else {
        throw new Error(response.data.error || 'Failed to fetch mechanics');
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch nearby mechanics';
      setError(errorMessage);
      console.error('Error fetching mechanics:', err);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, options.query, options.serviceTypes, options.maxResults]);

  // Auto-fetch when location changes (if enabled)
  useEffect(() => {
    if (options.autoFetch !== false && latitude && longitude) {
      fetchMechanics();
    }
  }, [fetchMechanics, options.autoFetch]);

  return {
    mechanics,
    loading,
    error,
    refetch: fetchMechanics,
    hasResults: mechanics.length > 0
  };
};