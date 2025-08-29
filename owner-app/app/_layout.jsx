import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthProvider from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LoadingProvider } from "../context/LoadingContext";
import GlobalSpinner from "../components/GlobalSpinner";
import "expo-dev-client";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LoadingProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="addparkinglot" />
            </Stack>
            <GlobalSpinner />
          </SafeAreaProvider>
        </LoadingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
