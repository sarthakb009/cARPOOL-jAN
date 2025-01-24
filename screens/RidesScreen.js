import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Box, Heading, VStack, HStack, Text, Icon, Divider } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RidesScreen = ({ navigation }) => {
  const [rides, setRides] = useState([]);
  const [driverId, setDriverId] = useState(null);

  const fetchRides = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByDateRange?start=${new Date().toISOString().split('T')[0]}&end=${new Date().toISOString().split('T')[0]}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRides(response.data.filter(ride => ride.driverDetails.id === driverId));
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while fetching rides.');
    }
  };

  useEffect(() => {
    const getDriverId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('userToken');
        const userResponse = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/customer/getById?id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const userPhone = userResponse.data.phone;

        const driverResponse = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/getByPhone?phone=${userPhone}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (driverResponse.data.id) {
          setDriverId(driverResponse.data.id);
          fetchRides();
        }
      } catch (error) {
        Alert.alert('Error', 'Something went wrong while checking the profile.');
      }
    };

    getDriverId();
  }, []);

  const renderRideCard = (ride) => {
    const driverName = ride.driverDetails ? `${ride.driverDetails.driverFirstName} ${ride.driverDetails.driverLastName}` : 'Driver Name';
    const driverImg = 'https://via.placeholder.com/150';
    const driverRating = ride.driverDetails && ride.driverDetails.avgRating ? ride.driverDetails.avgRating : '0';
    const vehicleImg = 'https://via.placeholder.com/60';
    const vehicleDetails = ride.vehicleDto && ride.vehicleDto.vehicleNumber ? `${ride.vehicleDto.vehicleNumber}` : 'Vehicle Details';
    const pickup = ride.source || 'Pickup Location';
    const pickupAddress = ride.sourceLatitude && ride.sourceLongitude ? `${ride.sourceLatitude}, ${ride.sourceLongitude}` : 'Pickup Address';
    const drop = ride.destination || 'Drop Location';
    const dropAddress = ride.destinationLatitude && ride.destinationLongitude ? `${ride.destinationLatitude}, ${ride.destinationLongitude}` : 'Drop Address';
    const datetimePickup = ride.rideScheduledStartTime || 'Pickup Time';
    const datetimeDrop = ride.rideScheduledEndTime || 'Drop Time';
    const seatsAvailable = 'Seats Available';
    const price = 'Price';

    return (
      <TouchableOpacity key={ride.id} onPress={() => navigation.navigate('RideDetails', { rideId: ride.id })} style={styles.rideCard}>
        <HStack alignItems="center" justifyContent="space-between">
          <HStack alignItems="center">
            <Image source={{ uri: driverImg }} style={styles.driverImg} />
            <VStack ml="4">
              <Text fontSize="lg" color="coolGray.800" fontWeight="600">{driverName}</Text>
              <Text fontSize="md" color="coolGray.500" mt="1">{vehicleDetails}</Text>
              <HStack alignItems="center" mt="1">
                <Icon as={MaterialIcons} name="star" size="sm" color="#FFC107" />
                <Text fontSize="md" color="coolGray.600" ml="1">{driverRating}</Text>
              </HStack>
            </VStack>
          </HStack>
          <Image source={{ uri: vehicleImg }} style={styles.vehicleImg} />
        </HStack>
        <Divider my="4" />
        <HStack alignItems="center" justifyContent="space-between">
          <VStack>
            <HStack alignItems="center">
              <Icon as={MaterialIcons} name="location-on" size="sm" color="#4CAF50" />
              <Text fontSize="md" color="coolGray.800" ml="2">{pickup}</Text>
            </HStack>
            <Text fontSize="sm" color="coolGray.500" ml="6">{pickupAddress}</Text>
          </VStack>
          <Text fontSize="md" color="coolGray.800">{datetimePickup}</Text>
        </HStack>
        <Divider my="4" />
        <HStack alignItems="center" justifyContent="space-between">
          <VStack>
            <HStack alignItems="center">
              <Icon as={MaterialIcons} name="location-on" size="sm" color="#F44336" />
              <Text fontSize="md" color="coolGray.800" ml="2">{drop}</Text>
            </HStack>
            <Text fontSize="sm" color="coolGray.500" ml="6">{dropAddress}</Text>
          </VStack>
          <Text fontSize="md" color="coolGray.800">{datetimeDrop}</Text>
        </HStack>
        <Divider my="4" />
        <HStack alignItems="center" justifyContent="space-between">
          <Text fontSize="md" color="coolGray.800">
            <Icon as={MaterialIcons} name="event-seat" size="sm" color="#4CAF50" />
            <Text ml="2">{seatsAvailable}</Text>
          </Text>
          <Text fontSize="md" color="coolGray.800">
            <Icon as={MaterialIcons} name="attach-money" size="sm" color="#4CAF50" />
            <Text ml="2">{price}</Text>
          </Text>
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Box p="6" bg="#f9f9f9" flex={1}>
        {rides.length > 0 ? (
          <VStack space={4}>
            {rides.map(renderRideCard)}
          </VStack>
        ) : (
          <Text fontSize="md" color="coolGray.500" textAlign="center">No rides available</Text>
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
  rideCard: {
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
  driverImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  vehicleImg: {
    width: 60,
    height: 40,
  },
});

export default RidesScreen;
