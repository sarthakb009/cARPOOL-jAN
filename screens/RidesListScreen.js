import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, RefreshControl, FlatList, Platform } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Avatar, ScrollView, Pressable } from 'native-base';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const RideCard = ({ ride, type }) => {
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'amber.500';
      case 'ongoing': return 'green.500';
      case 'completed': return 'gray.500';
      default: return 'blue.500';
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'timing',
        duration: 500,
        easing: Easing.out(Easing.ease),
      }}
    >
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
                <Text fontSize="lg" fontWeight="bold" color="white" numberOfLines={1}>
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
                  {type.toUpperCase()}
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
                  <Icon as={MaterialIcons} name="event-seat" size="sm" color="gray.400" />
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
    </MotiView>
  );
};

const RidesListScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('offered');
  const [rides, setRides] = useState({
    offered: [],
    taken: [],
    scheduled: [],
    recurring: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');
      const passengerId = await AsyncStorage.getItem('passengerId');

      // Fetch offered rides
      if (driverId) {
        const offeredResponse = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/scheduledRides?id=${driverId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRides(prev => ({ ...prev, offered: offeredResponse.data }));
      }

      // Fetch taken rides
      if (passengerId) {
        const takenResponse = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByPassengerId?id=${passengerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRides(prev => ({ ...prev, taken: takenResponse.data }));
      }

      // Fetch scheduled rides
      const scheduledResponse = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides/getByDriverId?driverId=${driverId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRides(prev => ({ ...prev, scheduled: scheduledResponse.data }));

      // Fetch recurring rides
      const recurringResponse = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/recurring-rides/getByDriverId?driverId=${driverId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRides(prev => ({ ...prev, recurring: recurringResponse.data }));

    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, []);

  const renderTab = (tab, label, count) => (
    <Pressable
      flex={1}
      onPress={() => setActiveTab(tab)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Box
        bg={activeTab === tab ? 'black' : 'transparent'}
        py={2}
        px={3}
        borderRadius="xl"
        alignItems="center"
      >
        <HStack space={2} alignItems="center">
          <Text
            fontSize="xs"
            fontWeight="600"
            color={activeTab === tab ? 'white' : 'gray.500'}
          >
            {label}
          </Text>
          {count > 0 && (
            <Box
              bg={activeTab === tab ? 'white' : 'gray.200'}
              px={1.5}
              py={0.5}
              borderRadius="full"
            >
              <Text
                fontSize="2xs"
                fontWeight="600"
                color={activeTab === tab ? 'black' : 'gray.600'}
              >
                {count}
              </Text>
            </Box>
          )}
        </HStack>
      </Box>
    </Pressable>
  );

  const renderRideCard = useCallback(({ item }) => (
    <RideCard
      key={`${activeTab}-${item.id}`}
      ride={item}
      type={activeTab}
    />
  ), [activeTab]);

  const keyExtractor = useCallback((item) => `${activeTab}-${item.id}`, [activeTab]);

  const ListEmptyComponent = useCallback(() => (
    <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
      <Text color="gray.400" fontSize="md">No {activeTab} rides found</Text>
    </Box>
  ), [activeTab]);

  return (
    <Box flex={1} bg="white" safeArea>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <HStack alignItems="center" justifyContent="space-between" mb={4}>
          <Text style={styles.headerTitle}>Your Rides</Text>
          <TouchableOpacity onPress={() => navigation.navigate('NewRide')}>
            <Icon as={Ionicons} name="add-circle" size={6} color="white" />
          </TouchableOpacity>
        </HStack>

        <Box
          bg="rgba(255,255,255,0.1)"
          p={1}
          borderRadius="2xl"
        >
          <HStack>
            {renderTab('offered', 'Offered', rides.offered.length)}
            {renderTab('taken', 'Taken', rides.taken.length)}
            {renderTab('scheduled', 'Scheduled', rides.scheduled.length)}
            {renderTab('recurring', 'Recurring', rides.recurring.length)}
          </HStack>
        </Box>
      </LinearGradient>

      <FlatList
        data={rides[activeTab]}
        renderItem={renderRideCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={ListEmptyComponent}
      />
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
});

export default RidesListScreen; 