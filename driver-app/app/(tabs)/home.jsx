import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import ParkingMap from '../../components/ParkingMap';
import LocationSearch from '../../components/LocationSearch';
import ParkingDetailCard from '../../components/ParkingDetailCard';
import { locationService } from '../../services/locationService';
import { parkingSearchService } from '../../services/parkingSearchService';

const HomeScreen = () => {
  const [searchLocation, setSearchLocation] = useState(null);
  const [selectedParkingLot, setSelectedParkingLot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showDetailCard, setShowDetailCard] = useState(false);
  const [isMapMode, setIsMapMode] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleLocationSelect = (location) => {
    setSearchLocation(location);
    setSelectedParkingLot(null);
    setShowDetailCard(false);
  };

  const handleMapPress = (location) => {
    setSearchLocation(location);
    setSelectedParkingLot(null);
    setShowDetailCard(false);
  };

  const handleParkingLotSelect = (parkingLot) => {
    setSelectedParkingLot(parkingLot);
    setShowDetailCard(true);
  };

  const handleGetDirections = async (startLocation, endLocation) => {
    try {
      const directions = await parkingSearchService.getWalkingDirections(
        startLocation.latitude,
        startLocation.longitude,
        endLocation.latitude,
        endLocation.longitude
      );
      
      Alert.alert(
        'Walking Directions',
        `Distance: ${directions.distance.text}\nDuration: ${directions.duration.text}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get walking directions');
    }
  };

  const handleBookParking = (parkingLot) => {
    Alert.alert(
      'Book Parking',
      `Booking ${parkingLot.name} for parking. This feature will be implemented in the next phase.`,
      [{ text: 'OK' }]
    );
  };

  const toggleMapMode = () => {
    setIsMapMode(!isMapMode);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map Component */}
      <ParkingMap 
        searchLocation={searchLocation}
        onParkingLotSelect={handleParkingLotSelect}
        onMapPress={handleMapPress}
        selectedParkingLot={selectedParkingLot}
      />

      {/* Header Controls */}
      <View style={styles.headerControls}>
        <TouchableOpacity style={styles.headerButton} onPress={getCurrentLocation}>
          <MaterialIcon name="my-location" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton} onPress={toggleMapMode}>
          <MaterialIcon name={isMapMode ? "list" : "map"} size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Vehicle Info Card */}
      <View style={styles.vehicleCard}>
        <Icon name="car-side" size={20} color="#333" />
        <Text style={styles.vehicleText}>Vezel CAB-9890</Text>
        <TouchableOpacity style={styles.vehicleEditButton}>
          <MaterialIcon name="edit" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Location Search Component */}
      <LocationSearch 
        onLocationSelect={handleLocationSelect}
        onMapPress={toggleMapMode}
        selectedLocation={searchLocation}
        placeholder="Where do you want to park?"
      />

      {/* Parking Detail Card Modal */}
      <Modal
        visible={showDetailCard}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailCard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ParkingDetailCard
              parkingLot={selectedParkingLot}
              userLocation={userLocation}
              onClose={() => setShowDetailCard(false)}
              onGetDirections={handleGetDirections}
              onBookParking={handleBookParking}
            />
          </View>
        </View>
      </Modal>

      {/* Search Results Summary */}
      {searchLocation && (
        <View style={styles.searchSummary}>
          <MaterialIcon name="location-on" size={16} color="#007AFF" />
          <Text style={styles.searchSummaryText}>
            Searching near: {searchLocation.formatted_address || 'Selected location'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'column',
    gap: 10,
    zIndex: 1000,
  },
  headerButton: {
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
  vehicleCard: {
    position: 'absolute',
    bottom: 280,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  vehicleText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  vehicleEditButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
  },
  searchSummary: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  searchSummaryText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
});

export default HomeScreen;
