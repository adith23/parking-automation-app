import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import api from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Plan types mapping (frontend -> backend)
const planTypes = ["Basic", "Premium", "Enterprise"];
const planTypeMapping = {
  Basic: "basic",
  Premium: "premium",
  Enterprise: "enterprise",
};

// Billing cycles (only MONTHLY and ANNUAL supported)
const billingCycles = ["MONTHLY", "ANNUAL"];

// --- Reusable Components ---

const ParkingLotItem = ({ item, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[styles.lotItem, isSelected && styles.lotItemSelected]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={styles.lotInfo}>
      <Text style={styles.lotName}>{item.name}</Text>
      <View style={styles.lotDetailsRow}>
        <Text style={styles.lotDetails}>
          {item.total_slots ? `${item.total_slots} Slots` : ""}
          {item.hourly_rate ? ` | $${item.hourly_rate}/hr` : ""}
        </Text>
        {item.is_open !== false && <View style={styles.statusDot} />}
      </View>
    </View>
    <View style={styles.lotActions}>
      {isSelected ? (
        <Icon name="check-circle" size={24} color="#FFD700" solid />
      ) : (
        <Icon name="circle" size={24} color="#ccc" />
      )}
    </View>
  </TouchableOpacity>
);

const AddSubscriptionScreen = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [annualPrice, setAnnualPrice] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("MONTHLY");
  const [selectedPlan, setSelectedPlan] = useState("Basic");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedLots, setSelectedLots] = useState([]); // Array of {id, name}
  const [parkingLots, setParkingLots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLots, setIsFetchingLots] = useState(false);
  const [showParkingLots, setShowParkingLots] = useState(false);

  const fetchParkingLots = async () => {
    try {
      setIsFetchingLots(true);
      const response = await api.get("/owner/parking-lots/");
      setParkingLots(response.data || []);
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      Alert.alert("Error", "Failed to load parking lots. Please try again.");
    } finally {
      setIsFetchingLots(false);
    }
  };

  const insets = useSafeAreaInsets();
  // Navigation bar height (approximately 60-70px) + safe area bottom inset
  const bottomPadding = 30 + (insets.bottom || 0);

  const handleShowParkingLots = () => {
    if (!showParkingLots && parkingLots.length === 0) {
      // Fetch parking lots when button is clicked for the first time
      fetchParkingLots();
    }
    setShowParkingLots(!showParkingLots);
  };

  const handleLotSelect = (lotId, lotName) => {
    // Toggle selection: add if not selected, remove if already selected
    const isSelected = selectedLots.some((lot) => lot.id === lotId);

    if (isSelected) {
      // Remove from selection
      setSelectedLots(selectedLots.filter((lot) => lot.id !== lotId));
    } else {
      // Add to selection
      setSelectedLots([...selectedLots, { id: lotId, name: lotName }]);
    }
  };

  const handleRemoveLot = (lotId) => {
    setSelectedLots(selectedLots.filter((lot) => lot.id !== lotId));
  };

  const handleCreateSubscription = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a subscription name");
      return;
    }

    if (selectedPlan === "Select Plan Type") {
      Alert.alert("Error", "Please select a plan type");
      return;
    }

    if (!monthlyPrice || parseFloat(monthlyPrice) <= 0) {
      Alert.alert("Error", "Please enter a valid monthly price");
      return;
    }

    if (
      selectedCycle === "ANNUAL" &&
      (!annualPrice || parseFloat(annualPrice) <= 0)
    ) {
      Alert.alert("Error", "Please enter a valid annual price");
      return;
    }

    setIsLoading(true);
    try {
      // Base plan data
      const basePlanData = {
        name: name.trim(),
        description: description.trim() || null,
        plan_type: planTypeMapping[selectedPlan],
        monthly_price: parseFloat(monthlyPrice),
        annual_price: annualPrice ? parseFloat(annualPrice) : null,
        billing_cycle: selectedCycle.toLowerCase(),
        billing_interval: 1,
        max_vehicles: 1,
        reserved_slots: false,
        is_featured: false,
      };

      // Create one plan for all selected lots (or general plan if none selected)
      const lotIds =
        selectedLots.length > 0 ? selectedLots.map((lot) => lot.id) : null; // null = general plan for all lots

      const planData = {
        ...basePlanData,
        lot_ids: lotIds,
      };

      await api.post("/owner/subscription-plans/", planData);

      Alert.alert("Success", "Subscription plan created successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error creating subscription:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create subscription plan. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="box-open" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>Add Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Subscription Name */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcon name="add" size={20} color="#333" />
            <Text style={styles.cardTitle}>Enter Subscription Name</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Subscription Name"
            placeholderTextColor="#5E5E5E"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Available Parking Lots */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcon name="location-pin" size={20} color="#333" />
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>Parking Lots</Text>
            </View>
          </View>

          {/* Selected Parking Lots Display */}
          {selectedLots.length > 0 && (
            <View style={styles.selectedLotsContainer}>
              {selectedLots.map((lot) => (
                <View key={lot.id} style={styles.selectedLotContainer}>
                  <View style={styles.selectedLotInfo}>
                    <Icon name="check-circle" size={20} color="#FFD700" solid />
                    <Text style={styles.selectedLotName}>{lot.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveLot(lot.id)}
                    style={styles.removeLotButton}
                  >
                    <MaterialIcon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Select Parking Lots Button */}
          <TouchableOpacity
            style={styles.selectLotsButton}
            onPress={handleShowParkingLots}
          >
            <Icon
              name={showParkingLots ? "chevron-up" : "chevron-down"}
              size={16}
              color="#555"
            />
            <Text style={styles.selectLotsButtonText}>
              {selectedLots.length > 0
                ? `Selected ${selectedLots.length} lot${selectedLots.length > 1 ? "s" : ""}`
                : "Select Parking Lot(s)"}
            </Text>
          </TouchableOpacity>

          {/* Parking Lots List (shown when button is clicked) */}
          {showParkingLots && (
            <View style={styles.parkingLotsContainer}>
              {isFetchingLots ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#333" />
                  <Text style={styles.loadingText}>
                    Loading parking lots...
                  </Text>
                </View>
              ) : parkingLots.length === 0 ? (
                <Text style={styles.emptyText}>No parking lots available</Text>
              ) : (
                <ScrollView
                  style={styles.parkingLotsList}
                  nestedScrollEnabled={true}
                >
                  {parkingLots.map((item) => (
                    <ParkingLotItem
                      key={item.id.toString()}
                      item={item}
                      isSelected={selectedLots.some(
                        (lot) => lot.id === item.id
                      )}
                      onSelect={() => handleLotSelect(item.id, item.name)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Select Plan Type (Custom Dropdown) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcon name="category" size={20} color="#333" />
            <Text style={styles.cardTitle}>Plan Type</Text>
          </View>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setIsPickerOpen(!isPickerOpen)}
            >
              <Text style={styles.dropdownButtonText}>{selectedPlan}</Text>
              <Icon
                name={isPickerOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#555"
              />
            </TouchableOpacity>
            {isPickerOpen && (
              <View style={styles.dropdownList}>
                {planTypes.map((plan) => (
                  <TouchableOpacity
                    key={plan}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setIsPickerOpen(false);
                    }}
                  >
                    <Text>{plan}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Pricing Row */}
        <View style={styles.rowContainer}>
          <View style={styles.halfCard}>
            <View style={styles.cardHeader}>
              <Icon name="dollar-sign" size={20} color="#333" />
              <Text style={styles.cardTitlePricing}>Monthly Pricing</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.priceInput}
                value={monthlyPrice}
                onChangeText={setMonthlyPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>
          </View>
          <View style={styles.halfCard}>
            <View style={styles.cardHeader}>
              <Icon name="dollar-sign" size={20} color="#333" />
              <Text style={styles.cardTitlePricing}>Annual Pricing</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>Rs.</Text>
              <TextInput
                style={styles.priceInput}
                value={annualPrice}
                onChangeText={setAnnualPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* Billing Cycles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Billing Cycles</Text>
          <View style={styles.billingCycleContainer}>
            {billingCycles.map((cycle) => (
              <TouchableOpacity
                key={cycle}
                style={[
                  styles.billingCycleButton,
                  selectedCycle === cycle && styles.billingCycleButtonActive,
                ]}
                onPress={() => setSelectedCycle(cycle)}
              >
                <Text
                  style={[
                    styles.billingCycleText,
                    selectedCycle === cycle && styles.billingCycleTextActive,
                  ]}
                >
                  {cycle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcon name="list-alt" size={20} color="#333" />
            <Text style={styles.cardTitle}>Description About the plan</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Detailed description of the plan"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            isLoading && styles.createButtonDisabled,
          ]}
          onPress={handleCreateSubscription}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#333" />
          ) : (
            <Text style={styles.createButtonText}>Create Subscription</Text>
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
    paddingVertical: 40,
    paddingTop: 70,
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFD90",
    borderRadius: 18,
    padding: 15,
    paddingBottom: 26,
    marginBottom: 15,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  cardTitlePricing: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 17,
    color: "#333",
  },
  lotItem: {
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lotItemSelected: {
    backgroundColor: "#FFFEF0",
  },
  lotInfo: {
    flex: 1,
  },
  lotName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  lotDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  lotDetails: {
    fontSize: 14,
    color: "#555",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28a745", // Green
    marginLeft: 5,
  },
  lotActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownContainer: {
    marginTop: 10,
    zIndex: 10, // For dropdown to appear on top
  },
  dropdownButton: {
    backgroundColor: "#FFFFE0",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownList: {
    backgroundColor: "#FFFEC7",
    borderRadius: 10,
    marginTop: 5,
  },
  dropdownItem: {
    padding: 15,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  halfCard: {
    flex: 1,
    backgroundColor: "#FFFD90",
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
  },
  billingCycleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  billingCycleButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    width: "48%", // Two buttons per row
    alignItems: "center",
    marginBottom: 10,
  },
  billingCycleButtonActive: {
    backgroundColor: "#FFFFD6",
  },
  billingCycleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  billingCycleTextActive: {
    color: "#333",
    fontWeight: "bold",
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    height: 100,
    textAlignVertical: "top",
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 15,
    paddingHorizontal: 55,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
    marginBottom: 85,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  optionalText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    padding: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  selectLotsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFEC7",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  selectLotsButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
    fontWeight: "600",
  },
  parkingLotsContainer: {
    marginTop: 10,
    maxHeight: 300,
  },
  parkingLotsList: {
    maxHeight: 300,
  },
  selectedLotsContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  selectedLotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    padding: 15,
    marginTop: 10,
  },
  selectedLotInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedLotName: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
    fontWeight: "600",
  },
  removeLotButton: {
    padding: 5,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
  },
  currencySymbol: {
    fontSize: 17,
    color: "#888",
    marginRight: 8,
    fontWeight: "600",
  },
  priceInput: {
    flex: 1,
    fontSize: 17,
    color: "#333",
    height: 50,
  },
});

export default AddSubscriptionScreen;
