import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import RideHistoryScreen from '../screens/RideHistoryScreen';
import RideDetailsScreen from '../screens/RideDetailsScreen';

const Stack = createStackNavigator();

const RideHistoryStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RideHistory"
        component={RideHistoryScreen}
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

export default RideHistoryStackNavigator;
