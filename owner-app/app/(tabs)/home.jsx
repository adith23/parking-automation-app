// screens/MapTestScreen.js
import { View, StyleSheet, Text } from "react-native";

const home = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map API Key Test</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  title: {
    position: 'absolute',
    top: 60,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    elevation: 5,
    fontWeight: 'bold',
    zIndex: 1
  }
});

export default home;