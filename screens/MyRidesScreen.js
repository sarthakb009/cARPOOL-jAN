import React, { useEffect, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Box, Heading, VStack, Text, HStack, IconButton, Icon } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MyRidesScreen = ({ navigation }) => {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByDateRange?start=${new Date().toISOString().split('T')[0]}&end=${new Date().toISOString().split('T')[0]}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRides(response.data);
      } catch (error) {
        Alert.alert('Error', 'Something went wrong while fetching rides.');
      }
    };

    fetchRides();
  }, []);

  return (
    <ScrollView>
      <Box p="6" bg="#f9f9f9" flex={1}>
        <HStack alignItems="center" mb="4">
          <IconButton
            icon={<Icon as={MaterialIcons} name="arrow-back" />}
            onPress={() => navigation.goBack()}
            _icon={{ color: "#6B46C1", size: "md" }}
            _hover={{ bg: "coolGray.200" }}
            _pressed={{ bg: "coolGray.300" }}
            rounded="full"
          />
          <Heading size="lg" fontWeight="600" color="#6B46C1" ml="2">
            My Rides
          </Heading>
        </HStack>
        {rides.length > 0 ? (
          <VStack space={4}>
            {rides.map((ride, index) => (
              <Box key={index} bg="white" shadow="2" rounded="lg" p="4" mb="4">
                <Text fontSize="md" color="coolGray.800">From: {ride.source}</Text>
                <Text fontSize="md" color="coolGray.800">To: {ride.destination}</Text>
                <Text fontSize="md" color="coolGray.800">Date: {ride.rideDate}</Text>
                <Text fontSize="md" color="coolGray.800">Vehicle: {ride.vehicleDto.vehicleNumber}</Text>
                <VStack space={2} mt="2">
                  <Heading size="sm" fontWeight="600" color="coolGray.800">Passengers:</Heading>
                  {ride.passengers.length > 0 ? (
                    ride.passengers.map((passenger, index) => (
                      <Text key={index} fontSize="sm" color="coolGray.600">{passenger.name}</Text>
                    ))
                  ) : (
                    <Text fontSize="sm" color="coolGray.600">No passengers yet.</Text>
                  )}
                </VStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="md" color="coolGray.800" mt="4" textAlign="center">No rides found.</Text>
        )}
      </Box>
    </ScrollView>
  );
};

export default MyRidesScreen;
