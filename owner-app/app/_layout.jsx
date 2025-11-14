import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import AuthProvider from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LoadingProvider } from "../context/LoadingContext";
import GlobalSpinner from "../components/GlobalSpinner";
import PersistentTabBar from "../components/PersistentTabBar";
import "expo-dev-client";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LoadingProvider>
          <SafeAreaProvider>
            <View style={styles.container}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(screens)" />
              </Stack>
              <GlobalSpinner />
              <PersistentTabBar />
            </View>
          </SafeAreaProvider>
        </LoadingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
