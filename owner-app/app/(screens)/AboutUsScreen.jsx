import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import Ionicon from "react-native-vector-icons/Ionicons";

// Reusable component for the "How We Work" items
const HowItWorksItem = ({ icon, title, description }) => {
  return (
    <View style={styles.workItem}>
      <View style={styles.iconBackground}>
        <Icon name={icon} size={20} color="#333" />
      </View>
      <View style={styles.workItemText}>
        <Text style={styles.workItemTitle}>{title}</Text>
        <Text style={styles.workItemDescription}>{description}</Text>
      </View>
    </View>
  );
};

const AboutUsScreen = () => {
  
  const insets = useSafeAreaInsets();
  // Navigation bar height (approximately 60-70px) + safe area bottom inset
  const bottomPadding = 30 + (insets.bottom || 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header Section (Black) */}
      <View style={styles.headerContainer}>
        <Ionicon name="information-circle" size={26} color="#FFFC35" />
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Description Section (Yellow) */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            This AI-Powered Parking Management Owner App Allows Parking Lot
            Owners To Efficiently Manage Their Spaces, Track Occupancy, View
            Earnings, And Ensure Secure Access.
          </Text>
          <Text style={styles.descriptionText}>
            It Empowers Owners With Real-Time Insights, Customer Feedback, And
            Automated Reporting To Maximize Utilization And Revenue While
            Ensuring Smooth Parking Operations.
          </Text>
        </View>

        {/* How We Work Section (White) */}
        <View style={styles.howItWorksContainer}>
          <Text style={styles.howItWorksTitle}>How We Work</Text>

          <HowItWorksItem
            icon="parking"
            title="Add Parking Location"
            description="Register Your Parking Space’ With Details Like Address, Slots, Pricing"
          />
          <HowItWorksItem
            icon="sliders-h"
            title="Manage Slots"
            description="Update Availability In Real-Time, Block Reserved Spots, Or Open New Ones"
          />
          <HowItWorksItem
            icon="share-alt"
            title="Track Booking"
            description="Monitor Reservations And Check-In/ Check-Out Status"
          />
          <HowItWorksItem
            icon="chart-bar"
            title="View Reports"
            description="Access Daily/Weekly/Monthly Earnings And Slot Usage"
          />
          <HowItWorksItem
            icon="star"
            title="Customer Feedback"
            description="See Reviews And Respond To User Concerns Directly"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFD85", 
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFD85", 
  },
  headerContainer: {
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
    marginLeft: 8,
    marginRight: 17,
  },
  descriptionContainer: {
    backgroundColor: "#FFFD85", 
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30, 
    paddingLeft: 35,
    borderBottomRightRadius: 250,
    marginTop: -30, 
  },
  descriptionText: {
    fontSize: 16.5, 
    fontWeight: "500",
    color: "#333",
    textAlign: "left",
    marginBottom: 20,
    lineHeight: 25,
  },
  howItWorksContainer: {
    backgroundColor: "#fff",
    padding: 25,
    paddingTop: 30, 
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    marginTop: -15, 
  },
  howItWorksTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
    marginTop: 5,
    marginBottom: 30,
  },
  workItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 25,
    marginLeft: 8,
  },
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFE0", 
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  workItemText: {
    flex: 1,
  },
  workItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  workItemDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
});

export default AboutUsScreen;
