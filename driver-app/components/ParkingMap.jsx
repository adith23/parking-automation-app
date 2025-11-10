import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { parkingSearchService } from '../services/parkingSearchService';

// Custom parking marker component
const ParkingMarker = ({ 
  parkingLot, 
  isSelected, 
  onPress, 
  onCalloutPress 
}) => (
  <Marker
    coordinate={{
      latitude: parkingLot.gps_coordinates.latitude,
      longitude: parkingLot.gps_coordinates.longitude,
    }}
    onPress={onPress}
  >
    <View style={styles.markerContainer}>
      <View style={[
        styles.marker, 
        isSelected && styles.markerSelected
      ]}>
        <Icon 
          name="car-alt" 
          size={16} 
          color={isSelected ? "#000" : "#fff"} 
        />
      </View>
      <View style={[
        styles.markerPin, 
        isSelected && styles.markerPinSelected
      ]} />
    </View>
    
    <Callout onPress={onCalloutPress}>
      <View style={styles.calloutContainer}>
        <Text style={styles.calloutTitle}>{parkingLot.name}</Text>
        <Text style={styles.calloutPrice}>
          Rs. {parkingLot.price_per_hour}/hr
        </Text>
        <Text style={styles.calloutSlots}>
          {parkingLot.available_slots || parkingLot.total_slots || 0} slots available
        </Text>
        {/* Show backend-calculated distance if available */}
        {parkingLot.distance_meters && (
          <Text style={styles.calloutDistance}>
            {parkingLot.distance_meters < 1000 
              ? `${Math.round(parkingLot.distance_meters)}m` 
              : `${(parkingLot.distance_meters / 1000).toFixed(1)}km`}
          </Text>
        )}
        {/* Show backend-calculated status if available */}
        {parkingLot.status_message && (
          <Text style={[styles.calloutStatus, { color: parkingLot.status_color || '#666' }]}>
            {parkingLot.status_message}
          </Text>
        )}
      </View>
    </Callout>
  </Marker>
);

const ParkingMap = ({ 
  searchLocation, 
  onParkingLotSelect, 
  onMapPress,
  selectedParkingLot 
}) => {
  const mapRef = useRef(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.520660,
    longitude: -86.802490,
    latitudeDelta: 0.02,
    longitudeDelta: 0.01,
  });

  // Get user's current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Search for parking lots when search location changes
  useEffect(() => {
    if (searchLocation) {
      handleSearchParking(searchLocation);
      // Center map on search location
      setMapRegion({
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [searchLocation]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      
      // Center map on user location if no search location
      if (!searchLocation) {
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleSearchParking = async (location) => {
    try {
      setIsLoading(true);
      const results = await parkingSearchService.searchNearbyParking(
        location.latitude,
        location.longitude,
        500 // 500m radius (5 min walking distance)
      );
      setParkingLots(results);
    } catch (error) {
      console.error('Error searching parking:', error);
      Alert.alert('Error', 'Failed to search for nearby parking lots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerPress = (parkingLot) => {
    onParkingLotSelect(parkingLot);
  };

  const handleCalloutPress = (parkingLot) => {
    onParkingLotSelect(parkingLot);
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onMapPress({ latitude, longitude });
  };

  const centerOnUserLocation = () => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const centerOnSearchLocation = () => {
    if (searchLocation) {
      setMapRegion({
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      mapRef.current?.animateToRegion({
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={handleMapPress}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Search location marker */}
        {searchLocation && (
          <Marker
            coordinate={searchLocation}
            title="Search Location"
            pinColor="red"
          />
        )}

        {/* Parking lot markers */}
        {parkingLots.map((parkingLot) => (
          <ParkingMarker
            key={parkingLot.id}
            parkingLot={parkingLot}
            isSelected={selectedParkingLot?.id === parkingLot.id}
            onPress={() => handleMarkerPress(parkingLot)}
            onCalloutPress={() => handleCalloutPress(parkingLot)}
          />
        ))}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        {userLocation && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerOnUserLocation}
          >
            <MaterialIcon name="my-location" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        {searchLocation && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={centerOnSearchLocation}
          >
            <MaterialIcon name="place" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching parking lots...</Text>
        </View>
      )}

      {/* Parking count indicator */}
      {parkingLots.length > 0 && (
        <View style={styles.parkingCountContainer}>
          <Text style={styles.parkingCountText}>
            {parkingLots.length} parking lot{parkingLots.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#000',
    padding: 6,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#000',
    borderWidth: 2,
  },
  markerPin: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#000',
  },
  markerPinSelected: {
    borderTopColor: '#FFD700',
  },
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutSlots: {
    fontSize: 12,
    color: '#666',
  },
  calloutDistance: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  mapControls: {
    position: 'absolute',
    right: 15,
    top: 50,
    flexDirection: 'column',
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  parkingCountContainer: {
    position: 'absolute',
    top: 50,
    left: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  parkingCountText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});

// Optional: Style for a grayscale map similar to the design
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

export default ParkingMap;
