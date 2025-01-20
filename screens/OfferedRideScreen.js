import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Button } from 'native-base';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const OfferedRideScreen = ({ route }) => {
  const { ride } = route.params;
  const navigation = useNavigation();

  const renderRideStatus = () => {
    switch (ride.status) {
      case 'WAITING_FOR_REQUESTS':
        return (
          <HStack alignItems="center" bg="yellow.100" p={2} rounded="md">
            <Icon as={Ionicons} name="time-outline" size="sm" color="yellow.600" mr={2} />
            <Text color="yellow.600" fontWeight="medium">Waiting for passengers</Text>
          </HStack>
        );
      case 'IN_PROGRESS':
        return (
          <HStack alignItems="center" bg="blue.100" p={2} rounded="md">
            <Icon as={Ionicons} name="car-outline" size="sm" color="blue.600" mr={2} />
            <Text color="blue.600" fontWeight="medium">Ride in progress</Text>
          </HStack>
        );
      case 'COMPLETED':
        return (
          <HStack alignItems="center" bg="green.100" p={2} rounded="md">
            <Icon as={Ionicons} name="checkmark-circle-outline" size="sm" color="green.600" mr={2} />
            <Text color="green.600" fontWeight="medium">Ride completed</Text>
          </HStack>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Box bg="white" rounded="lg" shadow={2} p={4} m={4}>
        <VStack space={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="xl" fontWeight="bold">Your Offered Ride</Text>
            {renderRideStatus()}
          </HStack>
          
          <VStack space={2}>
            <HStack alignItems="center">
              <Icon as={Ionicons} name="location-outline" size="sm" color="gray.500" mr={2} />
              <Text fontWeight="medium">From: {ride.from}</Text>
            </HStack>
            <HStack alignItems="center">
              <Icon as={Ionicons} name="location-outline" size="sm" color="gray.500" mr={2} />
              <Text fontWeight="medium">To: {ride.to}</Text>
            </HStack>
            <HStack alignItems="center">
              <Icon as={Ionicons} name="time-outline" size="sm" color="gray.500" mr={2} />
              <Text fontWeight="medium">Time: {ride.time}</Text>
            </HStack>
            <HStack alignItems="center">
              <Icon as={Ionicons} name="people-outline" size="sm" color="gray.500" mr={2} />
              <Text fontWeight="medium">Seats: {ride.seats}</Text>
            </HStack>
          </VStack>
          
          <Button 
            onPress={() => navigation.navigate('ManageRide', { ride })}
            bg="black"
            _text={{ color: 'white' }}
          >
            Manage Ride
          </Button>
        </VStack>
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 80
  },
});

export default OfferedRideScreen;