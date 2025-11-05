import * as Location from 'expo-location';
import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsApiKey ||
  Constants.manifest?.extra?.googleMapsApiKey;

class LocationService {
  /**
   * Get user's current location
   * @returns {Promise<Object>} Current location coordinates
   */
  async getCurrentLocation() {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw new Error('Failed to get current location');
    }
  }

  /**
   * Search for addresses using Google Places Autocomplete API
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of address suggestions
   */
  async searchAddress(query) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&key=${GOOGLE_MAPS_API_KEY}&types=address&language=en&components=country:lk`
      );

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${data.status}`);
      }

      return data.predictions || [];
    } catch (error) {
      console.error('Error searching address:', error);
      throw new Error('Failed to search addresses');
    }
  }

  /**
   * Convert address to coordinates using Google Geocoding API
   * @param {string} address - Address to geocode
   * @returns {Promise<Object>} Coordinates and formatted address
   */
  async geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&language=en`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Geocoding API error: ${data.status}`);
      }

      if (data.results.length === 0) {
        throw new Error('No results found for this address');
      }

      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw new Error('Failed to get coordinates for address');
    }
  }

  /**
   * Convert coordinates to address using Google Reverse Geocoding API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>} Formatted address
   */
  async reverseGeocode(lat, lng) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Reverse geocoding API error: ${data.status}`);
      }

      if (data.results.length === 0) {
        throw new Error('No address found for these coordinates');
      }

      return data.results[0].formatted_address;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw new Error('Failed to get address for coordinates');
    }
  }

  /**
   * Get place details using Google Places API
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>} Place details
   */
  async getPlaceDetails(placeId) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry,name,place_id&key=${GOOGLE_MAPS_API_KEY}&language=en`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Place Details API error: ${data.status}`);
      }

      const result = data.result;
      return {
        name: result.name,
        formatted_address: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        place_id: result.place_id,
      };
    } catch (error) {
      console.error('Error getting place details:', error);
      throw new Error('Failed to get place details');
    }
  }

  // Business logic methods removed - now handled by backend

  /**
   * Format distance for display
   * @param {number} distance - Distance in meters
   * @returns {string} Formatted distance string
   */
  formatDistance(distance) {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Get location accuracy description
   * @param {number} accuracy - Accuracy in meters
   * @returns {string} Accuracy description
   */
  getAccuracyDescription(accuracy) {
    if (accuracy < 5) {
      return 'Excellent';
    } else if (accuracy < 10) {
      return 'Good';
    } else if (accuracy < 20) {
      return 'Fair';
    } else {
      return 'Poor';
    }
  }

  /**
   * Watch user's location for changes
   * @param {Function} callback - Callback function for location updates
   * @param {Object} options - Watch options
   * @returns {Promise<Object>} Location subscription
   */
  async watchLocation(callback, options = {}) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const defaultOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10, // 10 meters
      };

      const watchOptions = { ...defaultOptions, ...options };

      return await Location.watchPositionAsync(watchOptions, callback);
    } catch (error) {
      console.error('Error watching location:', error);
      throw new Error('Failed to watch location');
    }
  }

  /**
   * Get location from IP address (fallback method)
   * @returns {Promise<Object>} Approximate location
   */
  async getLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.reason);
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
        accuracy: 10000, // IP-based location is less accurate
      };
    } catch (error) {
      console.error('Error getting location from IP:', error);
      throw new Error('Failed to get approximate location');
    }
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if valid coordinates
   */
  isValidCoordinates(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }

  /**
   * Get compass direction from bearing
   * @param {number} bearing - Bearing in degrees
   * @returns {string} Compass direction
   */
  getCompassDirection(bearing) {
    const directions = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW'
    ];
    
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }
}

// Create and export singleton instance
export const locationService = new LocationService();
