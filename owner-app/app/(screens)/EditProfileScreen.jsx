import React, { useState, useEffect } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";
import api from "../../services/api";

// Reusable component for the input fields
const InputCard = ({
  icon,
  name,
  value,
  onChangeText,
  keyboardType = "default",
  onPress,
  showArrow = false,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Icon name={icon} size={18} color="#333" />
        <Text style={styles.cardTitle}>{name}</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={false}
          pointerEvents="none"
        />
        {showArrow && (
          <View style={styles.arrowContainer}>
            <Icon name="arrow-right" size={18} color="#666" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const EditProfileScreen = () => {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'email' or 'phone'

  // OTP flow state
  const [newValue, setNewValue] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Open modal for email or phone
  const openModal = (type) => {
    setModalType(type);
    setModalVisible(true);
    setNewValue("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
  };

  // Close modal and reset state
  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
    setNewValue("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
  };

  const getCurrentValue = () => {
    return modalType === "email" ? email : phone;
  };

  const getModalTitle = () => {
    return modalType === "email" ? "Change Email" : "Change Phone Number";
  };

  const getModalIcon = () => {
    return modalType === "email" ? "envelope" : "phone";
  };

  const getPlaceholder = () => {
    return modalType === "email"
      ? "Enter new email address"
      : "Enter new phone number";
  };

  const getKeyboardType = () => {
    return modalType === "email" ? "email-address" : "phone-pad";
  };

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLocation(user.address || "");
      setEmail(user.email || "");
      setPhone(user.phone_number || "");
    }
  }, [user]);

  // Handle Get OTP button
  const handleGetOtp = async () => {
    if (!newValue) {
      Alert.alert(
        "Error",
        `Please enter a new ${modalType === "email" ? "email" : "phone number"}`
      );
      return;
    }

    // Validate email format if email
    if (modalType === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newValue)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload =
        modalType === "email"
          ? { new_email: newValue }
          : { new_phone: newValue };

      const response = await api.post("/owner/send-otp/", payload);
      setOtpSent(true);
      Alert.alert("OTP Sent", `OTP has been sent to ${newValue}`);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP button
  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      const payload =
        modalType === "email"
          ? { otp, new_email: newValue }
          : { otp, new_phone: newValue };

      await api.post("/owner/verify-otp/", payload);

      // Update local state
      if (modalType === "email") {
        setEmail(newValue);
      } else {
        setPhone(newValue);
      }

      setOtpVerified(true);
      Alert.alert("Success", "OTP verified successfully");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Invalid OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Confirm Changes button
  const handleConfirmChanges = async () => {
    if (!otpVerified) {
      Alert.alert("Error", "Please verify OTP first");
      return;
    }

    // The verification already updated the email/phone, so just refresh user data
    setIsLoading(true);
    try {
      // Refresh user data to get latest from backend
      const { data } = await api.get("/owner/me/");
      updateUser(data);

      Alert.alert(
        "Success",
        `${modalType === "email" ? "Email" : "Phone number"} updated successfully`
      );
      closeModal();
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "Failed to refresh profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Update Profile button
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: name.trim(),
        address: location.trim() || null,
      };

      const { data } = await api.put("/owner/profile/", payload);

      // Update user in context
      updateUser(data);

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.detail ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Icon name="user-edit" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Edit Name */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="pencil-alt" size={18} color="#333" />
              <Text style={styles.cardTitle}>Edit Name</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Edit Name */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="location-arrow" size={18} color="#333" />
              <Text style={styles.cardTitle}>Change or Add Address</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter your location"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Change Email */}
          <InputCard
            icon="envelope"
            name="Change Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            onPress={() => openModal("email")}
            showArrow={true}
          />

          {/* Change Phone Number */}
          <InputCard
            icon="phone"
            name="Change Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            onPress={() => openModal("phone")}
            showArrow={true}
          />

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              // Reset to original values if needed
              // For now, just navigate back or reset
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.updateButton,
              isUpdating && styles.updateButtonDisabled,
            ]}
            onPress={handleUpdateProfile}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#333" />
            ) : (
              <Text style={styles.updateButtonText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Email/Phone Modal */}
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
              <Icon name={getModalIcon()} size={24} color="#FFFC35" />
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseButton}
              >
                <MaterialIcon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* Current Email/Phone */}
              <View style={styles.modalCard}>
                <Text style={styles.modalLabel}>
                  Current {modalType === "email" ? "Email" : "Phone Number"}
                </Text>
                <View style={styles.modalInputContainer}>
                  <TextInput
                    style={styles.modalInput}
                    value={getCurrentValue()}
                    editable={false}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* New Email/Phone with Get OTP Button */}
              <View style={styles.modalCard}>
                <Text style={styles.modalLabel}>
                  New {modalType === "email" ? "Email" : "Phone Number"}
                </Text>
                <View style={styles.modalInputWithButtonContainer}>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputWithButton]}
                    value={newValue}
                    onChangeText={setNewValue}
                    placeholder={getPlaceholder()}
                    keyboardType={getKeyboardType()}
                    editable={!otpVerified}
                  />
                  <View style={{ width: 10 }} />
                  <TouchableOpacity
                    style={[
                      styles.getOtpButton,
                      (otpSent || otpVerified || isLoading) &&
                        styles.getOtpButtonDisabled,
                    ]}
                    onPress={handleGetOtp}
                    disabled={otpSent || otpVerified || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#333" size="small" />
                    ) : (
                      <Text style={styles.getOtpButtonText}>
                        {otpSent ? "Sent" : "Get OTP"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* OTP Input with Verify Button */}
              {otpSent && (
                <View style={styles.modalCard}>
                  <Text style={styles.modalLabel}>Enter OTP</Text>
                  <View style={styles.modalInputWithButtonContainer}>
                    <TextInput
                      style={[styles.modalInput, styles.modalInputWithButton]}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter OTP"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!otpVerified}
                    />
                    <View style={{ width: 10 }} />
                    <TouchableOpacity
                      style={[
                        styles.verifyButton,
                        otpVerified && styles.verifyButtonSuccess,
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={otpVerified || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#333" size="small" />
                      ) : (
                        <Text style={styles.verifyButtonText}>
                          {otpVerified ? "Verified" : "Verify"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Confirm Changes Button */}
              <TouchableOpacity
                style={[
                  styles.confirmChangesButton,
                  (!otpVerified || isLoading) &&
                    styles.confirmChangesButtonDisabled,
                ]}
                onPress={handleConfirmChanges}
                disabled={!otpVerified || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <Text style={styles.confirmChangesButtonText}>
                    Confirm Changes
                  </Text>
                )}
              </TouchableOpacity>
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
    paddingVertical: 42,
    paddingTop: 70,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  headerTitle: {
    color: "#FFFC35", // Yellow color for the title
    fontSize: 22,
    fontWeight: "bold",
    marginRight: 12,
    marginLeft: 8,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  container: {
    flex: 1, // Takes up remaining space
    padding: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFD78", // Light yellow
    borderRadius: 18,
    padding: 15,
    paddingBottom: 26,
    marginBottom: 20,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  inputContainer: {
    backgroundColor: "#FFFFE0",
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    height: 50,
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  arrowContainer: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadBox: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  uploadText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 15,
  },
  browseButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 27,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  updateButton: {
    backgroundColor: "#FFFC35",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    alignSelf: "center",
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  updateButtonDisabled: {
    opacity: 0.6,
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
    paddingBottom: 10,
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
  modalCard: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  modalInputContainer: {
    backgroundColor: "#FFFFE0",
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  modalInput: {
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  modalInputWithButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalInputWithButton: {
    flex: 1,
    backgroundColor: "#FFFFE0",
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  getOtpButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  getOtpButtonDisabled: {
    backgroundColor: "#ccc",
  },
  getOtpButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  verifyButton: {
    backgroundColor: "#FFFC35",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonSuccess: {
    backgroundColor: "#4CAF50",
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  confirmChangesButton: {
    backgroundColor: "#FFFC35",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmChangesButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmChangesButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});

export default EditProfileScreen;
