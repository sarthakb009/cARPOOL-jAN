import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, Dimensions, Platform } from 'react-native';
import { Box, Text, Spinner, VStack, Icon, HStack, Select, CheckIcon, Pressable } from 'native-base';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import RideDetailsCard from './RideDetailsCard';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

const initialLayout = { width: Dimensions.get('window').width };

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

const FilterOptions = ({ filters, setFilters }) => {
  return (
    <Box p={4} bg="white" shadow={1}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <HStack space={4} alignItems="center">
          <Select
            selectedValue={filters.vehicleType}
            minWidth={120}
            placeholder="Vehicle Type"
            onValueChange={(value) => setFilters(prev => ({...prev, vehicleType: value}))}
            _selectedItem={{
              bg: "gray.200",
              endIcon: <CheckIcon size={4} />
            }}
          >
            <Select.Item label="All" value="" />
            <Select.Item label="Car" value="Car" />
            <Select.Item label="Bike" value="Bike" />
          </Select>
          
          <Pressable
            onPress={() => setFilters(prev => ({...prev, luggage: !prev.luggage}))}
            bg={filters.luggage ? "black" : "gray.200"}
            px={3}
            py={2}
            rounded="full"
          >
            <Text color={filters.luggage ? "white" : "black"}>Luggage</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilters(prev => ({...prev, music: !prev.music}))}
            bg={filters.music ? "black" : "gray.200"}
            px={3}
            py={2}
            rounded="full"
          >
            <Text color={filters.music ? "white" : "black"}>Music</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setFilters(prev => ({...prev, ac: !prev.ac}))}
            bg={filters.ac ? "black" : "gray.200"}
            px={3}
            py={2}
            rounded="full"
          >
            <Text color={filters.ac ? "white" : "black"}>AC</Text>
          </Pressable>
        </HStack>
      </ScrollView>
    </Box>
  );
};

const PassengerRides = () => {
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    vehicleType: "",
    luggage: false,
    music: false,
    ac: false
  });
  const navigation = useNavigation();

  const fetchRideHistory = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getRequestByPassenger?passengerId=${passengerId}`
      );
      setRides(response.data);
      applyFilters(response.data, filters);
    } catch (error) {
      console.error('Error fetching ride history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback((rides, currentFilters) => {
    let filtered = [...rides];

    // Filter by vehicle type
    if (currentFilters.vehicleType) {
      filtered = filtered.filter(ride => 
        ride.rideDto.vehicleDto.vehicletype === currentFilters.vehicleType
      );
    }

    // Filter by features
    if (currentFilters.luggage || currentFilters.music || currentFilters.ac) {
      filtered = filtered.filter(ride => {
        const vehicle = ride.rideDto.vehicleDto;
        return (!currentFilters.luggage || vehicle.luggage) &&
               (!currentFilters.music || vehicle.music) &&
               (!currentFilters.ac || vehicle.ac);
      });
    }

    setFilteredRides(filtered);
  }, []);

  useEffect(() => {
    applyFilters(rides, filters);
  }, [filters, rides]);

  useFocusEffect(
    useCallback(() => {
      fetchRideHistory();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRideHistory();
  }, []);

  const handleRidePress = (ride) => {
    navigation.navigate('RideDetails', { rideId: ride.rideDto.id });
  };

  if (loading && !refreshing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="#f9f9f9">
      <FilterOptions filters={filters} setFilters={setFilters} />
      {filteredRides.length === 0 ? (
        <EmptyRideState message="No rides match your filters" />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: Platform.OS === 'ios' ? 90 : 70
          }}
        >
          <Box p="6">
            {filteredRides.map((ride) => (
              <RideDetailsCard
                key={ride.id}
                data={{
                  ...ride.rideDto,
                  passengers: [{ ...ride }],
                  status: ride.status,
                  driverDetails: {
                    ...ride.rideDto.driverDetails,
                    avgRating: ride.rideDto.rating
                  }
                }}
                onPress={() => handleRidePress(ride)}
              />
            ))}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
};

const DriverRides = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchDriverRides = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');

      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getByDriver?id=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sortedRides = response.data.sort((a, b) => 
        new Date(b.rideDate) - new Date(a.rideDate)
      );

      setRides(sortedRides);
    } catch (error) {
      console.error('Error fetching driver rides:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDriverRides();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDriverRides();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDriverRides();
  }, []);

  if (loading && !refreshing) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  if (rides.length === 0) {
    return <EmptyRideState message="No rides offered yet" />;
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
        {rides.map((ride) => (
          <RideDetailsCard
            key={ride.id}
            data={ride}
            onPress={() => navigation.navigate('ManageRide', { ride })}
          />
        ))}
      </Box>
    </ScrollView>
  );
};

const RideHistoryScreen = () => {
  const route = useRoute();
  const initialTab = route.params?.initialTab || 0;

  const [index, setIndex] = useState(initialTab);
  const [routes] = useState([
    { key: 'passenger', title: 'Rides Taken' },
    { key: 'driver', title: 'Rides Provided' }
  ]);

  const renderScene = SceneMap({
    passenger: PassengerRides,
    driver: DriverRides
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: 'black', height: 3 }}
      style={{ backgroundColor: 'white', elevation: 0, shadowOpacity: 0 }}
      renderLabel={({ route, focused }) => (
        <Box 
          bg={focused ? 'black' : 'white'} 
          px={4} 
          py={2} 
          rounded="full"
        >
          <Text
            style={{
              color: focused ? 'white' : 'black',
              fontWeight: 'bold',
              fontSize: 14,
            }}
          >
            {route.title}
          </Text>
        </Box>
      )}
      tabStyle={{ width: 'auto' }}
      scrollEnabled={true}
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={initialLayout}
      renderTabBar={renderTabBar}
      swipeEnabled={true}
      animationEnabled={true}
      sceneContainerStyle={{ backgroundColor: '#f9f9f9' }}
    />
  );
};

export default RideHistoryScreen;