import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import api from "../../services/api";

const SlotDefinitionScreen = () => {
  const { parkingLotId, parkingLotName } = useLocalSearchParams();

  const uri = `${api.defaults.baseURL}/owner/slot-definitions/${parkingLotId}/define-slots-ui`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: `Map Slots: ${parkingLotName}`,
          headerBackTitle: "Back",
        }}
      />
      <WebView
        source={{ uri }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text>Loading Mapping Tool...</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SlotDefinitionScreen;
