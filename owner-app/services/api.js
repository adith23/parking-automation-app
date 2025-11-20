import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { emitLogout } from "./session";

// 1. Base URL
const BASE_URL = "http://98.92.143.74:8000/api/v1";

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
    if (error.response && error.response.status === 401) {
      // Clear persisted session and notify app to logout immediately
      await AsyncStorage.multiRemove(["token", "user"]);
      emitLogout("unauthorized");
    }
    return Promise.reject(error);
  }
);

export default api;
