import axios from 'axios';

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_BASE_URL = 'https://serpapi.com/search';

export interface MechanicLocation {
  position: number;
  title: string;
  rating?: number;
  reviews?: number;
  price?: string;
  type: string;
  address: string;
  description?: string;
  place_id: string;
  thumbnail?: string;
  gps_coordinates: {
    latitude: number;
    longitude: number;
  };
  links?: {
    phone?: string;
    directions?: string;
    website?: string;
  };
  hours?: string;
  distance?: number;
}

export interface SerpApiResponse {
  local_map?: {
    image: string;
  };
  local_results: MechanicLocation[];
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
};

export const findNearbyMechanics = async (
  latitude: number,
  longitude: number,
  query: string = 'Mechanic',
  maxResults: number = 20
): Promise<MechanicLocation[]> => {
  try {
    const params = {
      engine: 'google_local',
      q: query,
      location: `@${latitude},${longitude},14z`,
      api_key: SERP_API_KEY,
      num: maxResults
    };

    console.log('SerpAPI Request:', { params });

    const response = await axios.get<SerpApiResponse>(SERP_BASE_URL, { params });
    
    if (!response.data.local_results) {
      console.log('No results from SerpAPI');
      return [];
    }

    console.log(`Found ${response.data.local_results.length} mechanics from SerpAPI`);

    const mechanicsWithDistance = response.data.local_results.map(mechanic => ({
      ...mechanic,
      distance: calculateDistance(
        latitude,
        longitude,
        mechanic.gps_coordinates.latitude,
        mechanic.gps_coordinates.longitude
      )
    }));

    return mechanicsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    console.error('SerpAPI Error:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Failed to fetch mechanics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced search with multiple service types
export const findNearbyAutoServices = async (
  latitude: number,
  longitude: number,
  serviceTypes: string[] = ['Mechanic', 'Auto Repair', 'Car Service']
): Promise<MechanicLocation[]> => {
  try {
    const allResults: MechanicLocation[] = [];
    
    for (const serviceType of serviceTypes) {
      try {
        const results = await findNearbyMechanics(latitude, longitude, serviceType, 10);
        allResults.push(...results);
      } catch (error) {
        console.error(`Failed to search for ${serviceType}:`, error);
      }
    }

    // Remove duplicates based on place_id
    const uniqueResults = allResults.filter((mechanic, index, self) => 
      index === self.findIndex(m => m.place_id === mechanic.place_id)
    );

    // Sort by distance and rating
    return uniqueResults
      .sort((a, b) => {
        const distanceWeight = 0.7;
        const ratingWeight = 0.3;
        const distanceScore = (a.distance || 0) - (b.distance || 0);
        const ratingScore = (b.rating || 0) - (a.rating || 0);
        return distanceScore * distanceWeight + ratingScore * ratingWeight;
      })
      .slice(0, 20); // Limit to top 20 results
  } catch (error) {
    console.error('Error in findNearbyAutoServices:', error);
    throw error;
  }
};
