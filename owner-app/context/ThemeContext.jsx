import React, { createContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palettes } from '../theme/theme';

// 1. Create the context
export const ThemeContext = createContext();

// 2. Create the provider component
export const ThemeProvider = ({ children }) => {
  // Get the device's default color scheme (light or dark)
  const deviceScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(deviceScheme || 'light');

  // Function to toggle the theme
  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // useMemo ensures the theme object is not recreated on every render,
  // preventing unnecessary re-renders of components that use the theme.
  const theme = useMemo(() => palettes[themeMode], [themeMode]);

  const value = useMemo(() => ({
    theme,
    themeMode,
    toggleTheme,
  }), [theme, themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};