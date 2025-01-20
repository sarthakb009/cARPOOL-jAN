// ScheduledRidesListScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, RefreshControl, View, TouchableOpacity, Alert, Dimensions, Pressable, Platform } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Spinner, Center, Switch, StatusBar, Avatar } from 'native-base';
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
const { width } = Dimensions.get('window');

const ScheduledRidesListScreen = () => {
  const navigation = useNavigation();
  const [scheduledRides, setScheduledRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [passengerId, setPassengerId] = useState(null);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (driverId || passengerId) {
      fetchScheduledRides();
    }
  }, [isDriver, driverId, passengerId]);

  const fetchUserDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/user-details',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fetchedDriverId = response.data.driverId;
      const fetchedPassengerId = response.data.customerId;

      setDriverId(fetchedDriverId);
      setPassengerId(fetchedPassengerId);

      if (fetchedDriverId && fetchedPassengerId) {
        setShowToggle(true);
        setIsDriver(true);
      } else if (fetchedDriverId) {
        setIsDriver(true);
        setShowToggle(false);
      } else if (fetchedPassengerId) {
        setIsDriver(false);
        setShowToggle(false);
      } else {
        Alert.alert('Error', 'User has no valid role. Please contact support.');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details. Please try again.');
    }
  };

  const fetchScheduledRides = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = 'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides';

      let response;
      if (isDriver && driverId) {
        response = await axios.get(`${baseUrl}/getByDriverId?driverId=${driverId}`, { headers });
      } else if (!isDriver && passengerId) {
        response = await axios.get(`${baseUrl}/getByPassengerId?passengerId=${passengerId}`, { headers });
      } else {
        throw new Error('Invalid user role or ID');
      }

      const filteredAndSortedRides = response.data
        .filter(ride => ride.status === 'SCHEDULED' || ride.status === 'Scheduled')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setScheduledRides(filteredAndSortedRides);
    } catch (error) {
      console.error('Error fetching scheduled rides:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduledRides();
  };

  // Define handleLocationSelection function
  const handleLocationSelection = (selectedLocation) => {
    // Handle the selected location here
    console.log('Location selected:', selectedLocation);
    // For example, navigate back and refresh the rides list or update state accordingly
    // You can also pass this location to CreateRecurringRide if needed
  };

  const handleEditRide = (ride) => {
    navigation.navigate('ScheduleRide', {
      isEditing: true,
      rideData: {
        rideId: ride.rideId,
        passengerId: ride.passengerId,
        date: ride.date,
        source: ride.source,
        destination: ride.destination,
        scheduledTime: ride.scheduledTime,
        status: ride.status
      }
    });
  };

  const handleDeleteRide = async (rideId) => {
    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(
                `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides/Delete?id=${rideId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert("Success", "Ride deleted successfully");
              fetchScheduledRides();
            } catch (error) {
              console.error('Error deleting ride:', error);
              Alert.alert("Error", "Failed to delete ride. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderRideItem = ({ item }) => (
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
          {/* Main Ride Info */}
          <HStack justifyContent="space-between" alignItems="center">
            <VStack flex={1} mr={2}>
              <Text fontSize="lg" fontWeight="bold" color="white" numberOfLines={1} ellipsizeMode="tail">
                {item.source} → {item.destination}
              </Text>
              <HStack alignItems="center" mt={1}>
                <Icon as={Ionicons} name="calendar-outline" size="sm" color="gray.400" mr={1} />
                <Text fontSize="sm" color="gray.400">
                  {format(parseISO(item.date), 'MMM dd, yyyy')}
                </Text>
                <Icon as={Ionicons} name="time-outline" size="sm" color="gray.400" ml={2} mr={1} />
                <Text fontSize="sm" color="gray.400">
                  {format(parseISO(`2000-01-01T${item.scheduledTime}`), 'hh:mm a')}
                </Text>
              </HStack>
            </VStack>
            <Box bg={item.status === 'SCHEDULED' ? 'amber.500' : 'gray.500'} px={2} py={1} rounded="full">
              <Text color="white" fontSize="xs" fontWeight="bold">
                {item.status}
              </Text>
            </Box>
          </HStack>

          {/* User Info - Only show for passengers */}
          {!isDriver && (
            <HStack space={2} alignItems="center">
              <Avatar size="sm" bg="gray.700">
                D
              </Avatar>
              <VStack>
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Driver Name
                </Text>
                <HStack alignItems="center">
                  <Icon as={Ionicons} name="star" size="xs" color="yellow.400" />
                  <Text fontSize="xs" color="gray.400" ml={1}>4.5</Text>
                </HStack>
              </VStack>
            </HStack>
          )}
        </VStack>
      </LinearGradient>
    </Box>
  );

  const handleAddRide = () => {
    navigation.navigate('RecurringRide', {
      isDriver: isDriver,
      onLocationSelect: handleLocationSelection,
    });
  };

  const togglePosition = isDriver ? 120 : 0;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: withSpring(togglePosition, {
        damping: 15,
        stiffness: 120
      })
    }]
  }));

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      {/* Enhanced Header */}
      <Box style={styles.headerContainer}>
        <HStack alignItems="center" mb={4} width="100%">
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon as={Ionicons} name="chevron-back" size="lg" color="gray.800" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Scheduled Rides
          </Text>
        </HStack>

        {showToggle && (
          <Box style={styles.toggleWrapper}>
            <Pressable
              onPress={() => {
                setIsDriver(!isDriver);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLoading(true);
              }}
            >
              <Box style={styles.toggleContainer}>
                <Animated.View style={[styles.toggleIndicator, animatedStyle]} />
                <HStack width="100%" px={2}>
                  <Box style={styles.toggleTextContainer}>
                    <Text style={[
                      styles.toggleText,
                      !isDriver && styles.toggleTextActive
                    ]}>
                      Passenger
                    </Text>
                  </Box>
                  <Box style={styles.toggleTextContainer}>
                    <Text style={[
                      styles.toggleText,
                      isDriver && styles.toggleTextActive
                    ]}>
                      Driver
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </Pressable>
          </Box>
        )}
      </Box>

      {/* Enhanced Content */}
      <FlatList
        data={scheduledRides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item?.rideId?.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
          />
        }
        ListEmptyComponent={
          <Box style={styles.emptyStateContainer}>
            <Icon
              as={Ionicons}
              name="calendar-outline"
              size="6xl"
              color="gray.300"
            />
            <Text style={styles.emptyStateTitle}>
              No Scheduled Rides
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              Your scheduled rides will appear here
            </Text>
          </Box>
        }
      />

      {/* Enhanced FAB */}
      <Pressable
        style={styles.fab}
        onPress={handleAddRide}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <LinearGradient
          colors={['#000000', '#1a1a1a']}
          style={styles.fabGradient}
        >
          <Icon as={Ionicons} name="add" size="lg" color="white" />
        </LinearGradient>
      </Pressable>
    </Box>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  toggleWrapper: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleContainer: {
    width: 240,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    position: 'relative',
    padding: 4,
  },
  toggleIndicator: {
    position: 'absolute',
    width: 116,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    zIndex: 1,
  },
  toggleTextActive: {
    color: '#000000',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScheduledRidesListScreen;