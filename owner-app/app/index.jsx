import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MyLogo from "../assets/images/Logo.svg";
import "expo-dev-client";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/LaunchScreen");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <MyLogo width={450} height={350} style={styles.image} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFD78",
    alignItems: "center",
  },
  image: {
    marginTop: 210,
  },
});
