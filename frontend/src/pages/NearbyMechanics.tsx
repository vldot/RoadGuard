import { useState, useEffect } from 'react';
import { MapPin, Phone, Star, Clock, Navigation, ExternalLink } from 'lucide-react';

// Interface for mechanic location data
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

interface UserLocation {
  latitude: number;
  longitude: number;
}

// Mock API call - replace with your actual API integration
const fetchNearbyMechanics = async (latitude: number, longitude: number, _query: string = 'Mechanic'): Promise<MechanicLocation[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock data based on SerpAPI response format
  return [
    {
      position: 1,
      title: "Mike's Auto Repair",
      rating: 4.6,
      reviews: 142,
      price: "$$",
      type: "Auto repair shop",
      address: "123 Main Street, Downtown",
      description: "Professional auto repair with 15+ years experience",
      place_id: "12345",
      gps_coordinates: {
        latitude: latitude + 0.002,
        longitude: longitude + 0.001
      },
      links: {
        phone: "+1234567890",
        directions: "https://maps.google.com/directions"
      },
      hours: "Mon-Fri 8AM-6PM",
      distance: 0.8
    },
    {
      position: 2,
      title: "Quick Fix Garage",
      rating: 4.3,
      reviews: 89,
      price: "$",
      type: "Mechanic",
      address: "456 Oak Avenue, City Center",
      description: "Fast and reliable automotive services",
      place_id: "67890",
      gps_coordinates: {
        latitude: latitude + 0.005,
        longitude: longitude - 0.002
      },
      links: {
        phone: "+1987654321",
        directions: "https://maps.google.com/directions"
      },
      hours: "Mon-Sat 7AM-8PM",
      distance: 1.2
    },
    {
      position: 3,
      title: "Elite Motor Works",
      rating: 4.8,
      reviews: 256,
      price: "$$$",
      type: "Auto repair shop",
      address: "789 Pine Road, Suburb",
      description: "Premium automotive repair and maintenance",
      place_id: "11111",
      gps_coordinates: {
        latitude: latitude - 0.003,
        longitude: longitude + 0.004
      },
      links: {
        phone: "+1122334455",
        directions: "https://maps.google.com/directions"
      },
      hours: "Mon-Fri 8AM-5PM",
      distance: 2.1
    }
  ];
};

// Get user's current location
const getCurrentLocation = (): Promise<UserLocation> => {
  return new Promise<UserLocation>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    );
  });
};

const NearbyMechanics = () => {
  const [mechanics, setMechanics] = useState<MechanicLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('Mechanic');
  const [locationPermission, setLocationPermission] = useState('prompt');

  // Get user location on component mount
  useEffect(() => {
    handleGetLocation();
  }, []);

  const handleGetLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationPermission('granted');
      await fetchMechanicsData(location.latitude, location.longitude);
    } catch (err) {
      setError('Unable to get your location. Please enable location access.');
      setLocationPermission('denied');
      console.error('Location error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanicsData = async (lat: number, lng: number) => {
    try {
      const results = await fetchNearbyMechanics(lat, lng, searchQuery);
      setMechanics(results);
    } catch (err) {
      setError('Failed to fetch nearby mechanics');
      console.error('API error:', err);
    }
  };

  const handleSearch = async () => {
    if (!userLocation) {
      setError('Location required for search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchMechanicsData(userLocation.latitude, userLocation.longitude);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
    }

    return stars;
  };

  const getPriceColor = (price: string) => {
    switch (price) {
      case '$': return 'text-green-600';
      case '$$': return 'text-yellow-600';
      case '$$$': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (locationPermission === 'denied') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Location Access Required</h2>
          <p className="text-gray-600 mb-6">
            Please enable location access to find nearby mechanics
          </p>
          <button
            onClick={handleGetLocation}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enable Location
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Find Nearby Mechanics</h1>
        <p className="text-gray-600">
          {userLocation 
            ? `Showing results near your location (${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})`
            : 'Getting your location...'
          }
        </p>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Mechanic, Auto Repair, Tire Shop"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={loading || !userLocation}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleGetLocation}
              className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Update Location"
            >
              <Navigation className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding nearby mechanics...</p>
        </div>
      )}

      {/* Mechanics List */}
      {!loading && mechanics.length > 0 && (
        <div className="space-y-6">
          {mechanics.map((mechanic) => (
            <div key={mechanic.place_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{mechanic.title}</h3>
                    <p className="text-sm text-gray-600">{mechanic.type}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center mb-1">
                      {mechanic.rating && renderStars(mechanic.rating)}
                      <span className="ml-1 text-sm text-gray-600">
                        {mechanic.rating} ({mechanic.reviews})
                      </span>
                    </div>
                    {mechanic.price && (
                      <span className={`text-sm font-medium ${getPriceColor(mechanic.price)}`}>
                        {mechanic.price}
                      </span>
                    )}
                  </div>
                </div>

                {mechanic.description && (
                  <p className="text-gray-600 mb-4">{mechanic.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600">{mechanic.address}</p>
                      <p className="text-sm text-blue-600 font-medium">
                        {mechanic.distance} km away
                      </p>
                    </div>
                  </div>

                  {mechanic.hours && (
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">{mechanic.hours}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {mechanic.links?.phone && (
                    <a
                      href={`tel:${mechanic.links.phone}`}
                      className="flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </a>
                  )}
                  
                  {mechanic.links?.directions && (
                    <a
                      href={mechanic.links.directions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </a>
                  )}

                  <button className="flex items-center bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Request Service
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && mechanics.length === 0 && userLocation && (
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Mechanics Found</h2>
          <p className="text-gray-600">
            Try adjusting your search terms or expanding your search radius
          </p>
        </div>
      )}
    </div>
  );
};

export default NearbyMechanics;