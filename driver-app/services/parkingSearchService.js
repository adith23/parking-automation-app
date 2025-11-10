import api from './api';
import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsApiKey ||
  Constants.manifest?.extra?.googleMapsApiKey;

class ParkingSearchService {
  /**
   * Search for nearby parking lots within a specified radius
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude  
   * @param {number} radius - Search radius in meters (default: 500m for 5 min walking)
   * @returns {Promise<Array>} Array of parking lots with backend-calculated fields
   */
  async searchNearbyParking(lat, lon, radius = 500) {
    try {
      const response = await api.get('/driver/parking', {
        params: {
          latitude: lat,
          longitude: lon,
          radius: radius,
        },
      });
      
      // Backend now provides distance_meters, walking_time_minutes, status, etc.
      return response.data;
    } catch (error) {
      console.error('Error searching nearby parking:', error);
      throw new Error('Failed to search for nearby parking lots');
    }
  }

  /**
   * Get detailed information about a specific parking lot
   * @param {number} parkingLotId - ID of the parking lot
   * @returns {Promise<Object>} Detailed parking lot information
   */
  async getParkingDetails(parkingLotId) {
    try {
      const response = await api.get(`/driver/parking-lots/${parkingLotId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting parking details:', error);
      throw new Error('Failed to get parking lot details');
    }
  }

  /**
   * Get walking directions from start to end location
   * @param {number} startLat - Start latitude
   * @param {number} startLon - Start longitude
   * @param {number} endLat - End latitude
   * @param {number} endLon - End longitude
   * @returns {Promise<Object>} Walking directions data
   */
  async getWalkingDirections(startLat, startLon, endLat, endLon) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const origin = `${startLat},${startLon}`;
      const destination = `${endLat},${endLon}`;
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance,
          duration: step.duration,
          start_location: step.start_location,
          end_location: step.end_location,
        })),
        polyline: route.overview_polyline.points,
      };
    } catch (error) {
      console.error('Error getting walking directions:', error);
      throw new Error('Failed to get walking directions');
    }
  }

  /**
   * Search parking lots by text query (name, address, etc.)
   * @param {string} query - Search query
   * @param {number} lat - Current latitude for distance calculation
   * @param {number} lon - Current longitude for distance calculation
   * @returns {Promise<Array>} Array of matching parking lots with backend-calculated fields
   */
  async searchParkingByText(query, lat, lon) {
    try {
      const response = await api.get('/driver/parking/text', {
        params: {
          query: query,
          latitude: lat,
          longitude: lon,
        },
      });

      // Backend now provides distance_meters, walking_time_minutes, status, etc.
      return response.data;
    } catch (error) {
      console.error('Error searching parking by text:', error);
      throw new Error('Failed to search parking lots');
    }
  }

  /**
   * Get parking lot availability status
   * @param {number} parkingLotId - ID of the parking lot
   * @returns {Promise<Object>} Availability information
   */
  async getParkingAvailability(parkingLotId) {
    try {
      const response = await api.get(`/driver/parking-lots/${parkingLotId}/availability`);
      return response.data;
    } catch (error) {
      console.error('Error getting parking availability:', error);
      throw new Error('Failed to get parking availability');
    }
  }

  /**
   * Get parking lot ratings and reviews
   * @param {number} parkingLotId - ID of the parking lot
   * @returns {Promise<Object>} Ratings and reviews data
   */
  async getParkingReviews(parkingLotId) {
    try {
      const response = await api.get(`/driver/parking-lots/${parkingLotId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Error getting parking reviews:', error);
      throw new Error('Failed to get parking reviews');
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
   * Format walking time for display
   * @param {number} minutes - Walking time in minutes
   * @returns {string} Formatted time string
   */
  formatWalkingTime(minutes) {
    if (minutes < 1) {
      return '< 1 min';
    } else if (minutes === 1) {
      return '1 min';
    } else {
      return `${minutes} mins`;
    }
  }

  // Business logic methods removed - now handled by backend
}

// Create and export singleton instance
export const parkingSearchService = new ParkingSearchService();
