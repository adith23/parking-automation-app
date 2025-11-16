import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSegments, usePathname, useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import HomeIcon from "../assets/icons/Home.svg";
import AnalyticsIcon from "../assets/icons/Analytics.svg";
import ActivityIcon from "../assets/icons/Activity.svg";
import ManageIcon from "../assets/icons/Manage.svg";
import SettingsIcon from "../assets/icons/Settings.svg";

export default function PersistentTabBar() {
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Tab routes matching the tabs layout
  const tabRoutes = [
    "HomeScreen",
    "BookingsScreen",
    "ManageLotsScreen",
    "AnalyticsScreen",
    "SettingsScreen",
  ];

  // Determine if should show the tab bar
  const shouldShowTabBar = useMemo(() => {
    // Don't show on auth screens
    if (segments[0] === "(auth)" || segments[0] === "index") {
      return false;
    }

    // Only show if user is authenticated
    if (!user) {
      return false;
    }
    
    const modalScreens = ["AddLotScreen", "EditProfileScreen"];
    if (segments[0] === "(screens)" && modalScreens.includes(segments[1])) {
      return false;
    }
    return true;
  }, [segments, user, pathname]);

  // Determine active tab index based on pathname
  const activeTabIndex = useMemo(() => {
    if (pathname.includes("HomeScreen")) return 0;
    if (pathname.includes("BookingsScreen")) return 1;
    if (pathname.includes("ManageLotsScreen")) return 2;
    if (pathname.includes("AnalyticsScreen")) return 3;
    if (pathname.includes("SettingsScreen")) return 4;
    return 0;
  }, [pathname]);

  const handleTabPress = (routeName, index) => {
    if (index !== activeTabIndex) {
      router.push(`/(tabs)/${routeName}`);
    }
  };

  function getIcon(name, isFocused) {
    const iconProps = {
      width: 32,
      height: 32,
      color: isFocused ? "#000" : "#9CA3AF",
    };

    switch (name) {
      case "HomeScreen":
        return <HomeIcon {...iconProps} />;
      case "BookingsScreen":
        return <ActivityIcon {...iconProps} />;
      case "ManageLotsScreen":
        return <ManageIcon {...iconProps} />;
      case "AnalyticsScreen":
        return <AnalyticsIcon {...iconProps} />;
      case "SettingsScreen":
        return <SettingsIcon {...iconProps} />;
      default:
        return <HomeIcon {...iconProps} />;
    }
  }

  if (!shouldShowTabBar) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.container}>
        {tabRoutes.map((routeName, index) => {
          const isFocused = activeTabIndex === index;

          return (
            <TouchableOpacity
              key={routeName}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => handleTabPress(routeName, index)}
              style={styles.item}
              activeOpacity={0.7}
            >
              {getIcon(routeName, isFocused)}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#000",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  container: {
    flexDirection: "row",
    backgroundColor: "#ffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 8,
    paddingBottom: 6,
    justifyContent: "space-around",
  },
  item: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 6,
    gap: 4,
  },
});

