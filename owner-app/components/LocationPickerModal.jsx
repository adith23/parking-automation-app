// components/LocationPickerModal.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";

// A default location (e.g., Colombo, Sri Lanka) for the map to start at
const DEFAULT_LOCATION = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const LocationPickerModal = ({ isVisible, onClose, onLocationSelect }) => {
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapReady, setMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // This effect runs when the modal becomes visible
  useEffect(() => {
    if (isVisible) {
      centerOnUserLocation();
    }
  }, [isVisible]);

  const centerOnUserLocation = async () => {
    setIsLoading(true);
    try {
      // 1. Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Permission to access location was denied. Showing default location."
        );
        // If denied, set map to default and stop loading
        mapRef.current?.animateToRegion(DEFAULT_LOCATION, 1000);
        setSelectedLocation(DEFAULT_LOCATION);
        return;
      }

      // 2. Get current location
      let location = await Location.getCurrentPositionAsync({});
      const userRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01, // Zoom in closer to the user
        longitudeDelta: 0.01,
      };

      // 3. Animate map and set initial location
      mapRef.current?.animateToRegion(userRegion, 1000); // Animate over 1 second
      setSelectedLocation(userRegion);
    } catch (error) {
      Alert.alert("Error", "Could not fetch location. Please try again.");
      mapRef.current?.animateToRegion(DEFAULT_LOCATION, 1000);
      setSelectedLocation(DEFAULT_LOCATION);
    } finally {
      setIsLoading(false);
    }
  };

  // Called when the user stops dragging the map
  const onRegionChangeComplete = (region) => {
    // We only update the state if the map is ready to avoid issues on initial load
    if (isMapReady) {
      setSelectedLocation(region);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Parking Location</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={DEFAULT_LOCATION}
            onMapReady={() => setMapReady(true)}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true} // Shows the blue dot for the user's location
          />

          {/* This is the fixed crosshair/pin in the center of the map */}
          <View style={styles.crosshairContainer}>
            <MaterialIcon name="location-pin" size={50} color="#FF0000" />
          </View>

          {/* "My Location" button */}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={centerOnUserLocation}
          >
            <MaterialIcon name="my-location" size={24} color="#333" />
          </TouchableOpacity>

          {/* Loading Indicator Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.instructions}>
            Move the map to place the pin at the exact location.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  closeButton: {
    position: "absolute",
    left: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  mapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  crosshairContainer: {
    // This container ensures the pin's anchor is at the true center
    position: "absolute",
    // To position the tip of the pin correctly, we move it up by half its size
    transform: [{ translateY: -25 }],
  },
  myLocationButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  instructions: {
    textAlign: "center",
    color: "#666",
    marginBottom: 15,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: "#FFFC35",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});

export default LocationPickerModal;
