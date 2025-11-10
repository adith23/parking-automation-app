import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeIcon from "../assets/icons/Home.svg";
import AnalyticsIcon from "../assets/icons/Analytics.svg";
import ActivityIcon from "../assets/icons/Activity.svg";
import ManageIcon from "../assets/icons/Manage.svg";
import SettingsIcon from "../assets/icons/Settings.svg";

export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () =>
          navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.item}
            activeOpacity={0.7}
          >
            {getIcon(route.name, isFocused)}
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

function getIcon(name, isFocused) {
  const iconProps = {
    width: 32,
    height: 32,
    color: isFocused ? "#000" : "#9CA3AF",
  };

  switch (name) {
    case "home":
      return <HomeIcon {...iconProps} />;
    case "bookings":
      return <ActivityIcon {...iconProps} />;
    case "manage":
      return <ManageIcon {...iconProps} />;
    case "analytics":
      return <AnalyticsIcon {...iconProps} />;
    case "settings":
      return <SettingsIcon {...iconProps} />;
    default:
      return <HomeIcon {...iconProps} />;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#000", 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 2, // This creates the black stroke effect
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
