import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import RideListScreen from '../screens/RideListScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';

const Stack = createStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RideList"
        component={RideListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RideDetails"
        component={RideDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
