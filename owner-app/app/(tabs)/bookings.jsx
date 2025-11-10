import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Booking from "../../assets/icons/view-booking.svg";
import BookingID from "../../assets/icons/booking-id.svg";
import Money from "../../assets/icons/money.svg";

// Mock data for the booking list
const bookingsData = [
  {
    id: "1",
    bookingId: "21VS2",
    date: "03 August 2025",
    time: "05:44 pm",
    license: "License Plate Number",
    duration: "00:34 min",
    lot: "Booked Parking Lot",
    price: "256.33",
  },
  {
    id: "2",
    bookingId: "21VS2", // Using the same ID as the image
    date: "03 August 2025",
    time: "05:44 pm",
    license: "License Plate Number",
    duration: "00:34 min",
    lot: "Booked Parking Lot",
    price: "256.33",
  },
  // Add more booking items here
];

// Reusable Booking Card Component
const BookingCard = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <BookingID name="receipt" size={20} color="#333" />
      <Text style={styles.cardTitle}>Booking ID - {item.bookingId}</Text>
      <View style={styles.dateTimeContainer}>
        <Text style={styles.dateText}>{item.date}</Text>
        <Text style={styles.dateText}>{item.time}</Text>
      </View>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.detailText}>{item.license}</Text>
      <Text style={styles.detailText}>Parked Duration - {item.duration}</Text>
      <Text style={styles.detailText}>{item.lot}</Text>
    </View>
    <View style={styles.priceContainer}>
      <Money name="money-bill-wave" size={20} color="#28a745" />
      <Text style={styles.priceText}>LKR {item.price}</Text>
    </View>
  </View>
);

// Main Screen Component
const ViewBookingsScreen = () => {
  const [activeTab, setActiveTab] = useState("Completed");

  const renderTab = (name) => {
    const isActive = activeTab === name;
    return (
      <TouchableOpacity style={styles.tab} onPress={() => setActiveTab(name)}>
        <Text style={isActive ? styles.tabTextActive : styles.tabText}>
          {name}
        </Text>
        {isActive && <View style={styles.activeTabUnderline} />}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Replace with actual API endpoint
      const response = await api.get(
        `/owner/bookings?status=${activeTab.toLowerCase()}`
      );
      setBookings(response.data || []);
    } catch (err) {
      setError(err.message);
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Booking name="receipt" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>View Bookings</Text>
      </View>

      {/* Tab Navigator */}
      <View style={styles.tabContainer}>
        {renderTab("Ongoing")}
        {renderTab("Completed")}
        {renderTab("Cancelled")}
      </View>

      {/* Booking List */}
      <FlatList
        data={bookingsData}
        renderItem={({ item }) => <BookingCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
    paddingVertical: 45,
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
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFE0", // Light yellow
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 20,
    marginBottom: 18,
  },
  tab: {
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 15,
    paddingTop: 12,
  },
  tabText: {
    fontSize: 18,
    color: "#888",
    fontWeight: "600",
  },
  tabTextActive: {
    fontSize: 18,
    color: "#000",
    fontWeight: "bold",
  },
  activeTabUnderline: {
    height: 4,
    width: "105%",
    backgroundColor: "#000",
    marginTop: 6,
    borderRadius: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFD78", // Light yellow
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },
  dateTimeContainer: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  cardBody: {
    marginTop: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    paddingTop: 5,
    color: "#000",
    marginLeft: 8,
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

export default ViewBookingsScreen;
