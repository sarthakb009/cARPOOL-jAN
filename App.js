import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { NativeBaseProvider } from 'native-base';
import { useFonts, Poppins_400Regular } from '@expo-google-fonts/poppins';
import AppLoading from 'expo-app-loading';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RateRideScreen from './screens/RateRideScreen';

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
          console.log('Latitude:', latitude, 'Longitude:', longitude); // Log latitude and longitude
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
    return <AppLoading />;
  }

  return (
    <NativeBaseProvider>
      <AppNavigator />
    </NativeBaseProvider>
  );
}