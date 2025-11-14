import React from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import Edit from "../assets/images/edit.svg";
import MapView from "../assets/images/mapview.svg";
import LotView from "../assets/images/lotview.svg";
import api from "../services/api";

const ParkingLotCard = ({ item, onStatusChange }) => {
  const router = useRouter();
  const isOpen = item.is_open;
  const status = isOpen ? "Open Now" : "Closed Now";

  const handleDefineSlots = () => {
    router.push({
      pathname: "/(screens)/SlotDefinitionScreen",
      params: {
        parkingLotId: item.id,
        parkingLotName: item.name,
      },
    });
  };

  const handleLotView = () => {
    router.push({
      pathname: "/(screens)/LotViewScreen",
      params: {
        parkingLotId: item.id,
        parkingLotName: item.name,
      },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: "/(screens)/EditLotScreen",
      params: { parkingLotId: item.id },
    });
  };

  const toggleSwitch = async () => {
    const newStatus = !item.is_open;
    // Optimistically update UI
    onStatusChange(item.id, newStatus);

    try {
      await api.patch(`/owner/parking-lots/${item.id}/status`, {
        is_open: newStatus,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert UI on error
      onStatusChange(item.id, item.is_open);
      Alert.alert("Error", "Could not update the parking lot status.");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>{item.total_slots} Slots</Text>
          <Text style={styles.detailText}> | </Text>
          <Text style={styles.detailText}>${item.price_per_hour}/hr</Text>
          <Text style={styles.detailText}> | </Text>
          <Text
            style={[
              styles.statusText,
              { color: isOpen ? "#1ada47ff" : "#dc3545" },
            ]}
          >
            {status}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOpen ? "#1ada47ff" : "#dc3545" },
            ]}
          />
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={styles.mapviewButton}
            onPress={handleDefineSlots}
          >
            <MapView name="map-view" size={120} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.lotviewButton}
            onPress={handleLotView}
          >
            <LotView name="lot-view" size={120} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Edit name="pencil-alt" size={40} color="#333" />
        </TouchableOpacity>

        <View
          style={[
            styles.switchContainer,
            {
              backgroundColor: item.is_open ? "#FFFC35" : "#ffffffff",
              borderWidth: 1.5,
              borderColor: "#000",
            },
          ]}
        >
          <Switch
            trackColor={{ false: "#ffffffff", true: "#FFFC35" }}
            thumbColor="#000000ff"
            ios_backgroundColor="#ffffffff"
            onValueChange={toggleSwitch}
            value={item.is_open}
            style={styles.switch}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFD78", // Light yellow
    borderRadius: 30,
    paddingLeft: 25,
    paddingRight: 16,
    paddingTop: 18,
    paddingBottom: 18,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000ff",
    marginBottom: 5,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    marginLeft: 6,
    marginTop: 3,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 17,
  },
  lotviewButton: {
    marginLeft: 15,
  },
  cardActions: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  editButton: {
    marginTop: 10,
  },
  switchContainer: {
    width: 60,
    height: 35,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  switch: {
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }], // makes switch slightly bigger
  },
});

export default ParkingLotCard;
