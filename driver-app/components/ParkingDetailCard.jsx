import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { parkingSearchService } from '../services/parkingSearchService';

const ParkingDetailCard = ({ 
  parkingLot, 
  userLocation, 
  onClose, 
  onGetDirections,
  onBookParking 
}) => {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (parkingLot) {
      loadParkingDetails();
    }
  }, [parkingLot]);

  const loadParkingDetails = async () => {
    try {
      setLoading(true);
      
      // Load availability and reviews in parallel
      const [availabilityData, reviewsData] = await Promise.all([
        parkingSearchService.getParkingAvailability(parkingLot.id),
        parkingSearchService.getParkingReviews(parkingLot.id).catch(() => null), // Reviews are optional
      ]);
      
      setAvailability(availabilityData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading parking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (userLocation && parkingLot && parkingLot.gps_coordinates) {
      onGetDirections(userLocation, parkingLot.gps_coordinates);
    } else {
      Alert.alert('Error', 'Location information not available');
    }
  };

  const handleBookParking = () => {
    if (onBookParking) {
      onBookParking(parkingLot);
    } else {
      Alert.alert(
        'Book Parking',
        'Booking functionality will be implemented in the next phase.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCallOwner = () => {
    if (parkingLot.owner_phone) {
      Linking.openURL(`tel:${parkingLot.owner_phone}`);
    }
  };

  const getStatusInfo = () => {
    if (!parkingLot) return { status: 'unknown', message: 'Unknown', color: '#666' };
    
    // Use backend-calculated status if available (from search_service)
    if (parkingLot.status && parkingLot.status_message && parkingLot.status_color) {
      return {
        status: parkingLot.status,
        message: parkingLot.status_message,
        color: parkingLot.status_color
      };
    }
    
    // Fallback: try to determine status from available fields
    if (parkingLot.open_time && parkingLot.close_time) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const openParts = parkingLot.open_time.split(':');
      const closeParts = parkingLot.close_time.split(':');
      if (openParts.length >= 2 && closeParts.length >= 2) {
        const openMinutes = parseInt(openParts[0], 10) * 60 + parseInt(openParts[1], 10);
        const closeMinutes = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1], 10);
        
        if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
          return { status: 'open', message: 'Open now', color: '#4CAF50' };
        } else if (currentMinutes < openMinutes) {
          return { status: 'closed', message: 'Closed', color: '#F44336' };
        } else {
          return { status: 'closed', message: 'Closed', color: '#F44336' };
        }
      }
    }
    
    // Final fallback
    return { status: 'unknown', message: 'Unknown', color: '#666' };
  };

  const formatDistance = () => {
    // Use backend-calculated distance if available
    if (parkingLot.distance_meters) {
      return parkingSearchService.formatDistance(parkingLot.distance_meters);
    }
    return 'N/A';
  };

  const formatWalkingTime = () => {
    // Use backend-calculated walking time if available
    if (parkingLot.walking_time_minutes) {
      return parkingSearchService.formatWalkingTime(parkingLot.walking_time_minutes);
    }
    return 'N/A';
  };

  const formatTime = (timeStr) => {
    // Backend sends time as "HH:MM:SS" format
    if (!timeStr) return 'N/A';
    if (typeof timeStr === 'string') {
      // Extract HH:MM from HH:MM:SS
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
      return timeStr;
    }
    return 'N/A';
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <MaterialIcon key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <MaterialIcon key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialIcon key={`empty-${i}`} name="star-border" size={16} color="#DDD" />
      );
    }

    return stars;
  };

  if (!parkingLot) {
    return null;
  }

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={2}>
            {parkingLot.name}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.message}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Main Info */}
      <View style={styles.mainInfo}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>Rs. {parkingLot.price_per_hour ?? 0}</Text>
          <Text style={styles.priceUnit}>/hour</Text>
        </View>
        
        {/* Show backend-calculated distance and walking time */}
        {(parkingLot.distance_meters || parkingLot.walking_time_minutes) && (
          <View style={styles.distanceContainer}>
            <MaterialIcon name="directions-walk" size={20} color="#666" />
            <Text style={styles.distanceText}>{formatDistance()}</Text>
            <Text style={styles.walkingTime}>({formatWalkingTime()} walk)</Text>
          </View>
        )}
      </View>

      {/* Address */}
      {parkingLot.address && (
      <View style={styles.addressContainer}>
        <MaterialIcon name="location-on" size={20} color="#666" />
        <Text style={styles.address} numberOfLines={2}>
          {parkingLot.address}
        </Text>
      </View>
      )}

      {/* Availability */}
      {availability && (
        <View style={styles.availabilityContainer}>
          <View style={styles.availabilityHeader}>
            <MaterialIcon name="local-parking" size={20} color="#333" />
            <Text style={styles.availabilityTitle}>Availability</Text>
          </View>
          <View style={styles.availabilityInfo}>
            <Text style={styles.availableSlots}>
              {availability.available_slots ?? parkingLot.available_slots ?? 0} of {parkingLot.total_slots ?? 0} slots available
            </Text>
            <View style={styles.availabilityBar}>
              <View 
                style={[
                  styles.availabilityFill, 
                  { 
                    width: `${((availability.available_slots ?? parkingLot.available_slots ?? 0) / (parkingLot.total_slots || 1)) * 100}%` 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Reviews */}
      {reviews && reviews.average_rating > 0 && (
        <View style={styles.reviewsContainer}>
          <View style={styles.reviewsHeader}>
            <MaterialIcon name="star" size={20} color="#FFD700" />
            <Text style={styles.reviewsTitle}>Reviews</Text>
            <Text style={styles.reviewsCount}>({reviews.total_reviews})</Text>
          </View>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {getRatingStars(reviews.average_rating)}
            </View>
            <Text style={styles.ratingText}>
              {reviews.average_rating.toFixed(1)}/5.0
            </Text>
          </View>
        </View>
      )}

      {/* Operating Hours */}
      <View style={styles.hoursContainer}>
        <MaterialIcon name="schedule" size={20} color="#333" />
        <View style={styles.hoursInfo}>
          <Text style={styles.hoursTitle}>Operating Hours</Text>
          <Text style={styles.hoursText}>
            {formatTime(parkingLot.open_time)} - {formatTime(parkingLot.close_time)}
          </Text>
        </View>
      </View>

      {/* Additional Info */}
      {parkingLot.additional_info && (
        <TouchableOpacity 
          style={styles.additionalInfoContainer}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.additionalInfoHeader}>
            <MaterialIcon name="info" size={20} color="#333" />
            <Text style={styles.additionalInfoTitle}>Additional Information</Text>
            <MaterialIcon 
              name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={20} 
              color="#666" 
            />
          </View>
          {isExpanded && (
            <Text style={styles.additionalInfoText}>
              {parkingLot.additional_info.rules_and_regulations || 
               parkingLot.additional_info.security_and_safety || 
               'No additional information available.'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.directionsButton} 
          onPress={handleGetDirections}
        >
          <MaterialIcon name="directions" size={20} color="#007AFF" />
          <Text style={styles.directionsButtonText}>Directions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={handleBookParking}
          disabled={statusInfo.status === 'closed'}
        >
          <Icon name="calendar-check" size={16} color="#fff" />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Owner */}
      {parkingLot.owner_phone && (
        <TouchableOpacity style={styles.contactButton} onPress={handleCallOwner}>
          <MaterialIcon name="phone" size={20} color="#007AFF" />
          <Text style={styles.contactButtonText}>Contact Owner</Text>
        </TouchableOpacity>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 2,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  walkingTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  availabilityContainer: {
    marginBottom: 15,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  availabilityInfo: {
    marginLeft: 28,
  },
  availableSlots: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  availabilityBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  availabilityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  reviewsContainer: {
    marginBottom: 15,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  hoursInfo: {
    marginLeft: 8,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  additionalInfoContainer: {
    marginBottom: 15,
  },
  additionalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});

export default ParkingDetailCard;
