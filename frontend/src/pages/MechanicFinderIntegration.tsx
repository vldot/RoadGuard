import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

// Define interfaces for type safety
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MechanicData {
  position: number;
  title: string;
  rating: number;
  reviews: number;
  price: string;
  type: string;
  address: string;
  description: string;
  distance: number;
  links: {
    phone: string;
  };
}

interface LocationCaptureProps {
  onLocationSelected?: (location: Location) => void;
  initialLocation?: Location | null;
  placeholder?: string;
}

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

// Google Maps integration component
const LocationCapture: React.FC<LocationCaptureProps> = ({ onLocationSelected, initialLocation = null, placeholder = "Search for location..." }) => {
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Auto-detect user location on component mount
  useEffect(() => {
    if (!currentLocation && !isLoading) {
      getCurrentLocation();
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!window.google?.maps) {
        console.error('Google Maps API not loaded');
        return;
      }

      // Use current location or fallback to default
      const defaultLocation = currentLocation || { lat: 30.7333, lng: 76.7794 }; // Fallback coordinates

      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 14,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels.text',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Initialize marker
      const marker = new window.google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        animation: window.google.maps.Animation.DROP
      });

      // Initialize SearchBox
      if (window.google.maps.places && inputRef.current) {
        const searchBox = new window.google.maps.places.SearchBox(inputRef.current);
        searchBoxRef.current = searchBox;

        // Bias SearchBox results towards current map's viewport
        map.addListener('bounds_changed', () => {
          if (searchBox && map.getBounds) {
            searchBox.setBounds(map.getBounds());
          }
        });

        // Listen for SearchBox places_changed event
        searchBox.addListener('places_changed', () => {
          const places = searchBox.getPlaces();
          if (places.length === 0) return;

          const place = places[0];
          if (!place.geometry?.location) return;

          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || place.name
          };

          updateLocation(location, map, marker);
        });
      }

      // Listen for marker drag events
      marker.addListener('dragend', () => {
        const position = marker.getPosition();
        const location = {
          lat: position.lat(),
          lng: position.lng()
        };

        // Reverse geocode to get address
        reverseGeocode(location, (address) => {
          updateLocation({ ...location, address }, map, marker);
        });
      });

      // Listen for map click events
      map.addListener('click', (event: any) => {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };

        marker.setPosition(event.latLng);
        map.panTo(event.latLng);

        // Reverse geocode to get address
        reverseGeocode(location, (address) => {
          updateLocation({ ...location, address }, map, marker);
        });
      });

      mapRef.current = map;
      markerRef.current = marker;
    // Note: SearchBox is not available for new Google Maps customers
    if (window.google.maps.places && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['geometry', 'formatted_address', 'name']
      });
      searchBoxRef.current = autocomplete;

      // Bias Autocomplete results towards current map's viewport
      if (map.getBounds) {
        autocomplete.setBounds(map.getBounds());
        map.addListener('bounds_changed', () => {
        if (autocomplete && map.getBounds) {
          autocomplete.setBounds(map.getBounds());
        }
        });
      }

      // Listen for Autocomplete place_changed event
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;

        const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name
        };

        updateLocation(location, map, marker);
      });
    }
    };

    // Load Google Maps API if not already loaded
    if (window.google?.maps) {
      initializeMap();
    } else {
      loadGoogleMaps()
        .then(initializeMap)
        .catch(error => {
          console.error('Failed to load Google Maps:', error);
          setError('Failed to load map. Please refresh the page.');
        });
    }
  }, []);

  // Update location state and notify parent
  const updateLocation = (location: Location, map: any, marker: any) => {
    setCurrentLocation(location);
    setSearchValue(location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    setShowSuggestions(false);
    
    if (onLocationSelected) {
      onLocationSelected(location);
    }

    // Update map and marker if provided
    if (map && marker && window.google?.maps) {
      try {
        const latLng = new window.google.maps.LatLng(location.lat, location.lng);
        marker.setPosition(latLng);
        map.panTo(latLng);
      } catch (error) {
        console.warn('Error updating map position:', error);
      }
    }
  };

  // Reverse geocode coordinates to get address
  const reverseGeocode = (location: Location, callback: (address: string) => void) => {
    if (!window.google?.maps?.Geocoder) {
      callback(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const latLng = new window.google.maps.LatLng(location.lat, location.lng);

      geocoder.geocode({ location: latLng }, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]?.formatted_address) {
          callback(results[0].formatted_address);
        } else {
          callback(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        }
      });
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      callback(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Get address for the current location
        reverseGeocode(location, (address) => {
          updateLocation({ ...location, address }, mapRef.current, markerRef.current);
          setIsLoading(false);
        });
      },
      (error) => {
        setError('Unable to retrieve your location');
        setIsLoading(false);
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  };

  // Handle input change for search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setShowSuggestions(e.target.value.length > 2);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input and Controls */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            title="Use current location"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Navigation className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}

        {/* Current Location Display */}
        {currentLocation && (
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {currentLocation.address || `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`}
            </span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden"
          style={{ minHeight: '250px' }}
        />
        
        {/* Map Instructions */}
        <div className="absolute top-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 text-xs text-gray-600 max-w-48">
          <p>🗺️ Click on the map or drag the marker to select location</p>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-blue-600">Getting location...</span>
            </div>
          </div>
        )}
      </div>

      {/* Location Details */}
      {currentLocation && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Selected Location</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Address: </span>
              <span className="text-gray-600">
                {currentLocation.address || 'Address not available'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Coordinates: </span>
              <span className="text-gray-600 font-mono">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Integration example component showing how to use with SerpAPI
const MechanicFinderIntegration = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mechanics, setMechanics] = useState<MechanicData[]>([]);
  const [loading, setLoading] = useState(false);

  // Real API call to fetch nearby mechanics
  const fetchNearbyMechanics = async (latitude: number, longitude: number) => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        query: 'Mechanic',
        maxResults: '20'
      });

      const response = await fetch(`/api/mechanics/nearby?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMechanics(data.mechanics || []);
      } else {
        throw new Error(data.error || 'Failed to fetch mechanics');
      }
    } catch (error) {
      console.error('Error fetching nearby mechanics:', error);
      // Fallback to mock data if API fails
      const mockMechanics = [
        {
          position: 1,
          title: "Local Auto Repair",
          rating: 4.5,
          reviews: 89,
          price: "$",
          type: "Auto repair shop",
          address: `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          description: "Professional automotive services",
          distance: 1.2,
          links: { phone: "+1-234-567-8901" }
        }
      ];
      setMechanics(mockMechanics);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelected = (location: Location) => {
    setUserLocation(location);
    // Automatically fetch nearby mechanics when location is selected
    fetchNearbyMechanics(location.lat, location.lng);
  };

  // Auto-detect location on component mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            });
          });
          
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          handleLocationSelected(location);
        } catch (error) {
          console.log('Auto-location detection failed:', error);
          // Let user manually select location
        }
      }
    };
    
    autoDetectLocation();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Nearby Mechanics</h1>
        <p className="text-gray-600">Select your location to find auto repair services nearby</p>
      </div>

      {/* Location Capture */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Location</h2>
        <LocationCapture 
          onLocationSelected={handleLocationSelected}
          placeholder="Search for your location or use GPS..."
        />
      </div>

      {/* Mechanics Results */}
      {userLocation && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Nearby Mechanics
            {mechanics.length > 0 && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({mechanics.length} found)
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Searching for nearby mechanics...</p>
            </div>
          ) : mechanics.length > 0 ? (
            <div className="space-y-4">
              {mechanics.map((mechanic, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">{mechanic.title}</h3>
                    <div className="text-right">
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {mechanic.rating} ({mechanic.reviews})
                        </span>
                      </div>
                      <span className="text-sm text-blue-600 font-medium">
                        {mechanic.distance} km away
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">{mechanic.description}</p>
                  <p className="text-gray-500 text-sm mb-3">{mechanic.address}</p>
                  
                  <div className="flex gap-2">
                    <button className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors">
                      📞 Call Now
                    </button>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
                      🛠️ Request Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No mechanics found in this area</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MechanicFinderIntegration;