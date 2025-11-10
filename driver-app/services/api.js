import axios from "axios";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. Base URL (adjust as needed)
const BASE_URL = "http://10.0.2.2:8000/api/v1";

// 2. Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// 3. Request Interceptor: Attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. Response Interceptor: Global error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized (token expired, etc.)
    if (error.response && error.response.status === 401) {
      // Optionally: clear token, redirect to login, show message, etc.
      await AsyncStorage.removeItem("token");
      // You can use a global event, navigation, or state to force logout
      DeviceEventEmitter.emit("logout");
    }
    // Optionally handle other errors (network, 500, etc.)
    return Promise.reject(error);
  }
);

export default api;
