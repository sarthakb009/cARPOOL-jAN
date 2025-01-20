import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Divider, Button } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const dummyRideRequests = [
  {
    id: 1,
    rideId: 101,
    passengerId: 201,
    passengerDetails: {
      firstName: 'John',
      lastName: 'Doe'
    }
  },
  {
    id: 2,
    rideId: 102,
    passengerId: 202,
    passengerDetails: {
      firstName: 'Jane',
      lastName: 'Doe'
    }
  }
];

const dummyDriverId = 301;

const RideRequestsScreen = ({ navigation }) => {
  const [rideRequests, setRideRequests] = useState(dummyRideRequests);
  const [driverId, setDriverId] = useState(dummyDriverId);

  const acceptRideRequest = (requestId, passengerId) => {
    setRideRequests(prevRequests =>
      prevRequests.filter(request => request.passengerId !== passengerId || request.id === requestId)
    );
    alert('Ride request accepted and other requests from the passenger canceled.');
  };

  const rejectRideRequest = (requestId) => {
    setRideRequests(prevRequests =>
      prevRequests.filter(request => request.id !== requestId)
    );
    alert('Ride request rejected.');
  };

  const renderRideRequestCard = (request) => {
    const passengerName = `${request.passengerDetails.firstName} ${request.passengerDetails.lastName}`;
    const passengerImg = 'https://via.placeholder.com/150';

    return (
      <TouchableOpacity key={request.id} style={styles.rideRequestCard}>
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center">
            <Image source={{ uri: passengerImg }} style={styles.passengerImg} />
            <VStack ml="4">
              <Text fontSize="lg" color="coolGray.800" fontWeight="600">{passengerName}</Text>
              <Text fontSize="md" color="coolGray.500" mt="1">Ride Request Details</Text>
            </VStack>
          </HStack>
        </HStack>
        <Divider my="4" />
        <HStack alignItems="center" justifyContent="space-between">
          <Button colorScheme="green" onPress={() => acceptRideRequest(request.id, request.passengerId)}>Accept</Button>
          <Button colorScheme="red" onPress={() => rejectRideRequest(request.id)}>Reject</Button>
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Box p="6" bg="#f9f9f9" flex={1}>
        {rideRequests.length > 0 ? (
          <VStack space={4}>
            {rideRequests.map(renderRideRequestCard)}
          </VStack>
        ) : (
          <Text fontSize="md" color="coolGray.500" textAlign="center">No ride requests available</Text>
        )}
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  rideRequestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
    padding: 20,
    marginBottom: 20,
  },
  passengerImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

export default RideRequestsScreen;
