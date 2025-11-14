import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function ScreensLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#000",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="SlotDefinitionScreen"
          options={{
            title: "Define Parking Slots",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="LotViewScreen"
          options={{
            title: "Live View",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#000" },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="AddLotScreen"
          options={{
            headerShown: false,
            presentation: "card", 
          }}
        />
        <Stack.Screen
          name="EditProfileScreen"
          options={{
            headerShown: false,
            presentation: "card", 
          }}
        />
        <Stack.Screen
          name="ReviewScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="HelpScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AboutUsScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ManageSubscriptionsScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AddSubscriptionScreen"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="EditLotScreen"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

