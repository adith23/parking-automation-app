import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { locationService } from "../services/locationService";

const LocationSearch = ({ 
  onLocationSelect, 
  onMapPress, 
  selectedLocation,
  placeholder = "Enter Location or Select on Map" 
}) => {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const isProgrammaticChange = useRef(false);

  const GOOGLE_MAPS_API_KEY =
    Constants.expoConfig?.extra?.googleMapsApiKey ||
    Constants.manifest?.extra?.googleMapsApiKey;

  // Debounced search for address suggestions
  const searchAddressSuggestions = useCallback(
    async (query) => {
      if (!GOOGLE_MAPS_API_KEY || !query?.trim() || query.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setIsLoading(true);
        const results = await locationService.searchAddress(query.trim());
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Failed to fetch address suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    },
    [GOOGLE_MAPS_API_KEY]
  );

  // Debounce the search
  useEffect(() => {
    if (isProgrammaticChange.current) {
      isProgrammaticChange.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      searchAddressSuggestions(searchText);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, searchAddressSuggestions]);

  // Update search text when location is selected from map
  useEffect(() => {
    if (selectedLocation && !isProgrammaticChange.current) {
      reverseGeocodeLocation(selectedLocation.latitude, selectedLocation.longitude);
    }
  }, [selectedLocation]);

  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      const address = await locationService.reverseGeocode(lat, lng);
      isProgrammaticChange.current = true;
      setSearchText(address);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    }
  };

  const handleAddressSelect = async (prediction) => {
    setShowSuggestions(false);
    try {
      const location = await locationService.geocodeAddress(prediction.description);
      isProgrammaticChange.current = true;
      setSearchText(prediction.description);
      onLocationSelect(location);
    } catch (error) {
      console.error("Failed to geocode address:", error);
      Alert.alert("Error", "Failed to get location details for this address");
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to get your current location"
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const currentLocation = { latitude, longitude };
      
      // Update search text with current address
      await reverseGeocodeLocation(latitude, longitude);
      
      // Notify parent component
      onLocationSelect(currentLocation);
    } catch (error) {
      console.error("Failed to get current location:", error);
      Alert.alert("Error", "Failed to get your current location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleMapPress = () => {
    setShowSuggestions(false);
    onMapPress();
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleAddressSelect(item)}
    >
      <MaterialIcon
        name="location-on"
        size={20}
        color="#666"
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionMainText} numberOfLines={1}>
          {item.structured_formatting?.main_text || item.description}
        </Text>
        {item.structured_formatting?.secondary_text && (
          <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
            {item.structured_formatting.secondary_text}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <MaterialIcon name="location-pin" size={24} color="#555" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#555"
            style={styles.loadingIndicator}
          />
        )}
        <TouchableOpacity
          onPress={getCurrentLocation}
          disabled={isGettingLocation}
          style={styles.gpsButton}
        >
          {isGettingLocation ? (
            <ActivityIndicator size="small" color="#555" />
          ) : (
            <MaterialIcon name="gps-fixed" size={24} color="#555" />
          )}
        </TouchableOpacity>
      </View>

      {/* Address Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.place_id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <TouchableOpacity style={styles.mapButton} onPress={handleMapPress}>
        <MaterialIcon name="map" size={20} color="#007AFF" />
        <Text style={styles.mapButtonText}>Pick on Map</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFE0",
    padding: 20,
    paddingTop: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  gpsButton: {
    padding: 5,
  },
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    marginBottom: 15,
    maxHeight: 200,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
  },
  mapButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default LocationSearch;