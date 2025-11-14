import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function TabLayout() {
  const { user, authLoading } = useAuth();

  if (authLoading) return null;
  if (!user) return <Redirect href="/(auth)/LoginScreen" />;

  return (
    <Tabs
      screenOptions={{ 
        headerShown: false, 
        tabBarActiveTintColor: "yellow",
        tabBarStyle: { display: 'none' } // Hide default tab bar, using PersistentTabBar instead
      }}
    >
      <Tabs.Screen name="HomeScreen" options={{ title: "Home" }} />
      <Tabs.Screen name="BookingsScreen" options={{ title: "BookingView" }} />
      <Tabs.Screen name="ManageLotsScreen" options={{ title: "Manage" }} />
      <Tabs.Screen name="AnalyticsScreen" options={{ title: "Analytics" }} />
      <Tabs.Screen name="SettingsScreen" options={{ title: "Settings" }} />
    </Tabs>
  );
}
