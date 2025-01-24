// RecurringRidesListScreen.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Spinner, useToast } from 'native-base';
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

const RecurringRideCard = ({ ride }) => {
  const navigation = useNavigation();
  const toast = useToast();

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.slice(0, 5); // Format HH:mm
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <Pressable
      onPress={() => {
        if (ride.rideId) {
          navigation.navigate('RideDetails', { rideId: ride.rideId });
        } else {
          toast.show({
            title: "Info",
            description: "This recurring ride hasn't generated an actual ride yet.",
            status: "info",
            placement: "top"
          });
        }
      }}
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
              <Text fontSize="lg" fontWeight="bold" color="white">
                Recurring Ride #{ride.id}
              </Text>
              <Box
                bg="blue.500"
                px={3}
                py={1}
                rounded="full"
              >
                <Text color="white" fontSize="xs" fontWeight="bold">
                  WEEKLY
                </Text>
              </Box>
            </HStack>

            <HStack space={4} alignItems="center">
              <Icon as={MaterialCommunityIcons} name="calendar-clock" size="sm" color="gray.400" />
              <VStack>
                <Text fontSize="sm" color="gray.400">
                  Start Date
                </Text>
                <Text fontSize="sm" color="white" fontWeight="medium">
                  {formatDate(ride.startDate)}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="sm" color="gray.400">
                  End Date
                </Text>
                <Text fontSize="sm" color="white" fontWeight="medium">
                  {formatDate(ride.endDate)}
                </Text>
              </VStack>
              <VStack>
                <Text fontSize="sm" color="gray.400">
                  Time
                </Text>
                <Text fontSize="sm" color="white" fontWeight="medium">
                  {formatTime(ride.timeOfDay)}
                </Text>
              </VStack>
            </HStack>

            <VStack space={2}>
              <HStack alignItems="center" space={2}>
                <Icon as={Ionicons} name="location-outline" size="sm" color="gray.400" />
                <Text fontSize="sm" color="gray.400">
                  From: {ride.source || 'Not set'}
                </Text>
              </HStack>
              <HStack alignItems="center" space={2}>
                <Icon as={Ionicons} name="location-outline" size="sm" color="gray.400" />
                <Text fontSize="sm" color="gray.400">
                  To: {ride.destination || 'Not set'}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </LinearGradient>
      </Box>
    </Pressable>
  );
};

const RecurringRidesListScreen = () => {
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
        ? `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/GetByDriverId?driverId=${userId}`
        : `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/GetByPassengerId?passengerId=${userId}`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const validRides = Array.isArray(response.data) ? response.data.filter(ride => ride && ride.id) : [];
      setRides(validRides);
    } catch (error) {
      console.error('Error fetching recurring rides:', error);
      setRides([]);
      toast.show({
        title: "Error",
        description: "Failed to fetch recurring rides",
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
        renderItem={({ item }) => <RecurringRideCard ride={item} />}
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
              name="calendar-clock" 
              size="6xl" 
              color="gray.300" 
            />
            <Text fontSize="lg" color="gray.500" mt={4}>
              No recurring rides found
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

export default RecurringRidesListScreen;
