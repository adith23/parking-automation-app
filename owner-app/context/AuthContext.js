import React, { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/authService";
import api from "../services/api";
import { onLogout } from "../services/session";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen for global logout signals (e.g., from 401 interceptor)
  useEffect(() => {
    const unsubscribe = onLogout(async () => {
      await authService.logout();
      setUser(null);
    });
    return unsubscribe;
  }, []);

  // Validate session on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        const storedUser = await authService.getUser();

        if (!token || !storedUser) {
          await authService.logout();
          setUser(null);
          return;
        }

        // Verify with protected endpoint; will 401 if token is invalid/expired
        const { data } = await api.get("/owner/me/");
        setUser(data);
      } catch {
        await authService.logout();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    loadUser();
  }, []);

  const register = async (userData) => {
    // Do NOT set user here (register doesn't return a token)
    const data = await authService.register(userData);
    return data;
  };

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, register, authLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
