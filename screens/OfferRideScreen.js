import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { 
  Box, 
  Heading, 
  VStack, 
  Text, 
  HStack, 
  Toast, 
  Icon, 
  Actionsheet, 
  useDisclose, 
  Switch, 
  Button, 
  FlatList 
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, CustomInput, CustomButton, CarouselItem, RecentSearchItem } from '../components/sharedComponents';
import TimePickerModal from './TimePickerModal';
import { format, parse } from 'date-fns';

const HERE_API_KEY = 'BLiCQHHuN3GFygSHe27hv4rRBpbto7K35v7HXYtANC8';

const carouselItems = [
  {
    title: "COVID-19: Show solidarity & travel safe",
    text: "See our recommendations",
    icon: "alert-circle-outline",
  },
  {
    title: "New Ride Offers Available",
    text: "Check out the latest offers",
    icon: "car-outline",
  },
  {
    title: "Refer & Earn",
    text: "Invite friends and earn rewards",
    icon: "gift-outline",
  },
];

const OfferRideScreen = () => {
  const [from, setFrom] = useState({ address: '', coordinates: null });
  const [to, setTo] = useState({ address: '', coordinates: null });
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [time, setTime] = useState('');
  const [driverId, setDriverId] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();
  const { isOpen, onOpen, onClose } = useDisclose();
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [seats, setSeats] = useState(1);
  const [routes, setRoutes] = useState([]);

  // Recurring Ride States
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const weekdays = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('userToken');
        const driverId = await AsyncStorage.getItem('driverId');

        setDriverId(driverId);

        const vehicleResponse = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/getByDriver?id=${driverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!vehicleResponse.data.length) {
          navigation.navigate('AddVehicle');
        } else {
          setVehicles(vehicleResponse.data);
          const defaultVehicle = vehicleResponse.data.find(vehicle => vehicle.isDefault);
          setSelectedVehicle(defaultVehicle || vehicleResponse.data[0]);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        Alert.alert('Error', 'Failed to load profile information. Please try again.');
      }
    };

    checkProfile();
    loadRecentSearches();
    setSelectedTime(format(new Date(), 'HH:mm'));
    fetchRoutes();
  }, [navigation]);

  useEffect(() => {
    if (route.params && route.params.address) {
      if (route.params.isFrom) {
        setFrom(route.params.address);
        setFromCoords({
          latitude: route.params.latitude,
          longitude: route.params.longitude
        });
      } else {
        setTo(route.params.address);
        setToCoords({
          latitude: route.params.latitude,
          longitude: route.params.longitude
        });
      }
    }
  }, [route.params]);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recentSearches');
      if (searches) {
        const parsedSearches = JSON.parse(searches);
        const validSearches = parsedSearches.filter(search => search.from && search.to);
        setRecentSearches(validSearches);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearches = async () => {
    if (!from.address || !to.address) return;

    const searchEntry = {
      from: from.address,
      to: to.address,
      fromCoords: from.coordinates,
      toCoords: to.coordinates,
      time: new Date().toLocaleString(),
    };

    try {
      let searches = recentSearches.filter(search =>
        !(search.from === searchEntry.from && search.to === searchEntry.to)
      );
      searches.unshift(searchEntry);
      if (searches.length > 3) {
        searches = searches.slice(0, 3);
      }
      setRecentSearches(searches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  };

  const handleRecentSearchSelect = (search) => {
    setFrom({
      address: search.from,
      coordinates: search.fromCoords
    });
    setTo({
      address: search.to,
      coordinates: search.toCoords
    });
    if (search.fromCoords) setFromCoords(search.fromCoords);
    if (search.toCoords) setToCoords(search.toCoords);
  };

  const formatTime = (time) => {
    if (!time) {
      console.error('Time is undefined or null');
      return '00:00:00';  
    }
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  };

  const handleOfferRide = async () => {
    if (!from.address || !to.address || !selectedTime || !selectedVehicle) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isRecurring && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one weekday for recurring rides');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedStartTime = format(parse(selectedTime, 'HH:mm', new Date()), 'HH:mm:ss');

      const rideData = {
        source: from.address,
        sourceLatitude: from.coordinates.lat,
        sourceLongitude: from.coordinates.lng,
        destination: to.address,
        destinationLatitude: to.coordinates.lat,
        destinationLongitude: to.coordinates.lng,
        rideDate: new Date().toISOString().split('T')[0],
        rideScheduledStartTime: formattedStartTime,
        rideScheduledEndTime: calculateEndTime(formattedStartTime),
        driverDetails: {
          id: driverId,
        },
        vehicleDto: {
          id: selectedVehicle.id,
        },
        isRecurring: isRecurring,
        recurringDays: selectedDays,
        seats: seats,
      };

      const response = await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/add', rideData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await saveRecentSearches();

      if (response.status === 200) {
        navigation.navigate('RideHistory', { initialTab: 1 });
      } else {
        Alert.alert('Error', 'Failed to offer ride. Please try again.');
      }
    } catch (error) {
      console.error('Error offering ride:', error);
      Alert.alert('Error', 'Failed to offer ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndTime = (startTime) => {
    const [hours, minutes] = startTime.split(':');
    let endHours = parseInt(hours, 10) + 1;
    if (endHours >= 24) endHours -= 24;
    return `${endHours.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    onClose();
  };

  const fetchRoutes = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('User authentication failed. Please log in again.');
      }

      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saved-routes/getByPassenger?passengerId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (Array.isArray(response.data)) {
        setRoutes(response.data);
      } else {
        console.error('Unexpected data format:', response.data);
        throw new Error('Received invalid data format from server.');
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      setRoutes([]);
    }
  };

  const RouteItem = ({ route, onPress }) => (
    <TouchableOpacity onPress={onPress}>
      <Box
        bg="white"
        borderRadius="md"
        shadow={1}
        p={4}
        mr={3}
        alignItems="center"
        justifyContent="center"
        width={250}
      >
        <HStack space={3} alignItems="center" flex={1}>
          <Icon as={Ionicons} name="location-outline" size="sm" color="gray.500" />
          <VStack flex={1}>
            <Text fontSize="md" fontWeight="bold" numberOfLines={1} ellipsizeMode="tail">
              {route.source.split(',')[0]} → {route.destination.split(',')[0]}
            </Text>
            <Text fontSize="xs" color="gray.500" numberOfLines={1} ellipsizeMode="tail">
              {route.source} → {route.destination}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </TouchableOpacity>
  );

  const handleRouteSelect = (route) => {
    setFrom({
      address: route.source,
      coordinates: { lat: route.startLatitude, lng: route.startLongitude }
    });
    setTo({
      address: route.destination,
      coordinates: { lat: route.endLatitude, lng: route.endLongitude }
    });
    setFromCoords({ lat: route.startLatitude, lng: route.startLongitude });
    setToCoords({ lat: route.endLatitude, lng: route.endLongitude });
  };

  // Function to toggle selected weekdays
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(selectedDay => selectedDay !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Platform.OS === 'ios' ? 90 : 70 }  
      ]}
    >
      <Box>
        <Heading style={styles.heading}>Offer a Ride</Heading>
        <VStack space={4}>
          {/* From Location */}
          <TouchableOpacity onPress={() => navigation.navigate('SelectLocation', { 
            isPickup: true, 
            onSelect: (locationData) => {
              setFrom(locationData);
              setFromCoords(locationData.coordinates);
            }
          })}>
            <CustomInput
              label="From"
              value={from.address}
              placeholder="Enter starting location"
              icon="location-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* To Location */}
          <TouchableOpacity onPress={() => navigation.navigate('SelectLocation', { 
            isPickup: false, 
            onSelect: (locationData) => {
              setTo(locationData);
              setToCoords(locationData.coordinates);
            }
          })}>
            <CustomInput
              label="To"
              value={to.address}
              placeholder="Enter destination"
              icon="location-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* Time and Seats */}
          <HStack space={4} alignItems="center">
            {/* Time Picker */}
            <Box flex={1}>
              <TouchableOpacity onPress={() => setIsTimePickerOpen(true)}>
                <CustomInput
                  label="Time"
                  value={selectedTime ? format(parse(selectedTime, 'HH:mm', new Date()), 'hh:mm a') : ''}
                  placeholder="Select time"
                  icon="time-outline"
                  editable={false}
                />
              </TouchableOpacity>
            </Box>

            {/* Seats Selector */}
            <Box flex={1}>
              <CustomInput
                label="Seats"
                value={seats.toString()}
                placeholder="Select seats"
                icon="people-outline"
                editable={false}
                InputRightElement={
                  <HStack space={2} mr={2}>
                    <TouchableOpacity onPress={() => setSeats(prev => Math.max(1, prev - 1))}>
                      <Icon as={Ionicons} name="remove-circle-outline" size="sm" color="coolGray.400" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSeats(prev => Math.min(4, prev + 1))}>
                      <Icon as={Ionicons} name="add-circle-outline" size="sm" color="coolGray.400" />
                    </TouchableOpacity>
                  </HStack>
                }
              />
            </Box>
          </HStack>

          {/* Vehicle Selection */}
          <TouchableOpacity onPress={onOpen}>
            <CustomInput
              label="Vehicle"
              value={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Select vehicle'}
              placeholder="Select vehicle"
              icon="car-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* Recurring Ride Toggle */}
          {/* <HStack alignItems="center" space={2} mt={4}>
            <Text fontSize="md">Recurring Ride</Text>
            <Switch 
              isChecked={isRecurring}
              onToggle={() => setIsRecurring(!isRecurring)}
              offTrackColor="gray.200"
              onTrackColor="blue.500"
            />
          </HStack> */}

          {/* Weekdays Selection */}
          {isRecurring && (
            <HStack space={2} mt={2} flexWrap="wrap">
              {weekdays.map((day, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={selectedDays.includes(day) ? "solid" : "outline"}
                  colorScheme={selectedDays.includes(day) ? "blue" : "gray"}
                  onPress={() => toggleDay(day)}
                  borderRadius="full"
                  px={3}
                  py={1}
                  mb={2}
                >
                  {day}
                </Button>
              ))}
            </HStack>
          )}

          {/* Offer Ride Button */}
          <CustomButton
            title="Offer Ride"
            onPress={handleOfferRide}
            isLoading={loading}
          />
        </VStack>
      </Box>

      {/* Promotions Section */}
      <Box mt={6}>
        <Text fontWeight="bold" fontSize="lg" color="black" mb={2}>Promotions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {carouselItems.map((item, index) => (
            <CarouselItem key={index} item={item} />
          ))}
        </ScrollView>
      </Box>

      {/* Recent Searches Carousel */}
      {recentSearches.length > 0 && (
        <Box mt={6}>
          <Text fontWeight="bold" fontSize="lg" color="black" mb={2}>Recent Searches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((search, index) => (
              <RecentSearchItem
                key={index}
                search={search}
                onPress={() => handleRecentSearchSelect(search)}
              />
            ))}
          </ScrollView>
        </Box>
      )}

      {/* Saved Routes Carousel */}
      {Array.isArray(routes) && routes.length > 0 && (
        <Box mt={6}>
          <Text fontWeight="bold" fontSize="lg" color="black" mb={2}>Saved Routes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {routes.map((routeItem, index) => (
              <RouteItem
                key={index}
                route={routeItem}
                onPress={() => handleRouteSelect(routeItem)}
              />
            ))}
          </ScrollView>
        </Box>
      )}

      {/* Vehicle Selection Actionsheet */}
      <Actionsheet isOpen={isOpen} onClose={onClose}>
        <Actionsheet.Content>
          <Box w="100%" h={60} px={4} justifyContent="center">
            <Text fontSize="16" color="gray.500">
              Select a Vehicle
            </Text>
          </Box>
          {vehicles.map((vehicle) => (
            <Actionsheet.Item
              key={vehicle.id}
              startIcon={<Icon as={MaterialIcons} size="6" name="directions-car" />}
              onPress={() => handleVehicleSelect(vehicle)}
            >
              {`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
              {vehicle.isDefault && (
                <Text fontSize="xs" color="gray.500"> (Default)</Text>
              )}
            </Actionsheet.Item>
          ))}
        </Actionsheet.Content>
      </Actionsheet>

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onSelect={(time) => {
          setSelectedTime(time);
          setIsTimePickerOpen(false);
        }}
        initialTime={selectedTime}
        is24Hour={true}
      />
    </ScrollView>
  );
};

export default OfferRideScreen;
