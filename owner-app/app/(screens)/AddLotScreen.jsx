import { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import api from "../../services/api";
import LocationPickerModal from "../../components/LocationPickerModal";
import Constants from "expo-constants";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { launchImageLibrary } from "react-native-image-picker";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import HeaderIcon from "../../assets/images/fluent_bot-add-32-regular.svg";
import DefaultIcon from "../../assets/images/hugeicons_add-02.svg";
import Group from "../../assets/images/Group.svg";
import Vehicle from "../../assets/images/fluent_vehicle-car-parking-16-regular.svg";
import Pricing from "../../assets/images/majesticons_dollar-circle-line.svg";
import Timing from "../../assets/images/mingcute_time-line.svg";
import Info from "../../assets/images/tabler_list-details.svg";
import Camera from "../../assets/images/fluent_camera-add-24-regular.svg";


const AddParkingLotScreen = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null); // Will store { lat, lon }
  const [isMapVisible, setMapVisible] = useState(false);
  const [totalSlots, setTotalSlots] = useState(10);
  const [pricePerHour, setPricePerHour] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isOpenTimePickerVisible, setOpenTimePickerVisible] = useState(false);
  const [isCloseTimePickerVisible, setCloseTimePickerVisible] = useState(false);

  // Create a ref to track programmatic changes
  const isProgrammaticChange = useRef(false);

  const GOOGLE_MAPS_API_KEY =
    Constants.expoConfig?.extra?.googleMapsApiKey ||
    Constants.manifest?.extra?.googleMapsApiKey ||
    Constants.manifest2?.extra?.googleMapsApiKey;

  // Debounced search for address suggestions
  const searchAddressSuggestions = useCallback(
    async (searchText) => {
      if (
        !GOOGLE_MAPS_API_KEY ||
        !searchText?.trim() ||
        searchText.trim().length < 3
      ) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setIsLoadingSuggestions(true);
        const encoded = encodeURIComponent(searchText.trim());
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${GOOGLE_MAPS_API_KEY}&types=address&language=en`
        );
        const json = await res.json();

        if (json.status === "OK" && json.predictions?.length) {
          setSuggestions(json.predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
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
      searchAddressSuggestions(address);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [address, searchAddressSuggestions]);

  const handleAddressSelect = async (prediction) => {
    setShowSuggestions(false);
    try {
      // Get place details for the selected suggestion
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();

      if (json.status === "OK" && json.result) {
        const { formatted_address, geometry } = json.result;
        const { lat, lng } = geometry.location;

        isProgrammaticChange.current = true;
        setAddress(formatted_address);
        setSelectedLocation({ latitude: lat, longitude: lng });
        setShowSuggestions(false);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Failed to get place details:", error);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    if (!GOOGLE_MAPS_API_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
      );
      const json = await res.json();
      if (json.status === "OK" && json.results?.length) {
        const formatted = json.results[0].formatted_address;

        isProgrammaticChange.current = true;
        setAddress(formatted);
      }
    } catch (e) {
      console.error("Reverse geocode failed:", e);
    }
  };

  // DateTime picker handlers
  const showOpenTimePicker = () => {
    setOpenTimePickerVisible(true);
  };

  const hideOpenTimePicker = () => {
    setOpenTimePickerVisible(false);
  };

  const handleOpenTimeConfirm = (date) => {
    const timeString = date.toTimeString().slice(0, 5); // Get HH:MM format
    setOpenTime(timeString);
    hideOpenTimePicker();
  };

  const showCloseTimePicker = () => {
    setCloseTimePickerVisible(true);
  };

  const hideCloseTimePicker = () => {
    setCloseTimePickerVisible(false);
  };

  const handleCloseTimeConfirm = (date) => {
    const timeString = date.toTimeString().slice(0, 5); // Get HH:MM format
    setCloseTime(timeString);
    hideCloseTimePicker();
  };

  const handleChooseMedia = (mediaType) => {
    const options = {
      mediaType: mediaType,
      quality: 0.8,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log("User cancelled media picker");
      } else if (response.errorCode) {
        console.log("ImagePicker Error: ", response.errorMessage);
        Alert.alert(
          "Picker Error",
          `Could not select media. Please check permissions. Error: ${response.errorMessage}`
        );
      } else {
        if (response.assets) {
          const newUris = response.assets.map((asset) => asset.uri);
          if (mediaType === "photo") {
            setPhotos((prevPhotos) => [...prevPhotos, ...newUris]);
          } else {
            setVideos((prevVideos) => [...prevVideos, ...newUris]);
          }
        }
      }
    });
  };

  const handleRemoveMedia = (index, mediaType) => {
    if (mediaType === "photo") {
      setPhotos(photos.filter((_, i) => i !== index));
    } else {
      setVideos(videos.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!name || !address) {
      Alert.alert(
        "Validation Error",
        "Parking Lot Name and Address are required."
      );
      return;
    }
    if (!selectedLocation?.latitude || !selectedLocation?.longitude) {
      Alert.alert(
        "Validation Error",
        "Please set the parking lot location on the map or search the address to get coordinates."
      );
      return;
    }

    setSubmitting(true);

    const payload = {
      name,
      address,
      gps_coordinates: {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      },
      total_slots: Number(totalSlots),
      price_per_hour: parseFloat(pricePerHour),
      open_time: `${openTime}:00`,
      close_time: `${closeTime}:00`,
      additional_info: {
        rules_and_regulations: additionalInfo,
      },
      media_urls: {
        photos: photos,
        videos: videos,
      },
    };

    try {
      await api.post("/owner/parking-lots/", payload);
      Alert.alert("Success", "Parking lot has been added successfully!");
      // Reset form
      setName("");
      setAddress("");
      setSelectedLocation(null);
      setTotalSlots(10);
      setPricePerHour("25");
      setOpenTime("06:00");
      setCloseTime("18:00");
      setAdditionalInfo("");
      setPhotos([]);
      setVideos([]);
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "An unexpected error occurred.";
      Alert.alert("Submission Failed", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000ff" />

      {/* --- RENDER THE MODAL --- */}
      <LocationPickerModal
        isVisible={isMapVisible}
        onClose={() => setMapVisible(false)}
        onLocationSelect={(location) => {
          setSelectedLocation(location);
          reverseGeocode(location.latitude, location.longitude);
        }}
      />

      {/* DateTime Picker Modals */}
      <DateTimePickerModal
        isVisible={isOpenTimePickerVisible}
        mode="time"
        onConfirm={handleOpenTimeConfirm}
        onCancel={hideOpenTimePicker}
        date={openTime ? new Date(`2000-01-01T${openTime}:00`) : new Date()}
        is24Hour={true}
      />

      <DateTimePickerModal
        isVisible={isCloseTimePickerVisible}
        mode="time"
        onConfirm={handleCloseTimeConfirm}
        onCancel={hideCloseTimePicker}
        date={closeTime ? new Date(`2000-01-01T${closeTime}:00`) : new Date()}
        is24Hour={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <HeaderIcon name="parking" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>Add Parking Lots</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Parking Lot Name Input */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DefaultIcon name="add" size={20} color="#555" />
            <Text style={styles.cardTitle}>Enter Parking Lot Name</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Lot Name"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Location Input */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Group name="location-pin" size={20} color="#555" />
            <Text style={styles.cardTitle}>
              Enter Location or Select on Map
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#888"
              value={address}
              onChangeText={setAddress}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {isLoadingSuggestions && (
              <ActivityIndicator
                size="small"
                color="#555"
                style={styles.loadingIndicator}
              />
            )}
          </View>

          {/* Address Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <ScrollView
                style={styles.suggestionsList}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => handleAddressSelect(item)}
                  >
                    <MaterialIcon
                      name="location-on"
                      size={16}
                      color="#666"
                      style={styles.suggestionIcon}
                    />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.mapButtonContainer}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => setMapVisible(true)}
            >
              <MaterialIcon name="map" size={20} color="#007AFF" />
              <Text style={styles.mapButtonText}>Pick on Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slots Available Slider */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Vehicle name="car" size={20} color="#555" />
            <Text style={styles.cardTitle}>Enter Slots Available</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={1}
              maximumValue={100}
              step={1}
              value={totalSlots}
              onValueChange={setTotalSlots}
              minimumTrackTintColor="#000000ff"
              maximumTrackTintColor="#ccc"
              thumbTintColor="#000000ff"
            />
            <View style={styles.slotValueContainer}>
              <TextInput
                style={styles.slotValueText}
                value={totalSlots.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num)) {
                    setTotalSlots(Math.max(1, Math.min(100, num)));
                  } else if (text === "") {
                    setTotalSlots(0);
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <View>
                <TouchableOpacity
                  onPress={() => setTotalSlots((s) => Math.min(100, s + 1))}
                >
                  <Icon name="chevron-up" size={12} color="#555" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTotalSlots((s) => Math.max(1, s - 1))}
                >
                  <Icon name="chevron-down" size={12} color="#555" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Pricing and Time */}
        <View style={styles.rowContainer}>
          <View style={[styles.card1, styles.halfCard]}>
            <View style={styles.cardHeader1}>
              <Pricing name="dollar-sign" size={20} color="#555" />
              <Text style={styles.cardTitle1}>Add Pricing</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>Rs.</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="150"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={pricePerHour}
                  onChangeText={(text) => {
                    const cleanText = text.replace(/[^0-9.]/g, "");
                    setPricePerHour(cleanText);
                  }}
                />
                <Text style={styles.currencyUnit}>/hr</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card1, styles.halfCard1, { flex: 1.9 }]}>
            <View style={styles.cardHeader1}>
              <Timing name="access-time" size={20} color="#555" />
              <Text style={styles.cardTitle1}>Open & Close Time</Text>
            </View>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.timeInput, styles.timeText]}
                onPress={showOpenTimePicker}
              >
                <Text
                  style={[
                    styles.timeText,
                    openTime ? styles.timeValue : styles.timePlaceholder,
                  ]}
                >
                  {openTime || "HH:MM"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.timeInput, styles.timeText]}
                onPress={showCloseTimePicker}
              >
                <Text
                  style={[
                    styles.timeText,
                    closeTime ? styles.timeValue : styles.timePlaceholder,
                  ]}
                >
                  {closeTime || "HH:MM"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Info name="list-alt" size={20} color="#555" />
            <Text style={styles.cardTitle}>Add more information</Text>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Adds Suitable Vehicle Types&#10;Rules & Regulations&#10;Security & Safety Details"
            placeholderTextColor="#aaa"
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
          />
        </View>

        {/* Photos & Videos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Camera name="photo-camera" size={20} color="#555" />
            <Text style={styles.cardTitle}>Add Photos & Videos</Text>
          </View>

          {/* Photo Picker */}
          <Text style={styles.mediaLabel}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScrollView}
          >
            <TouchableOpacity
              style={styles.addMediaButton}
              onPress={() => handleChooseMedia("photo")}
            >
              <MaterialIcon name="add-a-photo" size={40} color="#555" />
            </TouchableOpacity>
            {photos.map((uri, index) => (
              <View key={index} style={styles.mediaThumbnailContainer}>
                <Image source={{ uri }} style={styles.mediaThumbnail} />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => handleRemoveMedia(index, "photo")}
                >
                  <Icon name="times-circle" size={22} color="#000" solid />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Video Picker */}
          <Text style={styles.mediaLabel}>Videos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScrollView}
          >
            <TouchableOpacity
              style={styles.addMediaButton}
              onPress={() => handleChooseMedia("video")}
            >
              <MaterialIcon name="videocam" size={40} color="#555" />
            </TouchableOpacity>
            {videos.map((uri, index) => (
              <View key={index} style={styles.mediaThumbnailContainer}>
                <Image source={{ uri }} style={styles.mediaThumbnail} />
                <TouchableOpacity
                  style={styles.removeMediaButton}
                  onPress={() => handleRemoveMedia(index, "video")}
                >
                  <Icon name="times-circle" size={22} color="#000" solid />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#333" />
          ) : (
            <Text style={styles.submitButtonText}>Add Parking Lot</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    paddingTop: 40,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  headerTitle: {
    color: "#FFFC35",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
  },
  scrollContainer: {
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#FFFD78", // Light yellow background
    borderRadius: 30,
    padding: 25,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginTop: 5,
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
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  mapButtonContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  mapButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontWeight: "600",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  slotValueContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginLeft: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  slotValueText: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
    color: "#333",
  },
  rowContainer: {
    flexDirection: "row",
    //justifyContent: "space-between",
    gap: 8,
  },
  halfCard1: {
    //flex: 1,
  },
  halfCard: {
    //flex: 1,
    //marginHorizontal: 0,
  },

  card1: {
    backgroundColor: "#FFFD78", // Light yellow background
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 135,
    width: 140,
  },
  cardHeader1: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 5,
  },
  cardTitle1: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 4,
    marginRight: 6,
  },
  priceInputContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginTop: 5,
    alignItems: "center",
    marginLeft: 4,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 25,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  currencyUnit: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 15,
  },
  timeRow: {
    flexDirection: "row",
    marginTop: 5,
    marginLeft: 4,
    gap: 10,
    alignItems: "center",
  },
  timeInput: {
    flex: 1,
    justifyContent: "space-around",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 7,
    textAlign: "center",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  timeValue: {
    color: "#333",
  },
  timePlaceholder: {
    color: "#888",
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 10,
    fontWeight: 600,
    padding: 10,
    fontSize: 14,
    textAlignVertical: "top",
    height: 100,
    marginTop: 5,
    color: "#333",
  },
  mediaLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
    marginTop: 10,
  },
  mediaScrollView: {
    marginBottom: 10,
  },
  mediaThumbnailContainer: {
    marginRight: 10,
    marginTop: 4,
    position: "relative",
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  addMediaButton: {
    width: 200,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 15,
    paddingHorizontal: 55,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
    marginBottom: 35,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});

export default AddParkingLotScreen;
