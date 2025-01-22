// ScheduledRidesListScreen.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, Platform, RefreshControl } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Spinner, useToast, Avatar } from 'native-base';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const ScheduledRideCard = ({ ride }) => {
  const navigation = useNavigation();

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <Pressable
      onPress={() => navigation.navigate('RideDetails', { rideId: ride.id })}
    >
      <Box
        bg="black"
        rounded="2xl"
        shadow={2}
        mb={4}
        mx={4}
        overflow="hidden"
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          start={[0, 0]}
          end={[1, 1]}
        >
          <VStack space={3} p={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="lg" fontWeight="bold" color="white" flex={1} numberOfLines={1}>
                {ride.source} → {ride.destination}
              </Text>
              <Box
                bg="amber.500"
                px={3}
                py={1}
                rounded="full"
                ml={2}
              >
                <Text color="white" fontSize="xs" fontWeight="bold">
                  Scheduled
                </Text>
              </Box>
            </HStack>

            <HStack space={4} alignItems="center">
              <Icon as={MaterialCommunityIcons} name="calendar-clock" size="sm" color="gray.400" />
              <Text fontSize="sm" color="gray.400">
                {formatDate(ride.rideDate)} • {formatTime(ride.rideStartTime)}
              </Text>
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
                  <Icon as={MaterialCommunityIcons} name="car-seat" size="sm" color="gray.400" />
                  <Text fontSize="sm" color="gray.400">
                    {ride.passengers?.length || 0}/{ride.vehicleDto?.vehicleCapacity || '?'}
                  </Text>
                </HStack>
                <Text fontSize="xs" color="gray.500">{ride.vehicleDto?.vehicleNumber}</Text>
              </VStack>
            </HStack>
          </VStack>
        </LinearGradient>
      </Box>
    </Pressable>
  );
};

const ScheduledRidesListScreen = () => {
  const navigation = useNavigation();
  const [isDriver, setIsDriver] = useState(true);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRides();
  }, [isDriver]);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem(isDriver ? 'driverId' : 'passengerId');
      
      if (!token || !userId) {
        toast.show({
          title: "Authentication Error",
          description: "Please log in again",
          status: "error"
        });
        setRides([]);
        return;
      }

      const endpoint = isDriver
        ? `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/scheduledRides?id=${userId}`
        : `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByPassengerId?id=${userId}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const validRides = Array.isArray(response.data) ? response.data.filter(ride => ride && ride.id) : [];
      setRides(validRides);
    } catch (error) {
      console.error('Error fetching scheduled rides:', error);
      setRides([]);
      toast.show({
        title: "Error",
        description: "Failed to fetch scheduled rides",
        status: "error"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const togglePosition = isDriver ? 120 : 0;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(togglePosition, {
      damping: 15,
      stiffness: 120
    }) }]
  }));

  if (loading && !refreshing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Box style={styles.headerContainer}>
        <Box style={styles.toggleWrapper}>
          <Pressable 
            onPress={() => {
              setIsDriver(!isDriver);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Box style={styles.toggleContainer}>
              <Animated.View style={[styles.toggleIndicator, animatedStyle]} />
              <HStack width="100%" px={2}>
                <Box style={styles.toggleOption}>
                  <Text style={[styles.toggleText, !isDriver && styles.toggleTextActive]}>
                    Passenger
                  </Text>
                </Box>
                <Box style={styles.toggleOption}>
                  <Text style={[styles.toggleText, isDriver && styles.toggleTextActive]}>
                    Driver
                  </Text>
                </Box>
              </HStack>
            </Box>
          </Pressable>
        </Box>
      </Box>

      <FlatList
        data={rides}
        renderItem={({ item }) => <ScheduledRideCard ride={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
            <Icon 
              as={MaterialCommunityIcons} 
              name="calendar-blank" 
              size="6xl" 
              color="gray.300" 
            />
            <Text fontSize="lg" color="gray.500" mt={4}>
              No scheduled rides found
            </Text>
          </Box>
        }
      />
    </Box>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleContainer: {
    width: 240,
    height: 40,
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    flexDirection: 'row',
    position: 'relative',
  },
  toggleIndicator: {
    width: 120,
    height: 40,
    backgroundColor: 'black',
    borderRadius: 20,
    position: 'absolute',
  },
  toggleOption: {
    width: 120,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
    minHeight: '100%',
  },
});

export default ScheduledRidesListScreen;
