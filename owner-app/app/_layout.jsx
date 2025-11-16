import { Stack, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import AuthProvider, { useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LoadingProvider } from "../context/LoadingContext";
import GlobalSpinner from "../components/GlobalSpinner";
import PersistentTabBar from "../components/PersistentTabBar";
import "expo-dev-client";

function RootLayoutNav() {
  const segments = useSegments();
  const { user } = useAuth();

  // Only show the tab bar if a user exists and they are not in the (auth) group.
  // This also correctly hides it for the root splash screen where segments are empty.
  const showTabBar = user && segments.length > 0 && segments[0] !== "(auth)";

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)" />
      </Stack>
      <GlobalSpinner />
      {showTabBar && <PersistentTabBar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LoadingProvider>
          <SafeAreaProvider>
            <RootLayoutNav />
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
