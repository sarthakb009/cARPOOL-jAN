import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { NativeBaseProvider, Text, View } from 'native-base';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
  });
  useEffect(() => {
    const requestLocationPermission = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
      // Start tracking location
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          console.log('Latitude:', latitude, 'Longitude:', longitude);
          storeLocation(latitude, longitude);
        }
      );
      // Cleanup function to stop tracking when the component unmounts
      return () => {
        locationSubscription.remove();
      };
    };
    const storeLocation = async (latitude, longitude) => {
      try {
        await AsyncStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
      } catch (error) {
        console.error('Error storing location:', error);
      }
    };
    requestLocationPermission();
  }, []);
  if (!fontsLoaded) {
    return (
      <NativeBaseProvider>
        <View flex={1} alignItems="center" justifyContent="center">
          <Text>Loading...</Text>
        </View>
      </NativeBaseProvider>
    );
  }
  return (
    <NativeBaseProvider>
      <AppNavigator />
    </NativeBaseProvider>
  );
}