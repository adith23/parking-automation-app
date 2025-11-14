import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

// Reusable component for the settings buttons
const SettingsButton = ({ icon, name, iconPack, onPress }) => {
  const IconComponent = iconPack === 'Material' ? MaterialIcon : Ionicon;

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.buttonContent}>
        <IconComponent name={icon} size={22} color="#333" />
        <Text style={styles.buttonText}>{name}</Text>
      </View>
      <Icon name="arrow-right" size={16} color="#333" />
    </TouchableOpacity>
  );
};

const SettingsScreen = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleEditProfile = () => {
    router.push('/(screens)/EditProfileScreen');
  };

  const handleViewReviews = () => {
    router.push('/(screens)/ReviewScreen');
  };

  const handleHelpSupport = () => {
    router.push('/(screens)/HelpScreen');
  };

  const handleAboutUs = () => {
    router.push('/(screens)/AboutUsScreen');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigate to login screen
              router.replace('/(auth)/LoginScreen');
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <Icon name="cog" size={24} color="#FFFC35" />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.container}>
        {/* Settings Options */}
        <SettingsButton 
          icon="person" 
          name="Edit Profile" 
          iconPack="Material" 
          onPress={handleEditProfile}
        />
        <SettingsButton 
          icon="chatbox-ellipses" 
          name="View Reviews" 
          iconPack="Ionicons" 
          onPress={handleViewReviews}
        />
        <SettingsButton 
          icon="help-circle" 
          name="Help and Support" 
          iconPack="Ionicons" 
          onPress={handleHelpSupport}
        />
        <SettingsButton 
          icon="information-circle" 
          name="About Us" 
          iconPack="Ionicons" 
          onPress={handleAboutUs}
        />

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 46,
    paddingTop: 70,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  headerTitle: {
    color: '#FFFC35', // Yellow color for the title
    fontSize: 22,
    fontWeight: 'bold',
    paddingLeft: 8,
    marginRight: 15,
  },
  container: {
    flex: 1, // Takes up remaining space
    padding: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#FFFD78', // Light yellow
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 15,
  },
  logoutButton: {
    backgroundColor: '#FFFFE0', // Light yellow
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    alignSelf: 'center', // Center the button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default SettingsScreen;