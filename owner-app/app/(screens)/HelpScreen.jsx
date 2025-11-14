import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";

// Reusable component for the help buttons
const HelpButton = ({ icon, name, iconPack = "FontAwesome5", onPress }) => {
  const IconComponent = iconPack === "Material" ? MaterialIcon : Icon;

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.buttonContent}>
        <IconComponent name={icon} size={20} color="#333" />
        <Text style={styles.buttonText}>{name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const HelpAndSupportScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Help content data
  const helpContent = {
    "How to use the system": {
      icon: "cog",
      title: "How to use the system",
      content: [
        "Welcome to the Smart Parking Automation System!",
        "",
        "Here's a quick guide to get you started:",
        "",
        "1. Adding Parking Lots:",
        "   - Navigate to the Manage Lots screen",
        "   - Click 'Add Parking Lots' button",
        "   - Fill in the required information",
        "   - Set your parking lot location on the map",
        "",
        "2. Defining Parking Slots:",
        "   - Select a parking lot from your list",
        "   - Click 'Map View' to define parking slots",
        "   - Draw polygons on the video feed to mark each slot",
        "",
        "3. Viewing Live Data:",
        "   - Click 'Lot View' on any parking lot",
        "   - See real-time occupancy and license plate recognition",
        "",
        "4. Managing Bookings:",
        "   - View all bookings in the Bookings screen",
        "   - Track ongoing, completed, and cancelled bookings",
        "",
        "For more detailed instructions, please contact our support team.",
      ],
    },
    "Billing issues": {
      icon: "file-invoice-dollar",
      title: "Billing issues",
      content: [
        "Having trouble with billing? We're here to help!",
        "",
        "Common billing questions:",
        "",
        "1. Payment Methods:",
        "   - We accept credit/debit cards",
        "   - Payment is processed securely",
        "",
        "2. Subscription Plans:",
        "   - View your current plan in Settings",
        "   - Upgrade or downgrade anytime",
        "   - Changes take effect immediately",
        "",
        "3. Invoice & Receipts:",
        "   - All invoices are sent to your registered email",
        "   - Download receipts from your account",
        "",
        "4. Refunds:",
        "   - Contact support for refund requests",
        "   - Refunds processed within 5-7 business days",
        "",
        "If you're experiencing billing issues not covered here, please contact our support team for assistance.",
      ],
    },
    "System Errors": {
      icon: "history",
      iconPack: "MaterialIcon",
      title: "System Errors",
      content: [
        "Troubleshooting System Errors",
        "",
        "If you're experiencing system errors, try these steps:",
        "",
        "1. Check Your Connection:",
        "   - Ensure you have a stable internet connection",
        "   - Try refreshing the app",
        "",
        "2. Clear Cache:",
        "   - Go to Settings",
        "   - Clear app cache and data",
        "   - Restart the application",
        "",
        "3. Update the App:",
        "   - Make sure you're using the latest version",
        "   - Check for updates in your app store",
        "",
        "4. Common Error Codes:",
        "   - Error 404: Page not found - try refreshing",
        "   - Error 500: Server issue - wait a few minutes",
        "   - Error 401: Authentication required - log in again",
        "",
        "5. Still Having Issues?",
        "   - Contact our technical support team",
        "   - Provide error codes and screenshots if possible",
        "",
        "Our support team is available 24/7 to assist you.",
      ],
    },
    "Contact Support": {
      icon: "headset",
      title: "Contact Support",
      content: [
        "Get in Touch with Our Support Team",
        "",
        "We're here to help you! Choose your preferred method:",
        "",
        "1. Email Support:",
        "   - Email: support@parkingautomation.com",
        "   - Response time: Within 24 hours",
        "",
        "2. Phone Support:",
        "   - Phone: +1 (555) 123-4567",
        "   - Hours: Monday-Friday, 9 AM - 6 PM",
        "",
        "3. Live Chat:",
        "   - Available in the app",
        "   - Click the chat icon in the bottom right",
        "   - Response time: Usually within minutes",
        "",
        "4. In-App Support:",
        "   - Go to Settings > Help & Support",
        "   - Submit a support ticket",
        "",
        "5. Emergency Support:",
        "   - For urgent issues, call our emergency line",
        "   - Available 24/7 for critical system issues",
        "",
        "We aim to respond to all inquiries as quickly as possible!",
      ],
    },
    "FAQs": {
      icon: "comments",
      title: "Frequently Asked Questions",
      content: [
        "Frequently Asked Questions",
        "",
        "Q: How do I add a new parking lot?",
        "A: Go to Manage Lots > Add Parking Lots, fill in the details, and set the location on the map.",
        "",
        "Q: How do I define parking slots?",
        "A: Select a parking lot, click 'Map View', and draw polygons on the video feed to mark each slot.",
        "",
        "Q: Can I change my subscription plan?",
        "A: Yes! Go to Settings > Manage Subscription to upgrade or downgrade your plan.",
        "",
        "Q: How does license plate recognition work?",
        "A: Our system uses AI to automatically detect and recognize license plates from camera feeds.",
        "",
        "Q: What payment methods do you accept?",
        "A: We accept all major credit and debit cards. Payment is processed securely.",
        "",
        "Q: How do I view my booking history?",
        "A: Navigate to the Bookings screen to see all your past and current bookings.",
        "",
        "Q: Can I get a refund?",
        "A: Refund requests are handled on a case-by-case basis. Contact support for assistance.",
        "",
        "Still have questions? Contact our support team!",
      ],
    },
  };

  const openModal = (topicName) => {
    setSelectedTopic(topicName);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTopic(null);
  };

  const getHelpData = () => {
    if (!selectedTopic) return null;
    return helpContent[selectedTopic];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="question-circle" size={26} color="#FFFC35" solid />
        <Text style={styles.headerTitle}>Help and Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.mainTitle}>How can we help?</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={18}
            color="#555"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Help & Support"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Help Options */}
        <HelpButton
          icon="cog"
          name="How to use the system"
          onPress={() => openModal("How to use the system")}
        />
        <HelpButton
          icon="file-invoice-dollar"
          name="Billing issues"
          onPress={() => openModal("Billing issues")}
        />
        <HelpButton
          icon="history"
          name="System Errors"
          iconPack="MaterialIcon"
          onPress={() => openModal("System Errors")}
        />
        <HelpButton
          icon="headset"
          name="Contact Support"
          onPress={() => openModal("Contact Support")}
        />
        <HelpButton
          icon="comments"
          name="FAQs"
          onPress={() => openModal("FAQs")}
        />
      </ScrollView>

      {/* Help Content Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              {getHelpData() && (
                <>
                  {getHelpData().iconPack === "MaterialIcon" ? (
                    <MaterialIcon
                      name={getHelpData().icon}
                      size={24}
                      color="#FFFC35"
                    />
                  ) : (
                    <Icon
                      name={getHelpData().icon}
                      size={24}
                      color="#FFFC35"
                    />
                  )}
                  <Text style={styles.modalTitle}>
                    {getHelpData().title}
                  </Text>
                </>
              )}
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseButton}
              >
                <MaterialIcon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {getHelpData() && (
                <View style={styles.modalContentContainer}>
                  {getHelpData().content.map((line, index) => (
                    <Text key={index} style={styles.modalText}>
                      {line}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginLeft: 8,
    marginRight: 8,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 160, // Space for back button and nav bar
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFEC7", // Light yellow
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 55,
    fontSize: 18,
    color: "#333",
  },
  button: {
    backgroundColor: "#FFFD85", // Light yellow
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 15,
  },
  backButton: {
    position: "absolute",
    bottom: 100, // Position above the nav bar
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
  navBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
    paddingBottom: 20, // Extra padding for home indicator
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    paddingVertical: 20,
    paddingTop: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    position: "relative",
  },
  modalTitle: {
    color: "#FFFC35",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalCloseButton: {
    position: "absolute",
    right: 20,
    top: 30,
    padding: 5,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContentContainer: {
    paddingBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 8,
  },
});

export default HelpAndSupportScreen;
