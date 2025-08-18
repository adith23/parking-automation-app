import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  Switch,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";


const ManageLotsScreen = () => {
  const [parkingLots, setParkingLots] = useState(INITIAL_LOTS_DATA);

  const toggleSwitch = (id) => {
    setParkingLots(
      parkingLots.map((lot) =>
        lot.id === id
          ? {
              ...lot,
              isEnabled: !lot.isEnabled,
              status: !lot.isEnabled ? "Open Now" : "Closed Now",
            }
          : lot
      )
    );
  };


// Mock data for the parking lots
const INITIAL_LOTS_DATA = [
  {
    id: "1",
    name: "Heywan Rd, Parking Lot",
    slots: 21,
    price: 3,
    status: "Open Now",
    isEnabled: true,
  },
  {
    id: "2",
    name: "Bolston Lot 5D & 6W",
    slots: 15,
    price: 5,
    status: "Closed Now",
    isEnabled: false,
  },
];

// A single Parking Lot Card component
const ParkingLotCard = ({ item, onValueChange }) => {
  const isOpen = item.status === "Open Now";

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>{item.slots} Slots</Text>
          <Text style={styles.detailText}> | </Text>
          <Text style={styles.detailText}>${item.price}/hr</Text>
          <Text style={styles.detailText}> | </Text>
          <Text
            style={[
              styles.statusText,
              { color: isOpen ? "#28a745" : "#dc3545" },
            ]}
          >
            {item.status}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOpen ? "#28a745" : "#dc3545" },
            ]}
          />
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton}>
          <Icon name="pencil-alt" size={20} color="#333" />
        </TouchableOpacity>
        <Switch
          trackColor={{ false: "#767577", true: "#FFD700" }}
          thumbColor={item.isEnabled ? "#f4f3f4" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={onValueChange}
          value={item.isEnabled}
        />
      </View>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="sliders-h" size={24} color="#FFD700" />
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
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
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
    paddingVertical: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 12,
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFE0", // Light yellow
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  cardActions: {
    alignItems: "flex-end",
  },
  editButton: {
    marginBottom: 10,
  },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    right: 30,
    bottom: 90, // Position above the nav bar
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
    paddingBottom: 20, // Extra padding for home indicator
    justifyContent: "space-around",
    alignItems: "center",
  },
  navButton: {
    flex: 1,
    alignItems: "center",
  },
  homeIconContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 15,
  },
});

export default ManageLotsScreen;
