import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";

// --- Reusable Component ---
const SubscriptionCard = ({ item }) => {
  const lotNames =
    item.applicable_lots?.map((lot) => lot.name).join(", ") || "General Plan";

  const price =
    item.billing_cycle === "annual" ? item.annual_price : item.monthly_price;
  const cycle = item.billing_cycle === "annual" ? "year" : "month";

  const planType =
    item.plan_type.charAt(0).toUpperCase() + item.plan_type.slice(1);

  const planDetails = `${planType} Plan | $${price}/${cycle}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{lotNames}</Text>
        <Text style={styles.cardPlanDetails}>{planDetails}</Text>
      </View>
      <TouchableOpacity>
        <Icon name="pencil-alt" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

// --- Main Screen Component ---
const ManageSubscriptionsScreen = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchSubscriptions = async () => {
        try {
          setIsLoading(true);
          const response = await api.get("/owner/subscription-plans/");
          setSubscriptions(response.data.plans || []);
        } catch (error) {
          console.error("Failed to fetch subscriptions:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSubscriptions();
      return () => {};
    }, [])
  );

  const renderListHeader = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => router.push("/(screens)/AddSubscriptionScreen")}
    >
      <Icon name="tag" size={16} color="#333" />
      <Text style={styles.addButtonText}>Add Subscription</Text>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.centeredContainer}>
      <Icon name="box-open" size={40} color="#ccc" />
      <Text style={styles.emptyText}>No subscriptions found.</Text>
      <Text style={styles.emptySubText}>
        Click "Add Subscription" to create your first plan.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="list-alt" size={24} color="#FFD700" solid />
        <Text style={styles.headerTitle}>Manage Subscriptions</Text>
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading Subscriptions...</Text>
          </View>
        ) : (
          <FlatList
            data={subscriptions}
            renderItem={({ item }) => <SubscriptionCard item={item} />}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyList}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20, // Add padding here for content
  },
  listContent: {
    paddingBottom: 20, // Add padding to the bottom of the list content
  },
  addButton: {
    backgroundColor: "#FFFFE0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 5,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    padding: 20,
    paddingVertical: 10,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 25,
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: "#555",
    marginTop: 2,
  },
  cardPlanDetails: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
  },
});

export default ManageSubscriptionsScreen;