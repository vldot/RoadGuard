// Google Maps API Loader - Centralized script loading to prevent duplicates
declare global {
  interface Window {
    google: any;
    initGoogleMaps?: () => void;
  }
}

interface GoogleMapsLoaderConfig {
  apiKey: string;
  libraries?: string[];
  version?: string;
  callback?: string;
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private callbacks: (() => void)[] = [];

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  async load(config: GoogleMapsLoaderConfig): Promise<void> {
    // If already loaded, resolve immediately
    if (this.isLoaded && window.google?.maps) {
      return Promise.resolve();
    }

    // If currently loading, return existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.warn('Google Maps script already exists, waiting for it to load...');
        
        // Wait for existing script to load
        const checkLoaded = () => {
          if (window.google?.maps) {
            this.isLoaded = true;
            this.isLoading = false;
            this.executeCallbacks();
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      const libraries = config.libraries?.join(',') || 'places';
      const version = config.version || 'weekly';
      const callbackName = 'initGoogleMaps';

      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${libraries}&v=${version}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;

      // Set up global callback
      window[callbackName as keyof typeof window] = () => {
        this.isLoaded = true;
        this.isLoading = false;
        this.executeCallbacks();
        resolve();
      };

      // Handle errors
      script.onerror = () => {
        this.isLoading = false;
        this.loadPromise = null;
        reject(new Error('Failed to load Google Maps API'));
      };

      // Append script to head
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  onLoad(callback: () => void): void {
    if (this.isLoaded && window.google?.maps) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  private executeCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing Google Maps callback:', error);
      }
    });
    this.callbacks = [];
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps;
  }
}

// Default configuration
const DEFAULT_CONFIG: GoogleMapsLoaderConfig = {
  apiKey: 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg',
  libraries: ['places'],
  version: 'weekly'
};

// Export singleton instance and convenience functions
export const googleMapsLoader = GoogleMapsLoader.getInstance();

export const loadGoogleMaps = (config: Partial<GoogleMapsLoaderConfig> = {}) => {
  return googleMapsLoader.load({ ...DEFAULT_CONFIG, ...config });
};

export const onGoogleMapsLoad = (callback: () => void) => {
  googleMapsLoader.onLoad(callback);
};

export const isGoogleMapsReady = () => {
  return googleMapsLoader.isGoogleMapsLoaded();
};