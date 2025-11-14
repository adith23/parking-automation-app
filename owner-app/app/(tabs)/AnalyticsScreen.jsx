import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import api from "../../services/api";

// --- Reusable Components ---

// Reusable Stat Card (for Bookings and Subscriptions)
const StatCard = ({ icon, title, value }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={20} color="#333" />
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

// Custom Segmented Control
const CustomSegmentedControl = ({ tabs, activeTab, onTabPress }) => (
  <View style={styles.segmentContainer}>
    {tabs.map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[
          styles.segmentButton,
          activeTab === tab && styles.segmentButtonActive,
        ]}
        onPress={() => onTabPress(tab)}
      >
        <Text
          style={[
            styles.segmentText,
            activeTab === tab && styles.segmentTextActive,
          ]}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Dynamic Bar Chart
const DynamicBarChart = ({ data, yAxisLabels, yAxisMax }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartWrapper}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  // Calculate bar heights based on actual amounts, not percentages
  const maxBarHeight = 162; // 90% of 180px chart height

  return (
    <View style={styles.chartWrapper}>
      {/* Y-Axis Labels */}
      <View style={styles.yAxis}>
        {yAxisLabels.map((label, index) => (
          <Text key={index} style={styles.yAxisLabel}>
            {label}
          </Text>
        ))}
      </View>
      {/* Bars */}
      <View style={styles.barArea}>
        {data.map((item, index) => {
          // Use actual amount instead of percentage for accurate bar height
          const amount = item.amount || 0;
          // Calculate height based on actual amount vs Y-axis max
          const heightRatio = yAxisMax > 0 ? amount / yAxisMax : 0;
          const barHeight = Math.max(heightRatio * maxBarHeight, 4); // Minimum 4px for visibility
          
          return (
            <View key={index} style={styles.barItem}>
              <View
                style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: item.color },
                ]}
              />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// --- Main Screen Component ---

const RevenueInsightsScreen = () => {
  const [bookingTab, setBookingTab] = useState("Monthly");
  const [subscriptionTab, setSubscriptionTab] = useState("Monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);

  const insets = useSafeAreaInsets();
  const bottomPadding = 50 + (insets.bottom || 0);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Map frontend tab names to backend period names
      const bookingPeriod = bookingTab.toLowerCase();
      const subscriptionPeriod = subscriptionTab.toLowerCase();

      const response = await api.get("/owner/analytics", {
        params: {
          booking_period: bookingPeriod,
          subscription_period: subscriptionPeriod,
        },
      });

      setAnalyticsData(response.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to load analytics data");
      Alert.alert(
        "Error",
        err.response?.data?.detail || "Failed to load analytics data. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [bookingTab, subscriptionTab]);

  // Fetch data on component mount and when tabs change
  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [fetchAnalytics])
  );

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "LKR 0";
    return `LKR ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate Y-axis max value and labels based on max revenue
  const calculateYAxisInfo = (data) => {
    if (!data || data.length === 0) {
      return { labels: ["0", "0", "0", "0"], max: 0 };
    }

    const amounts = data.map((item) => item.amount || 0);
    const maxAmount = Math.max(...amounts);

    if (maxAmount === 0) {
      return { labels: ["0", "0", "0", "0"], max: 0 };
    }

    // Use the actual max amount as the top of the Y-axis, rounded to a nice number
    // This ensures the Y-axis accurately reflects the data
    let yAxisMax;
    
    if (maxAmount < 100) {
      // For very small values, round to nearest 10
      yAxisMax = Math.ceil(maxAmount / 10) * 10;
    } else if (maxAmount < 1000) {
      // For values < 1000, round to nearest 50
      yAxisMax = Math.ceil(maxAmount / 50) * 50;
    } else if (maxAmount < 5000) {
      // For values 1000-5000, round to nearest 200 for better granularity
      // This gives: 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, etc.
      yAxisMax = Math.ceil(maxAmount / 200) * 200;
    } else {
      // For values >= 5000, round to nearest 500
      yAxisMax = Math.ceil(maxAmount / 500) * 500;
    }

    // Ensure yAxisMax is at least equal to maxAmount (should never be less, but safety check)
    if (yAxisMax < maxAmount) {
      yAxisMax = Math.ceil(maxAmount);
    }

    // Format labels
    const formatLabel = (value) => {
      if (value >= 1000) {
        // For values >= 1000, show in thousands with no decimal
        const thousands = value / 1000;
        // If it's a round number (like 2.0), show as "2k", otherwise show one decimal
        if (thousands % 1 === 0) {
          return `${thousands.toFixed(0)}k`;
        } else {
          return `${thousands.toFixed(1)}k`;
        }
      } else {
        // For values < 1000, show the actual value
        return value.toFixed(0);
      }
    };

    return {
      labels: [
        formatLabel(yAxisMax),
        formatLabel(yAxisMax * 0.75),
        formatLabel(yAxisMax * 0.5),
        formatLabel(yAxisMax * 0.25),
      ],
      max: yAxisMax,
    };
  };

  // Get current chart data based on selected tab
  const getBookingChartData = () => {
    if (!analyticsData?.booking_revenue?.data) {
      return [];
    }
    return analyticsData.booking_revenue.data;
  };

  const getSubscriptionChartData = () => {
    if (!analyticsData?.subscription_revenue?.data) {
      return [];
    }
    return analyticsData.subscription_revenue.data;
  };

  // Handle tab changes
  const handleBookingTabChange = (tab) => {
    setBookingTab(tab);
  };

  const handleSubscriptionTabChange = (tab) => {
    setSubscriptionTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="chart-line" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>View Revenue Insights</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFC35" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAnalytics}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Estimated Earnings Card */}
          <View style={styles.earningsCard}>
            <View style={styles.cardHeader}>
              <Icon name="file-invoice-dollar" size={20} color="#333" />
              <Text style={styles.cardTitle}>Estimated Earnings</Text>
            </View>
            <View style={styles.earningsContent}>
              <Icon name="money-bill-wave" size={24} color="#28a745" />
              <Text style={styles.earningsAmount}>
                {analyticsData?.summary
                  ? formatCurrency(analyticsData.summary.estimated_earnings)
                  : "LKR 0"}
              </Text>
            </View>
            <View style={styles.statCardContainer}>
              <StatCard
                icon="list-alt"
                title="Bookings"
                value={
                  analyticsData?.summary?.booking_count?.toString() || "0"
                }
              />
              <StatCard
                icon="credit-card"
                title="Subscriptions"
                value={
                  analyticsData?.summary?.subscription_count?.toString() || "0"
                }
              />
            </View>
          </View>

          {/* Booking Revenue */}
          <Text style={styles.sectionTitle}>Booking Revenue</Text>
          <CustomSegmentedControl
            tabs={["Weekly", "Monthly", "Annual"]}
            activeTab={bookingTab}
            onTabPress={handleBookingTabChange}
          />
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Income</Text>
              <View style={styles.chartIcons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="search" size={16} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="calendar-alt" size={16} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
            {(() => {
              const bookingData = getBookingChartData();
              const yAxisInfo = calculateYAxisInfo(bookingData);
              return (
                <DynamicBarChart
                  data={bookingData}
                  yAxisLabels={yAxisInfo.labels}
                  yAxisMax={yAxisInfo.max}
                />
              );
            })()}
          </View>

          {/* Subscription Revenue */}
          <Text style={styles.sectionTitle}>Subscription Revenue</Text>
          <CustomSegmentedControl
            tabs={["Weekly", "Monthly", "Annual"]}
            activeTab={subscriptionTab}
            onTabPress={handleSubscriptionTabChange}
          />
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Income</Text>
              <View style={styles.chartIcons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="search" size={16} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Icon name="calendar-alt" size={16} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
            {(() => {
              const subscriptionData = getSubscriptionChartData();
              const yAxisInfo = calculateYAxisInfo(subscriptionData);
              return (
                <DynamicBarChart
                  data={subscriptionData}
                  yAxisLabels={yAxisInfo.labels}
                  yAxisMax={yAxisInfo.max}
                />
              );
            })()}
          </View>
        </ScrollView>
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
    paddingVertical: 40,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#FFFC35",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  earningsCard: {
    backgroundColor: "#FFFD90",
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  earningsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  statCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFE0",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
  },
  statTitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 20,
    marginTop: 10,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFE0",
    borderRadius: 18,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 15,
    overflow: "hidden",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFD78",
    borderRadius: 20,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 16,
    color: "#555",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#333",
    fontWeight: "bold",
  },
  chartCard: {
    backgroundColor: "#FFFFE0",
    borderRadius: 20,
    margin: 20,
    padding: 15,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  chartIcons: {
    flexDirection: "row",
  },
  iconButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  chartWrapper: {
    height: 180,
    flexDirection: "row",
    marginTop: 10,
  },
  yAxis: {
    height: "90%",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    color: "#555",
  },
  barArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingLeft: 5,
  },
  barItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: 12,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    color: "#555",
    marginTop: 5,
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 50,
  },
});

export default RevenueInsightsScreen;
