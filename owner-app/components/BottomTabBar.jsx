import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function BottomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];

        const label = options.tabBarLabel ?? options.title ?? route.name;

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
            <FontAwesome
              name={getIconName(route.name)}
              size={24}
              color={isFocused ? "#000" : "#9CA3AF"}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function getIconName(name) {
  switch (name) {
    case "home":
      return "home";
    case "bookings":
      return "calendar";
    case "manage":
      return "tasks";
    case "analytics":
      return "bar-chart";
    case "settings":
      return "cog";
    default:
      return "circle";
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 8,
    justifyContent: "space-around",
  },
  item: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 6,
    gap: 4,
  },
  label: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  labelActive: {
    color: "#000",
    fontWeight: "600",
  },
});
