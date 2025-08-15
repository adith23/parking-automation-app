import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Login
const login = async (credentials) => {
  const { data } = await api.post("/driver/login/", credentials);
  if (data.access_token) {
    await AsyncStorage.setItem("token", data.access_token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
};

// Register
const register = async (userData) => {
  try {
    const { data } = await api.post("/driver/register/", userData);
    return data;
  } catch (error) {
    console.log("Registration error:", error?.response?.data || error.message);
    throw error;
  }
};

// Logout
const logout = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
};

// Get token
const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

// Get user info
const getUser = async () => {
  const user = await AsyncStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export default { login, register, logout, getToken, getUser };
