import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Dimensions, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Box, Text, VStack, HStack, Button, useTheme, Pressable, Icon, Avatar } from 'native-base';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
const RideCard = ({ ride, onPress, requestStatus }) => {
  console.log('card', onPress, ride)
  const theme = useTheme();
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'amber.500';
      case 'ongoing': return 'green.500';
      case 'completed': return 'gray.500';
      default: return 'blue.500';
    }
  };
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  return (
<TouchableOpacity onPress={() => {
      console.log('Ride ID:', ride.id);
      onPress(ride.id);
    }}>
      <Box
        bg="black"
        rounded="xl"
        shadow={3}
        mb={4}
        overflow="hidden"
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          start={[0, 0]}
          end={[1, 1]}
        >
          <VStack space={3} p={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1} mr={2}>
                <Text fontSize="lg" fontWeight="bold" color="white" numberOfLines={1} ellipsizeMode="tail">
                  {ride.source} → {ride.destination}
                </Text>
                <HStack alignItems="center" mt={1}>
                  <Icon as={Ionicons} name="calendar-outline" size="sm" color="gray.400" mr={1} />
                  <Text fontSize="sm" color="gray.400">
                    {new Date(ride.rideDate).toLocaleDateString()}
                  </Text>
                  <Icon as={Ionicons} name="time-outline" size="sm" color="gray.400" ml={2} mr={1} />
                  <Text fontSize="sm" color="gray.400">
                    {formatTime(ride.rideStartTime)}
                  </Text>
                </HStack>
              </VStack>
              <Box bg={getStatusColor(ride.status)} px={2} py={1} rounded="full">
                <Text color="white" fontSize="xs" fontWeight="bold">
                  {ride.status}
                </Text>
              </Box>
            </HStack>
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Avatar
                  size="sm"
                  bg="gray.700"
                >
                  {ride.driverDetails?.driverFirstName?.charAt(0) || 'D'}
                </Avatar>
                <VStack>
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {ride.driverDetails?.driverFirstName} {ride.driverDetails?.driverLastName}
                  </Text>
                  <HStack alignItems="center">
                    <Icon as={Ionicons} name="star" size="xs" color="yellow.400" />
                    <Text fontSize="xs" color="gray.400" ml={1}>
                      {ride.driverDetails?.avgRating || 'N/A'}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
              <VStack alignItems="flex-end">
                <HStack alignItems="center" space={1}>
                  <Icon as={MaterialCommunityIcons} name="car-side" size="sm" color="gray.400" />
                  <Text fontSize="sm" color="gray.400">{ride.vehicleDto?.model || 'N/A'}</Text>
                </HStack>
                <Text fontSize="xs" color="gray.500">{ride.vehicleDto?.vehicleNumber}</Text>
              </VStack>
            </HStack>
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon as={Ionicons} name="people" size="sm" color="gray.400" />
                <Text fontSize="sm" color="gray.400">
                  {ride.passengers?.length || 0}/{ride.vehicleDto?.vehicleCapacity || '?'} seats
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </LinearGradient>
      </Box>
    </TouchableOpacity>
  );
};
const RideListScreen = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rideRequests, setRideRequests] = useState({});
  const navigation = useNavigation();
  const route = useRoute();
  const { pickupLocation, dropLocation, pickupCoords, dropCoords, rideDate, rideTime, rideDateTime } = route.params;
  const theme = useTheme();
  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');
      
      if (!token || !passengerId) {
        throw new Error('Missing authentication details');
      }

      if (!pickupCoords?.lat || !pickupCoords?.lng || !rideDateTime) {
        throw new Error('Invalid search parameters');
      }

      const url = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/passenger/searchRideByRadius`;
      const params = {
        latitude: Number(pickupCoords.lat),
        longitude: Number(pickupCoords.lng),
        minRadiusKm: 0.0,
        maxRadiusKm: 5.0,
        passengerId: Number(passengerId),
        rideDate: rideDate,
        rideTime: rideTime
      };

      console.log('Searching rides with params:', params);

      const response = await axios({
        method: 'get',
        url: url,
        params: params,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        withCredentials: false
      });
      console.log('API Response:', response.data);
      const filteredAndSortedRides = response.data
        .filter(ride => {
          if (!ride.rideStartTime) return false;
          
          const rideDateTime = new Date(ride.rideStartTime);
          const searchDateTime = new Date(rideDateTime);
          
          const timeDiff = Math.abs(rideDateTime - searchDateTime);
          const minutesDiff = Math.floor(timeDiff / 1000 / 60);
          
          return minutesDiff <= 30;
        })
        .sort((a, b) => {
          const dateA = new Date(a.rideStartTime);
          const dateB = new Date(b.rideStartTime);
          return dateA - dateB;
        });
      console.log('Raw API Response:', response.data);
      console.log('Filtered Rides:', filteredAndSortedRides);
      setRides(filteredAndSortedRides);
      const requests = {};
      for (const ride of filteredAndSortedRides) {
        try {
          const requestResponse = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getRequestByRide?rideId=${ride.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: false
          });
          const userRequest = requestResponse.data.find(request => request.passengerId.toString() === passengerId);
          if (userRequest) {
            requests[ride.id] = userRequest.status;
          }
        } catch (requestError) {
          console.error('Error fetching ride request:', requestError);
        }
      }
      setRideRequests(requests);
      setError(null);
    } catch (error) {
      console.error('Error fetching rides:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to fetch rides. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pickupCoords, dropCoords, rideDateTime]);
  useEffect(() => {
    fetchRides();
  }, [fetchRides]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, [fetchRides]);
  const renderRideItem = ({ item }) => (
    <RideCard
      ride={item}
      onPress={(rideId) => navigation.navigate('RideDetails', { rideId })}
      requestStatus={rideRequests[item.id]}
    />
  );
  const renderHeader = () => (
    <Box mb={6}>
      <HStack alignItems="center" mb={4}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon as={Ionicons} name="arrow-back" size="md" color="black" />
        </TouchableOpacity>
        <Text fontSize="3xl" fontWeight="bold" color="coolGray.800" ml={4}>
          Available Rides
        </Text>
      </HStack>
      <Text fontSize="md" color="coolGray.600" numberOfLines={1} ellipsizeMode="tail">
        {pickupLocation} → {dropLocation}
      </Text>
    </Box>
  );
  if (loading && !refreshing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <ActivityIndicator size="large" color={theme.colors.black} />
      </Box>
    );
  }
  return (
    <Box flex={1} bg="white" safeArea>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={rides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.black]}
            tintColor={theme.colors.black}
          />
        }
        ListEmptyComponent={
          <Box alignItems="center" justifyContent="center" height={300}>
            <Icon as={Ionicons} name="car-sport-outline" size="6xl" color="coolGray.300" />
            <Text fontSize="xl" fontWeight="bold" color="coolGray.800" mt={4}>
              No rides available
            </Text>
            <Text fontSize="md" color="coolGray.500" textAlign="center" mt={2} px={4}>
              Try adjusting your search or check back later for new rides.
            </Text>
          </Box>
        }
      />
    </Box>
  );
};
const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
  },
});
export default RideListScreen;
