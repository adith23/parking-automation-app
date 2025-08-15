import React, { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // On app start, check if user is logged in
    const loadUser = async () => {
      const storedUser = await authService.getUser();
      setUser(storedUser);
      setAuthLoading(false);
    };
    loadUser();
  }, []);

  const register = async (userData) => {
    const data = await authService.register(userData); // make sure authService.register exists
    setUser(data.user); // optional: only if you want to auto-login
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
