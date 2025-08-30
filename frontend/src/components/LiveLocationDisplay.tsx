import React from 'react';
import { MapPin, Navigation, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLiveLocation, LocationData } from '../hooks/useLiveLocation';


interface LiveLocationDisplayProps {
  onLocationChange?: (location: LocationData | null) => void;
  showAddress?: boolean;
  showAccuracy?: boolean;
  showTimestamp?: boolean;
  compact?: boolean;
  className?: string;
  showMap?: boolean;
  mapHeight?: string;
}

const LiveLocationDisplay: React.FC<LiveLocationDisplayProps> = ({
  onLocationChange,
  showAddress = true,
  showAccuracy = true,
  showTimestamp = false,
  compact = false,
  showMap = true,
  mapHeight = '300px',
  className = ''
}) => {
  const { location, loading, error, getCurrentLocation, isSupported } = useLiveLocation({
    autoStart: true,
    enableHighAccuracy: true,
    timeout: 15000
  });

  // Notify parent component when location changes
  React.useEffect(() => {
    if (onLocationChange) {
      onLocationChange(location);
    }
  }, [location, onLocationChange]);

  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 10) return 'Very High';
    if (accuracy < 50) return 'High';
    if (accuracy < 100) return 'Medium';
    return 'Low';
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy < 10) return 'text-green-600';
    if (accuracy < 50) return 'text-blue-600';
    if (accuracy < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString();
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Geolocation is not supported by this browser</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={getCurrentLocation}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-center text-blue-700">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          <span className="text-sm">Getting your location...</span>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <MapPin className="h-5 w-5 mr-2" />
            <span className="text-sm">Location not available</span>
          </div>
          <button
            onClick={getCurrentLocation}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center"
          >
            <Navigation className="h-4 w-4 mr-1" />
            Get Location
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-gray-700">
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
        {showAccuracy && (
          <span className={`text-xs ${getAccuracyColor(location.accuracy)}`}>
            ({formatAccuracy(location.accuracy)})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg ${className}`}>
      {/* Map Container */}
      {showMap && location && (
        <div className="rounded-t-lg overflow-hidden">
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&q=${location.latitude},${location.longitude}&zoom=15`}
            width="100%"
            height={mapHeight}
            style={{ border: 0, minHeight: '250px' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* Location Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">
              {location ? 'Location Detected' : 'Get Your Location'}
            </span>
          </div>
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center"
            title="Get Current Location"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                Get Location
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Latitude:</span>
              <div className="text-gray-900 font-mono">
                {location.latitude.toFixed(6)}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Longitude:</span>
              <div className="text-gray-900 font-mono">
                {location.longitude.toFixed(6)}
              </div>
            </div>
          </div>

          {showAccuracy && (
            <div>
              <span className="font-medium text-gray-700">Accuracy:</span>
              <div className={`${getAccuracyColor(location.accuracy)}`}>
                {formatAccuracy(location.accuracy)} (±{Math.round(location.accuracy)}m)
              </div>
            </div>
          )}

          {showAddress && location.address && (
            <div>
              <span className="font-medium text-gray-700">Address:</span>
              <div className="text-gray-900">
                {location.address}
              </div>
            </div>
          )}

          {showTimestamp && (
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <div className="text-gray-600">
                {formatTimestamp(location.timestamp)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveLocationDisplay;