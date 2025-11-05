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
import FrontVector from "../../assets/images/login-front-vector.svg";
import RearVector from "../../assets/images/login-rear-vector.svg";
import GoogleIcon from "../../assets/images/google-icon.svg";
import XIcon from "../../assets/images/x-icon.svg";
import FacebookIcon from "../../assets/images/facebook-icon.svg";
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
      router.replace("/(tabs)/home");
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
        <FrontVector style={styles.image} />
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
            placeholder="Email"
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.lable}>Password</Text>
          <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            placeholder="Password"
            secureTextEntry={true}
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
            <Link href="/signup">
              <Text style={styles.linktext}>Create New Account</Text>
            </Link>
          </View>
        </ScrollView>
        <View style={styles.bottomcontainer}>
          <RearVector style={styles.image} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    marginTop: 25,
  },
  title: {
    fontSize: 35,
    fontWeight: "bold",
    marginBottom: 60,
  },
  image: {
    width: "100%",
    height: 80,
  },
  icon: {
    width: 180,
    height: 180,
  },
  scrollView: {
    padding: 20,
    paddingTop: 0,
    flexGrow: 1,
    justifyContent: "center",
  },
  lable: {
    fontSize: 20,
  },
  input: {
    height: 60,
    marginVertical: 10,
    borderColor: "#000",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 20,
  },
  centeraliment: {
    alignItems: "center",
  },
  submitbtn: {
    backgroundColor: "#FFFC35",
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    width: "80%",
  },
  btntext: {
    fontSize: 22,
    fontWeight: "bold",
  },
  options: {
    fontSize: 20,
    marginTop: 10,
  },
  iconview: {
    marginTop: 10,
    gap: 50,
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  navigation: {
    marginTop: -50,
    justifyContent: "center",
    flex: 1,
    alignItems: "center",
  },
  linktext: {
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomcontainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
