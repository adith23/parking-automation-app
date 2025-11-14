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
import Booking from "../../assets/icons/view-booking.svg";
import { BookingCard } from "../../components/BookingCard";
import api from "../../services/api";

// Main Screen Component
const ViewBookingsScreen = () => {
  const [activeTab, setActiveTab] = useState("Completed");
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No {activeTab.toLowerCase()} bookings found
      </Text>
    </View>
  );

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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={({ item }) => (
            <BookingCard item={item} status={activeTab} />
          )}
          keyExtractor={(item, index) => {
            const id = item?.id?.toString();
            const bookingId = item?.bookingId?.toString();
            return id ? `${id}-${index}` : bookingId ? `${bookingId}-${index}` : `booking-${index}`;
          }}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshing={isLoading}
          onRefresh={fetchBookings}
        />
      )}
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
    backgroundColor: "#FFFFE0",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});

export default ViewBookingsScreen;