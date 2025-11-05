import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import BottomTabBar from "../../components/BottomTabBar";

export default function TabLayout() {
  const { user, authLoading } = useAuth();

  if (authLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarActiveTintColor: "yellow" }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
