import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MyLogo from "../assets/images/mylogo.svg";
import 'expo-dev-client';


export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/LoginScreen");
    }, 2000); // 5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <MyLogo style={styles.image} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
    justifyContent: "flex-end", // center vertically
    alignItems: "center",
  },
  image: {
    width: 200,
    height: 70,
  },
});
