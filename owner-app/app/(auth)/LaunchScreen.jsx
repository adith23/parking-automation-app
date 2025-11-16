import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Logo2 from "../../assets/images/Logo2.svg";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const LaunchScreen = () => {
  const router = useRouter();
  const {authLoading, user } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/(tabs)/HomeScreen");
    }
  }, [authLoading, user, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0fef7" />
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Logo2 width={290} height={200} style={styles.image} />
        </View>
        {/* Tagline */}
        <Text style={styles.tagline}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod.
        </Text>

        {/* Button Container */}
        <View style={styles.buttonContainer}>
          {/* Log In Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/LoginScreen")}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push("/(auth)/SignupScreen")}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCFEF0",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  image: {
    marginTop: 200,
  },
  tagline: {
    fontSize: 14,
    color: "#a0a0a0",
    textAlign: "center",
    marginBottom: 45,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#FFFD78",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    width: "80%",
    alignSelf: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  signupButton: {
    backgroundColor: "#F5F7DF",
    paddingVertical: 20,
    borderRadius: 30,
    width: "80%",
    alignItems: "center",
    alignSelf: "center",
  },
  signupButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3E3C0E",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#a0a0a0",
    fontWeight: "600",
    marginBottom: 180,
  },
});

export default LaunchScreen;
