import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, Platform, Dimensions } from 'react-native';
import { Box, Text, Spinner, VStack, Icon, HStack, Select, CheckIcon, Pressable } from 'native-base';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import RideDetailsCard from './RideDetailsCard';
import { useRoute } from '@react-navigation/native';
import RecurringRidesListScreen from './RecurringRidesListScreen';
import ScheduledRidesListScreen from './ScheduledRidesListScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import { MotiView } from 'moti';

const EmptyRideState = ({ message }) => (
  <VStack space={4} alignItems="center" justifyContent="center" flex={1} p={6}>
    <Icon as={MaterialIcons} name="directions-car" size="6xl" color="gray.300" />
    <Text fontSize="lg" fontWeight="bold" textAlign="center" color="gray.500">
      {message}
    </Text>
    <Text fontSize="md" textAlign="center" color="gray.400">
      Your journey history will appear here once you start riding with us.
    </Text>
  </VStack>
);

// Create a custom dropdown animation component
const AnimatedDropdown = ({ children, isOpen }) => (
  <MotiView
    animate={{
      height: isOpen ? 'auto' : 0,
      opacity: isOpen ? 1 : 0,
    }}
    transition={{
      type: 'timing',
      duration: 300,
    }}
  >
    {children}
  </MotiView>
);

const RideHistoryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const initialTab = route.params?.initialTab || 0;
  const [selectedType, setSelectedType] = useState('passenger');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const rideTypes = [
    { key: 'passenger', title: 'Rides Taken', icon: 'emoji-people' },
    { key: 'driver', title: 'Rides Provided', icon: 'drive-eta' },
    { key: 'recurring', title: 'Recurring Rides', icon: 'loop' },
    { key: 'scheduled', title: 'Scheduled Rides', icon: 'schedule' }
  ];

  const fetchRideHistory = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');
      const driverId = await AsyncStorage.getItem('driverId');

      let response;
      if (selectedType === 'passenger') {
        response = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getRequestByPassenger?passengerId=${passengerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sortedRides = response.data.sort((a, b) =>
          new Date(b.rideDto.rideDate) - new Date(a.rideDto.rideDate)
        );
        setRides(sortedRides);
      } else if (selectedType === 'driver') {
        response = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByDriver?id=${driverId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const sortedRides = response.data.sort((a, b) =>
          new Date(b.rideDate) - new Date(a.rideDate)
        );
        setRides(sortedRides);
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRideHistory();
  }, [selectedType]);

  useFocusEffect(
    useCallback(() => {
      fetchRideHistory();
    }, [selectedType])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRideHistory();
  }, [selectedType]);

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" color="black" />
        </Box>
      );
    }

    if (selectedType === 'recurring') {
      return <RecurringRidesListScreen />;
    }

    if (selectedType === 'scheduled') {
      return <ScheduledRidesListScreen />;
    }

    if (!rides || rides.length === 0) {
      return <EmptyRideState message={`No ${selectedType === 'passenger' ? 'rides taken' : 'rides offered'} yet`} />;
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === 'ios' ? 90 : 70
        }}
      >
        <Box p="6" bg="#f9f9f9">
          {rides.map((ride) => {
            if (!ride) return null;

            const rideData = selectedType === 'passenger' 
              ? {
                  ...(ride.rideDto || {}),
                  passengers: [{ ...ride }],
                  status: ride.status || ride.rideDto?.status || 'PENDING',
                  driverDetails: ride.rideDto?.driverDetails 
                    ? {
                        ...(ride.rideDto.driverDetails || {}),
                        avgRating: ride.rideDto.rating
                      }
                    : null
                }
              : ride;

            if (!rideData) return null;

            return (
              <RideDetailsCard
                key={ride.id || `ride-${Math.random()}`}
                data={rideData}
                onPress={() => {
                  if (selectedType === 'passenger') {
                    if (ride.rideDto?.id) {
                      navigation.navigate('RideDetails', { 
                        rideId: ride.rideDto.id,
                        isDriver: false,
                        rideType: 'regular',
                        status: ride.status || ride.rideDto?.status
                      });
                    }
                  } else {
                    navigation.navigate('ManageRide', { ride });
                  }
                }}
              />
            );
          })}
        </Box>
      </ScrollView>
    );
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <HStack alignItems="center" px={6} py={4} space={4} bg="white">
        <BackButton onPress={() => navigation.goBack()} />
        <Text fontSize="xl" fontWeight="600" color="gray.800">
          Ride History
        </Text>
      </HStack>

      <Box px={6} py={2}>
        <Pressable
          onPress={() => {
            if (Platform.OS === 'android') {
              // Custom bottom sheet behavior for Android
              // You might want to implement a custom bottom sheet here
            }
          }}
        >
          <Select
            selectedValue={selectedType}
            onValueChange={setSelectedType}
            _selectedItem={{
              bg: "gray.200",
              endIcon: <CheckIcon size={4} />,
            }}
            accessibilityLabel="Choose ride type"
            placeholder="Choose ride type"
            mt={1}
            fontSize="md"
            height={12}
            borderRadius="lg"
            borderWidth={1}
            borderColor="gray.300"
            bg="white"
            _dark={{ bg: "gray.800" }}
          >
            {rideTypes.map((type) => (
              <Select.Item 
                key={type.key} 
                label={type.title} 
                value={type.key}
                leftIcon={
                  <Icon 
                    as={MaterialIcons} 
                    name={type.icon} 
                    size={5} 
                    color="gray.600" 
                    mr={2}
                  />
                }
              />
            ))}
          </Select>
        </Pressable>
      </Box>

      <Box flex={1} bg="#f9f9f9">
        {renderContent()}
      </Box>
    </Box>
  );
};

export default RideHistoryScreen;