import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  Switch,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Manage from "../../assets/images/oui_nav-manage.svg";
import Edit from "../../assets/images/edit.svg";


import { useNavigation, useIsFocused } from "@react-navigation/native";
import api from "../../services/api";

const ParkingLotCard = ({ item, onValueChange }) => {
  // We'll add a placeholder for status, as it's not in the DB model yet
  const isEnabled = item.isEnabled ?? true; // Default to true if not present
  const status = isEnabled ? "Open Now" : "Closed Now";
  const isOpen = status === "Open Now";

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>{item.total_slots} Slots</Text>
          <Text style={styles.detailText}> | </Text>
          <Text style={styles.detailText}>${item.price_per_hour}/hr</Text>
          <Text style={styles.detailText}> | </Text>
          <Text
            style={[
              styles.statusText,
              { color: isOpen ? "#1ada47ff" : "#dc3545" },
            ]}
          >
            {status}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOpen ? "#1ada47ff" : "#dc3545" },
            ]}
          />
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton}>
          <Edit name="pencil-alt" size={20} color="#333" />
        </TouchableOpacity>
        <View
          style={[
            styles.switchContainer,
            {
              backgroundColor: item.isEnabled ? "#FFFC35" : "#ffffffff",
              borderWidth: 1.5,
              borderColor: "#000",
            },
          ]}
        >
          <Switch
            trackColor={{ false: "#ffffffff", true: "#FFFC35" }}
            thumbColor="#000000ff"
            ios_backgroundColor="#ffffffff"
            onValueChange={onValueChange}
            value={item.isEnabled}
            style={styles.switch}
          />
        </View>
      </View>
    </View>
  );
};

const ManageLotsScreen = () => {
  const navigation = useNavigation(); // Hook to navigate between screens
  const isFocused = useIsFocused(); // Hook to detect if the screen is currently visible
  const [parkingLots, setParkingLots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data from the backend
  const fetchParkingLots = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Your backend GET endpoint for listing an owner's lots
      const { data } = await api.get("/owner/parking-lots/");
      // Map the backend data to the structure your component expects
      const formattedData = data.map((lot) => ({
        id: lot.id.toString(),
        name: lot.name,
        total_slots: lot.total_slots,
        price_per_hour: lot.price_per_hour,
        isEnabled: true, // Placeholder until this is in your DB
      }));
      setParkingLots(formattedData);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Failed to fetch parking lots.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect to fetch data when the screen is focused (comes into view)
  useEffect(() => {
    if (isFocused) {
      fetchParkingLots();
    }
  }, [isFocused]);

  const toggleSwitch = (id) => {
    // This is now just a local state update.
    // In a real app, you would make a PUT request to the backend here.
    setParkingLots(
      parkingLots.map((lot) =>
        lot.id === id ? { ...lot, isEnabled: !lot.isEnabled } : lot
      )
    );
  };

  // Render a loading indicator while fetching
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading Parking Lots...</Text>
      </View>
    );
  }

  // Render an error message if the fetch fails
  if (error && parkingLots.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchParkingLots} style={styles.retryButton}>
          <Text>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Header */}
      <View style={styles.header}>
        <Manage name="sliders-h" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>Add or Manage Parking Lots</Text>
      </View>
      {/* List of Parking Lots */}
      <FlatList
        data={parkingLots}
        renderItem={({ item }) => (
          <ParkingLotCard
            item={item}
            onValueChange={() => toggleSwitch(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        // Show a message if there are no parking lots
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text>No parking lots found.</Text>
            <Text>Tap the '+' button to add one!</Text>
          </View>
        }
      />

      {/* FAB now navigates to the AddParkingLotScreen */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("addparkinglot")} // Navigate on press
      >
        <Icon name="plus" size={28} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
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
    marginLeft: 13,
  },
  listContainer: {
    padding: 18,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFD78", // Light yellow
    borderRadius: 30,
    paddingLeft: 25,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000ff",
    marginBottom: 5,
    marginTop: -25,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    marginLeft: 6,
    marginTop: 3,
  },
  cardActions: {
    flexDirection: "column",
    alignItems: "center", // vertical alignment
    justifyContent: "flex-end", // push content to the right
    gap: 8,
  },
  editButton: {
    marginTop: 10,
  },
  switchContainer: {
    width: 60,
    height: 35,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  switch: {
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }], // makes switch slightly bigger
  },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFC35",
    alignItems: "center",
    justifyContent: "center",
    right: 25,
    bottom: 40, // Position above the nav bar
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});

export default ManageLotsScreen;
