import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import Manage from "../../assets/images/oui_nav-manage.svg";
import Lots from "../../assets/icons/Lots.svg";
import Subs from "../../assets/icons/Subs.svg";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import api from "../../services/api";
import ParkingLotCard from "../../components/ParkingLotCard";

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

      <View style={styles.container}>
        {/* Button 1: Add Parking Lots */}
        <TouchableOpacity style={styles.button1} onPress={() => navigation.navigate("addparkinglot")}>
          <Lots name="flag-plus" size={22} color="#000" />
          <Text style={styles.buttonText}>Add Parking Lots</Text>
        </TouchableOpacity>

        {/* Button 2: Manage Subscriptions */}
        <TouchableOpacity style={styles.button2}>
          <Subs name="sync-alt" size={20} color="#000" />
          <Text style={styles.buttonText}>Manage Subscriptions</Text>
        </TouchableOpacity>
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
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 28,
    marginBottom: 15,
  },
  button1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFE0', // Light yellow
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  button2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFE0', // Light yellow
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default ManageLotsScreen;
