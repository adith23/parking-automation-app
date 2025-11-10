// A light theme color palette
const lightColors = {
    primary: '#007AFF',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#121212',
    textSecondary: '#666666',
    border: '#E0E0E0',
    success: '#28A745',
    error: '#DC3545',
    brand: '#FFFC35', // Your app's brand color
  };
  
  // A dark theme color palette
  const darkColors = {
    primary: '#0A84FF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#F5F5F5',
    textSecondary: '#AAAAAA',
    border: '#2C2C2E',
    success: '#30D158',
    error: '#FF453A',
    brand: '#FFFC35',
  };
  
  // Define font sizes and families
  const fonts = {
    body: 16,
    heading: 24,
    subheading: 20,
    // fontFamily: 'YourCustomFont-Regular', // If you've loaded custom fonts
  };
  
  // Define spacing for consistent layout
  const spacing = {
    small: 8,
    medium: 16,
    large: 24,
  };
  
  // The final palettes object
  export const palettes = {
    light: {
      colors: lightColors,
      fonts,
      spacing,
    },
    dark: {
      colors: darkColors,
      fonts,
      spacing,
    },
  };