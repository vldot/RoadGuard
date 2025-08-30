import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

// Location data interface
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

// Hook for managing user's live location
const useLiveLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setPermission('denied');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        };
        setLocation(newLocation);
        setPermission('granted');
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            setPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timeout';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Auto-get location on first mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    loading,
    error,
    permission,
    refresh: getCurrentLocation
  };
};

// Component props interface
interface LiveLocationDisplayProps {
  onLocationChange?: (location: LocationData) => void;
  showMap?: boolean;
  className?: string;
}

// Component to display user's current location with address
const LiveLocationDisplay = ({ onLocationChange, showMap = true, className = "" }: LiveLocationDisplayProps) => {
  const { location, loading, error, permission, refresh } = useLiveLocation();
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);

  // Reverse geocode to get address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      return;
    }

    setAddressLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const latLng = new window.google.maps.LatLng(lat, lng);

      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: latLng }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            resolve(results[0].formatted_address);
          } else {
            reject(new Error('Geocoding failed'));
          }
        });
      });
      
      setAddress(response as string);
    } catch (err) {
      console.warn('Geocoding failed:', err);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Update address when location changes
  useEffect(() => {
    if (location) {
      reverseGeocode(location.latitude, location.longitude);
      
      // Notify parent component of location change
      if (onLocationChange) {
        onLocationChange({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp
        });
      }
    }
  }, [location, reverseGeocode, onLocationChange]);

  // Load Google Maps API if not already loaded
  useEffect(() => {
    if (!window.google?.maps) {
      loadGoogleMaps().catch(error => {
        console.error('Failed to load Google Maps:', error);
      });
    }
  }, []);

  if (permission === 'denied') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Location Access Required</h4>
            <p className="text-sm text-red-700 mt-1">
              Please enable location permissions to find nearby mechanics
            </p>
          </div>
          <button
            onClick={refresh}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm transition-colors"
          >
            Enable
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Status */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-500" />
            Your Current Location
          </h3>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
            title="Refresh location"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center space-x-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Getting your location...</span>
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : location ? (
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Navigation className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {addressLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-gray-500">Getting address...</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">{address || 'Address not available'}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                </p>
                <p className="text-xs text-gray-400">
                  Updated: {location.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Mini Map Preview */}
      {showMap && location && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="h-48">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&q=${location.latitude},${location.longitude}&zoom=15`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Service Request Form with Live Location
const ServiceRequestFormWithLocation = () => {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [formData, setFormData] = useState({
    vehicleType: '',
    issueDescription: '',
    serviceType: 'instant'
  });

  const handleLocationChange = (location: LocationData) => {
    setUserLocation(location);
    console.log('User location updated:', location);
  };

  const handleSubmit = () => {
    if (!userLocation) {
      alert('Please enable location access to submit service request');
      return;
    }

    const serviceRequestData = {
      ...formData,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      locationAccuracy: userLocation.accuracy
    };

    console.log('Submitting service request:', serviceRequestData);
    // Here you would call your API to create the service request
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Mechanic Service</h1>
        <p className="text-gray-600">We'll find the best mechanic near you</p>
      </div>

      {/* Live Location Display */}
      <LiveLocationDisplay 
        onLocationChange={handleLocationChange}
        showMap={true}
        className="mb-6"
      />

      {/* Service Request Form */}
      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-medium text-gray-900 mb-4">Service Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select vehicle type</option>
                <option value="Car">Car</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Truck">Truck</option>
                <option value="Auto Rickshaw">Auto Rickshaw</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description
              </label>
              <textarea
                value={formData.issueDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                placeholder="Describe the issue with your vehicle..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, serviceType: 'instant' }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.serviceType === 'instant'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  Immediate Service
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, serviceType: 'scheduled' }))}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.serviceType === 'scheduled'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  Schedule Later
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Location Summary */}
        {userLocation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Location confirmed - Ready to find nearby mechanics
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!userLocation}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {userLocation ? 'Find Nearby Mechanics' : 'Enable Location to Continue'}
        </button>
      </div>
    </div>
  );
};

export default ServiceRequestFormWithLocation;