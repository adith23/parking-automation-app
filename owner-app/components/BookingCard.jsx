import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BookingID from "../assets/icons/booking-id.svg";
import Money from "../assets/icons/money.svg";

// Base Booking Card with common elements
const BaseBookingCard = ({ item, children, status }) => {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case "ongoing":
        return "#4CAF50";
      case "completed":
        return "#000";
      case "cancelled":
        return "#F44336";
      default:
        return "#000";
    }
  };

  const getStatusBackgroundColor = () => {
    switch (status?.toLowerCase()) {
      case "ongoing":
        return "#E8F5E9"; // Light green
      case "completed":
        return "#FFFD78"; // Light yellow
      case "cancelled":
        return "#FFEBEE"; // Light red
      default:
        return "#FFFD78";
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: getStatusColor(),
          backgroundColor: getStatusBackgroundColor(),
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <BookingID name="receipt" size={20} color="#333" />
        <Text style={styles.cardTitle}>Booking ID - {item.bookingId}</Text>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{item.date}</Text>
          <Text style={styles.dateText}>{item.time}</Text>
        </View>
      </View>
      {children}
    </View>
  );
};

// Ongoing Booking Card
export const OngoingBookingCard = ({ item }) => (
  <BaseBookingCard item={item} status="ongoing">
    <View style={styles.cardBody}>
    <Text style={styles.detailText}>Parking Lot - {item.lot}</Text>
     <Text style={styles.detailText}>Parking Slot - {item.lot}</Text>
      <Text style={styles.detailText}>License Plate No - {item.license}</Text>
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>{item.parking_status || "Parked"}</Text>
      </View>
      <View style={styles.statusContainer}>
      <Money name="check-circle" size={20} color="#28a745" />
      <Text style={styles.statusText}>{item.session_status || "Confirmed"}</Text>
    </View>
    </View>
  </BaseBookingCard>
);

// Completed Booking Card
export const CompletedBookingCard = ({ item }) => (
  <BaseBookingCard item={item} status="completed">
    <View style={styles.cardBody}>
      <Text style={styles.detailText}>{item.license}</Text>
      <Text style={styles.detailText}>Parked Duration - {item.duration}</Text>
      <Text style={styles.detailText}>{item.lot}</Text>
      <Text style={styles.completedText}>✓ Parking session completed</Text>
    </View>
    <View style={styles.priceContainer}>
      <Money name="money-bill-wave" size={20} color="#28a745" />
      <Text style={styles.priceText}>LKR {item.price}</Text>
    </View>
  </BaseBookingCard>
);

// Cancelled Booking Card
export const CancelledBookingCard = ({ item }) => (
  <BaseBookingCard item={item} status="cancelled">
    <View style={styles.cardBody}>
      <Text style={styles.detailText}>{item.license}</Text>
      <Text style={[styles.detailText, styles.cancelledText]}>
        {item.cancellationReason || "Booking was cancelled"}
      </Text>
      <Text style={styles.detailText}>{item.lot}</Text>
    </View>
    <View style={styles.priceContainer}>
      <Money name="money-bill-wave" size={20} color="#999" />
      <Text style={[styles.priceText, styles.cancelledPrice]}>Not Charged</Text>
    </View>
  </BaseBookingCard>
);

// Main BookingCard component that routes to the correct variant
export const BookingCard = ({ item, status }) => {
  switch (status?.toLowerCase()) {
    case "ongoing":
      return <OngoingBookingCard item={item} />;
    case "completed":
      return <CompletedBookingCard item={item} />;
    case "cancelled":
      return <CancelledBookingCard item={item} />;
    default:
      return <CompletedBookingCard item={item} />;
  }
};

const styles = StyleSheet.create({
  card: {
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
    marginBottom: 10,
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
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    fontWeight: "500",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    marginRight: 6,
    marginTop: 1,
  },
  liveText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  completedText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  cancelledText: {
    color: "#F44336",
    textDecorationLine: "line-through",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 25,
    marginBottom: 6,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 8,
    paddingTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 25,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 8,
    paddingTop: 4,
  },
  cancelledPrice: {
    color: "#999",
    textDecorationLine: "line-through",
  },
});

export default BookingCard;