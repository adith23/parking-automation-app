import React, { useState } from "react";
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
import { useAuth } from "../../context/AuthContext";
import GoogleIcon from "../../assets/images/google-icon.svg";
import XIcon from "../../assets/icons/X.svg";
import FacebookIcon from "../../assets/icons/Facebook.svg";

export default function Signup() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    setSubmitting(true);
    try {
      await register({ name, email, password });
      Alert.alert("Success", "Account created! Please log in.");
      router.replace("/(auth)/LoginScreen");
    } catch (error) {
      console.log(error);
      let message = "Registration failed. Please try again.";
      if (error.response && error.response.data && error.response.data.detail) {
        message = error.response.data.detail;
      }
      Alert.alert("Signup Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerTop}></View>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lable}>Name</Text>
          <TextInput
            style={styles.input}
            onChangeText={setName}
            placeholder="Name"
            value={name}
            autoCapitalize="words"
            placeholderTextColor="#888"
          />
          <Text style={styles.lable}>Email</Text>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            placeholder="Email"
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
            placeholder="Password"
            secureTextEntry={true}
            placeholderTextColor="#888"
          />
          <View style={styles.centeraliment}>
            <TouchableOpacity
              style={styles.submitbtn}
              onPress={handleSignup}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btntext}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.centeraliment}>
            <Text style={styles.options}>or sign in with</Text>
          </View>
          <View style={styles.iconview}>
            <XIcon style={styles.icon} />
            <GoogleIcon style={styles.icon} />
            <FacebookIcon style={styles.icon} />
          </View>
          <View style={styles.navigation}>
            <Link href="/(auth)/LoginScreen">
              <Text style={styles.linktext}>
                Have an account?{" "}
                <Text style={styles.linkHighlight}>Log In</Text>
              </Text>
            </Link>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 40,
    marginLeft: 20,
    alignSelf: "center",
  },
  scrollView: {
    padding: 20,
    paddingTop: 25,
    flexGrow: 1,
    justifyContent: "center",
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
    marginTop: 20,
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
  },
  navigation: {
    justifyContent: "center",
    flex: 1,
    alignItems: "center",
    marginBottom: 30,
  },
  linktext: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3E3C0E",
    marginBottom: 30,
  },
  linkHighlight: {
    color: "#E5E100", // Dark Yellow
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
