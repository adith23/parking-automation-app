import { useState } from "react";
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
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import HeaderIcon from "../../assets/images/fluent_bot-add-32-regular.svg";
import api from "../../services/api";
import LocationPickerModal from "../../components/LocationPickerModal"; 

const AddParkingLotScreen = () => {
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null); // Will store { lat, lon }
  const [isMapVisible, setMapVisible] = useState(false);
  const [totalSlots, setTotalSlots] = useState(10);
  const [pricePerHour, setPricePerHour] = useState("25");
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [additionalInfo, setAdditionalInfo] = useState("");
  //const [photos, setPhotos] = useState([]);
  //const [videos, setVideos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !address) {
      Alert.alert(
        "Validation Error",
        "Parking Lot Name and Address are required."
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
        }}
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
            <MaterialIcon name="add" size={20} color="#555" />
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
            <MaterialIcon name="location-pin" size={20} color="#555" />
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
            />
            <TouchableOpacity onPress={() => setMapVisible(true)}>
              <MaterialIcon name="search" size={24} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slots Available Slider */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="car" size={20} color="#555" />
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
                    setTotalSlots(0); // Reset to minimum if input is cleared
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
              <Icon name="dollar-sign" size={20} color="#555" />
              <Text style={styles.cardTitle1}>Add Pricing</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <TextInput
                style={styles.priceInput}
                placeholder="$25/hr"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={pricePerHour}
                onChangeText={setPricePerHour}
              />
            </View>
          </View>
          <View style={[styles.card1, styles.halfCard1, { flex: 1.9 }]}>
            <View style={styles.cardHeader1}>
              <MaterialIcon name="access-time" size={20} color="#555" />
              <Text style={styles.cardTitle1}>Open & Close Time</Text>
            </View>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.timeInput, styles.timeText]}
                value={openTime}
                onChangeText={setOpenTime}
                placeholder="HH:MM"
              />
              <TextInput
                style={[styles.timeInput, styles.timeText]}
                value={closeTime}
                onChangeText={setCloseTime}
                placeholder="HH:MM"
              />
            </View>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcon name="list-alt" size={20} color="#555" />
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
            <MaterialIcon name="photo-camera" size={20} color="#555" />
            <Text style={styles.cardTitle}>Add Photos & Videos</Text>
          </View>
          <View style={styles.mediaContainer}>
            <TouchableOpacity style={styles.mediaButton}>
              <MaterialIcon name="add-a-photo" size={32} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton}>
              <MaterialIcon name="videocam" size={32} color="#555" />
            </TouchableOpacity>
          </View>
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
    paddingVertical: 30,
    paddingTop: 50,
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
    padding: 15,
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
    marginLeft: 5,
  },
  priceInputContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginTop: 5,
    alignItems: "center",
    marginLeft: 15,
    marginRight: 15,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    textAlignVertical: "top",
    height: 100,
    marginTop: 5,
    color: "#555",
  },
  mediaContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  mediaButton: {
    backgroundColor: "#f0f0f0",
    padding: 20,
    borderRadius: 15,
    width: "45%",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 15,
    paddingHorizontal: 55,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});

export default AddParkingLotScreen;
