import React from 'react';
import { Modal, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLoading } from '../hooks/useLoading';

const GlobalSpinner = () => {
  const { isLoading } = useLoading();

  return (
    <Modal transparent={true} visible={isLoading} animationType="fade">
      <View style={styles.container}>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  spinnerContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
  },
});

export default GlobalSpinner;