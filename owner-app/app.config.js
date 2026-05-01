import "dotenv/config";

export default {
  expo: {
    name: "OwnerApp",
    slug: "OwnerApp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ownerapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "36ab83fd-e40d-4f25-8109-01e22820d52d",
      },
      // Expose the Google Maps API key to the app at runtime
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.easypark.ownerapp",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app uses your location to help you find your current position on the map for setting up your parking lot.",
      },
    },
    android: {
      usesCleartextTraffic: true, 
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.easypark.ownerapp",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: ["android.permission.ACCESS_FINE_LOCATION"],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
