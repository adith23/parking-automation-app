import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import GoogleIcon from "../../assets/images/google-icon.svg";
import XIcon1 from "../../assets/icons/X.svg";
import FacebookIcon1 from "../../assets/icons/Facebook.svg";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login, authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to main app
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/(tabs)/HomeScreen");
    }
  }, [authLoading, user, router]);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (error) {
      console.log(error);
      let message = "Login failed. Please try again.";
      if (error.response && error.response.data && error.response.data.detail) {
        message = error.response.data.detail;
      }
      Alert.alert("Login Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerTop}></View>
        <View style={styles.header}>
          <Text style={styles.title}>Sign In Your Account</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lable}>Email</Text>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            placeholder="Enter Email Address"
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#888"
          />
          <Text style={styles.lable}>Password</Text>
          <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            placeholder="Enter Password"
            secureTextEntry={true}
            placeholderTextColor="#888"
          />
          <View style={styles.centeraliment}>
            <TouchableOpacity
              style={styles.submitbtn}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btntext}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.navigation}>
              <Link href="/(auth)/SignupScreen" asChild>
                <TouchableOpacity style={styles.createAccountButton}>
                  <Text style={styles.createAccountButtonText}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Social Login Section */}
          <View style={styles.centeraliment}>
            <Text style={styles.options}>or sign in with</Text>
          </View>
          <View style={styles.iconview}>
            <XIcon1 style={styles.socialIcon} />
            <GoogleIcon style={styles.socialIcon} />
            <FacebookIcon1 style={styles.socialIcon} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFD90",
    padding: 20,
    paddingTop: 100,
    borderBottomLeftRadius: 70,
    borderBottomRightRadius: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 40,
    marginLeft: 20,
    alignSelf: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scrollView: {
    padding: 20,
    paddingTop: 0,
    flexGrow: 1,
    justifyContent: "center",
    marginLeft: 10,
    marginTop: 30,
  },
  lable: {
    fontSize: 19,
    marginLeft: 15,
    fontWeight: "500",
    marginBottom: -1,
  },
  input: {
    backgroundColor: "#FFFEC7",
    borderRadius: 25,
    height: 60,
    marginVertical: 10,
    color: "#000",
    paddingHorizontal: 10,
    fontSize: 18,
    paddingLeft: 25,
  },
  centeraliment: {
    alignItems: "center",
    marginTop: 25,
  },
  submitbtn: {
    backgroundColor: "#FFFD78",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    width: "80%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btntext: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  options: {
    fontSize: 18,
    fontWeight: "500",
    color: "#444",
  },
  iconview: {
    gap: 30,
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 50,
  },
  socialIcon: {
    width: 60,
    height: 60,
  },
  navigation: {
    justifyContent: "center",
    flex: 1,
    alignItems: "center",
  },
  forgotPasswordContainer: {
    alignItems: "center",
    width: "85%",
    alignSelf: "center",
    marginVertical: 15,
  },
  forgotPasswordText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#444",
  },
  linktext: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3E3C0E",
  },
  createAccountButton: {
    backgroundColor: "#F5F7DF",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  createAccountButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3E3C0E",
    marginLeft: 5,
  },
});
