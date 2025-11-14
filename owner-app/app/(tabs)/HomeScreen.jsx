import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

// --- Reusable Components ---

// Card for "Recent Bookings"
const BookingCard = ({ icon, driver, location, status, amount }) => {
  const isCompleted = status === "Completed";
  return (
    <View style={styles.bookingCard}>
      <Icon name={icon} size={20} color={isCompleted ? "#28a745" : "#ffa500"} />
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingDriver}>{driver}</Text>
        <Text style={styles.bookingLocation}>{location}</Text>
        <View style={styles.bookingStatusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isCompleted ? "#28a745" : "#ffa500" },
            ]}
          />
          <Text
            style={[
              styles.bookingStatus,
              { color: isCompleted ? "#28a745" : "#ffa500" },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
      {isCompleted && amount ? (
        <View style={styles.bookingAmountContainer}>
          <Icon name="money-bill-wave" size={14} color="#28a745" />
          <Text style={styles.bookingAmount}>{amount}</Text>
        </View>
      ) : null}
    </View>
  );
};

// Card for "Today Revenue Insights"
const InsightCard = ({ icon, title, value, isMain, iconPack }) => {
  const IconComponent = iconPack === "FontAwesome5" ? Icon : Icon;
  return (
    <View style={isMain ? styles.insightCardMain : styles.insightCard}>
      <View style={styles.insightHeader}>
        <IconComponent name={icon} size={isMain ? 20 : 18} color="#333" />
        <Text style={styles.insightTitle}>{title}</Text>
      </View>
      {isMain ? (
        <View style={styles.insightMainContent}>
          <Icon name="money-bill-wave" size={20} color="#28a745" />
          <Text style={styles.insightMainValue}>{value}</Text>
        </View>
      ) : (
        <Text style={styles.insightValue}>{value}</Text>
      )}
    </View>
  );
};

// --- Main Screen Component ---
const HomeScreen = () => {
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [analytics, setAnalytics] = useState({
    estimated_earnings: 0,
    booking_count: 0,
    subscription_count: 0,
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);
  const [isLoadingLots, setIsLoadingLots] = useState(true);

  const insets = useSafeAreaInsets();
  const bottomPadding = 100 + (insets.bottom || 0);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoadingBookings(true);
        setIsLoadingAnalytics(true);
        setIsLoadingLots(true);

        try {
          const ongoingPromise = api.get("/owner/bookings?status=ongoing");
          const completedPromise = api.get("/owner/bookings?status=completed");
          const analyticsPromise = api.get(
            "/owner/analytics/summary?period=today"
          );
          const lotsPromise = api.get("/owner/parking-lots/");

          const [
            ongoingResponse,
            completedResponse,
            analyticsResponse,
            lotsResponse,
          ] = await Promise.all([
            ongoingPromise,
            completedPromise,
            analyticsPromise,
            lotsPromise,
          ]);

          // Process bookings
          const ongoing = ongoingResponse.data || [];
          const completed = completedResponse.data || [];
          const allBookings = [...ongoing, ...completed];
          allBookings.sort(
            (a, b) => new Date(b.booked_at) - new Date(a.booked_at)
          );
          setRecentBookings(allBookings.slice(0, 2));

          // Process analytics
          setAnalytics(
            analyticsResponse.data.summary || {
              estimated_earnings: 0,
              booking_count: 0,
              subscription_count: 0,
            }
          );
          // Process parking lots
          setParkingLots(lotsResponse.data || []);
        } catch (error) {
          console.error("Failed to fetch home screen data:", error);
          setRecentBookings([]);
          setAnalytics({
            estimated_earnings: 0,
            booking_count: 0,
            subscription_count: 0,
          });
          setParkingLots([]);
        } finally {
          setIsLoadingBookings(false);
          setIsLoadingAnalytics(false);
          setIsLoadingLots(false);
        }
      };

      fetchData();
    }, [])
  );

  const mapRegion =
    parkingLots.length > 0 && parkingLots[0].gps_coordinates
      ? {
          latitude: parkingLots[0].gps_coordinates.latitude,
          longitude: parkingLots[0].gps_coordinates.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 33.52066,
          longitude: -86.80249,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFE0" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Icon name="car" size={24} color="#000" />
            <Text style={styles.logoText}>EasyPark</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Icon name="bell" size={24} color="#333" solid />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeTitle}>Welcome!</Text>
        <Text style={styles.welcomeName}>Name Name</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: bottomPadding },
        ]}
      >
        {/* Recent Bookings */}
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {isLoadingBookings ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginVertical: 20 }}
          />
        ) : recentBookings.length > 0 ? (
          recentBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              icon={
                booking.status === "completed" ? "check-circle" : "user-clock"
              }
              driver={booking.license_plate}
              location={booking.lot}
              status={
                booking.parking_status ||
                booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
              }
              amount={booking.price ? `LKR ${booking.price.toFixed(2)}` : null}
            />
          ))
        ) : (
          <View style={styles.emptyBookingCard}>
            <Text style={styles.emptyBookingText}>No recent bookings.</Text>
          </View>
        )}

        {/* Today Revenue Insights */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueTitle}>Today Revenue Insights</Text>
          {isLoadingAnalytics ? (
            <ActivityIndicator
              style={{ marginVertical: 40 }}
              size="large"
              color="#333"
            />
          ) : (
            <>
              <View style={styles.revenueRow}>
                <InsightCard
                  icon="list-alt"
                  title="Bookings"
                  value={String(analytics.booking_count)}
                />
                <InsightCard
                  icon="credit-card"
                  title="Subscriptions"
                  value={String(analytics.subscription_count)}
                />
              </View>
              <InsightCard
                icon="file-invoice-dollar"
                title="Estimated Earnings"
                value={`LKR ${(analytics.estimated_earnings || 0).toFixed(2)}`}
                isMain
              />
            </>
          )}
        </View>

        {/* Manage or View Parking Lots */}
        <View style={styles.mapSectionCard}>
          <Text style={styles.revenueTitle}>Manage or View Parking Lots</Text>
          <View style={styles.mapContainer}>
            {isLoadingLots ? (
              <ActivityIndicator size="large" color="#333" />
            ) : (
              <View style={styles.mapCircle}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={mapRegion}
                  customMapStyle={mapStyle} // Optional: grayscale
                >
                  {parkingLots.map((loc) =>
                    loc.gps_coordinates ? (
                      <Marker
                        key={loc.id}
                        coordinate={{
                          latitude: loc.gps_coordinates.latitude,
                          longitude: loc.gps_coordinates.longitude,
                        }}
                        image={require("../../assets/icons/Marker4.png")}
                      />
                    ) : null
                  )}
                </MapView>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#FFFFE0", // Light yellow
    padding: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  bellButton: {
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 22,
    color: "#555",
    marginTop: 20,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 80, // Space for nav bar
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptyBookingCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyBookingText: {
    fontSize: 16,
    color: "#888",
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: 15,
  },
  bookingDriver: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  bookingLocation: {
    fontSize: 14,
    color: "#555",
    marginVertical: 2,
  },
  bookingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  bookingStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  bookingAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f7e9",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  bookingAmount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#28a745",
    marginLeft: 5,
  },
  bookingConfirmed: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  revenueCard: {
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    padding: 15,
    marginTop: 10,
  },
  revenueTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 15,
  },
  insightCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
  },
  insightCardMain: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 8,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  insightMainContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  insightMainValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  mapSectionCard: {
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    padding: 15,
    marginTop: 20,
  },
  mapContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  mapCircle: {
    height: 290,
    marginBottom: 20,
    aspectRatio: 1, // Make it a square
    borderRadius: 25, // Make it a circle
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // --- Custom Marker Styles ---
  markerContainer: {
    alignItems: "center",
  },
  marker: {
    backgroundColor: "#000",
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  markerSelected: {
    backgroundColor: "#FFD700",
    padding: 6,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#000",
    borderWidth: 2,
  },
  markerPin: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#000",
  },
  markerPinSelected: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFD700",
  },
});

// Optional: Style for a grayscale map similar to the design
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }],
  },
];

export default HomeScreen;
