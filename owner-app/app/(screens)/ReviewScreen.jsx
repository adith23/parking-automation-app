import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

// --- Mock Data ---

const ratingData = {
  average: 4.8,
  totalRatings: 163,
  distribution: [
    { stars: 5, count: 120 },
    { stars: 4, count: 30 },
    { stars: 3, count: 10 },
    { stars: 2, count: 2 },
    { stars: 1, count: 1 },
  ],
};

const reviewsData = [
  {
    id: "1",
    name: "Nuwan Perera",
    rating: 5,
    date: "August 19, 2025",
    text: "Great Parking spot, easy access",
  },
  {
    id: "2",
    name: "Kasun Senevirathna",
    rating: 5,
    date: "March 23, 2025",
    text: "Convenient location and safe",
  },
  {
    id: "3",
    name: "Dilan Jayawardena",
    rating: 3,
    date: "January 2, 2025",
    text: "Limited spaces during peak hours",
  },
];

// --- Reusable Components ---

// Star Rating Component
const StarRating = ({ rating, size = 16 }) => {
  let stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <MaterialIcon
        key={i}
        name={i <= rating ? "star" : "star-border"}
        size={size}
        color="#FFD700"
      />
    );
  }
  return <View style={styles.starRow}>{stars}</View>;
};

// Rating Bar Component
const RatingBar = ({ count, maxCount }) => {
  const percentage = (count / maxCount) * 100;
  return (
    <View style={styles.barContainer}>
      <View style={styles.barBackground}>
        <View style={[styles.barForeground, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
};

// Review Card Component
const ReviewCard = ({ review }) => {
  const initial = review.name.charAt(0);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardName}>{review.name}</Text>
          <StarRating rating={review.rating} />
        </View>
      </View>
      <Text style={styles.cardText}>{review.text}</Text>
      <Text style={styles.cardDate}>{review.date}</Text>
    </View>
  );
};

// --- Main Screen Component ---

const ReviewsScreen = () => {
  const maxCount = Math.max(...ratingData.distribution.map((d) => d.count));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <MaterialIcon name="star" size={26} color="#FFFC35" />
        <Text style={styles.headerTitle}>Ratings and Reviews</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* --- Ratings Summary --- */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryRating}>{ratingData.average}</Text>
            <StarRating rating={ratingData.average} size={20} />
            <Text style={styles.summaryTotal}>
              {ratingData.totalRatings} ratings
            </Text>
          </View>
          <View style={styles.summaryRight}>
            {ratingData.distribution.map((item) => (
              <RatingBar
                key={item.stars}
                count={item.count}
                maxCount={maxCount}
              />
            ))}
          </View>
        </View>

        {/* --- Reviews List --- */}
        <FlatList
          data={reviewsData}
          renderItem={({ item }) => <ReviewCard review={item} />}
          keyExtractor={(item) => item.id}
          scrollEnabled={false} // Disable nested scrolling
        />
      </ScrollView>

      {/* Floating Back Button */}
      <TouchableOpacity style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#000" />
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
    paddingVertical: 42,
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
    padding: 20,
    paddingBottom: 100, // Space for back button
  },
  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  summaryLeft: {
    alignItems: "flex-start",
    marginRight: 20,
  },
  summaryRating: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },
  starRow: {
    flexDirection: "row",
  },
  summaryTotal: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  summaryRight: {
    flex: 1,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginRight: 8,
  },
  barForeground: {
    height: 8,
    backgroundColor: "#FFD700",
    borderRadius: 4,
  },
  barCount: {
    fontSize: 12,
    color: "#555",
    minWidth: 25,
    textAlign: "right",
  },
  card: {
    backgroundColor: "#FFFD98", // Light yellow
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
  cardDate: {
    fontSize: 12,
    color: "#888",
    alignSelf: "flex-end",
    marginTop: 10,
  },
  backButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    backgroundColor: "#FFD700",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default ReviewsScreen;
