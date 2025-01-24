import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import {
  Box,
  Heading,
  VStack,
  Text,
  HStack,
  Icon,
  Switch,
  Button,
  Modal,
  useTheme
} from 'native-base';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { styles } from '../components/sharedComponents';
import { format, parse } from 'date-fns';
import Calendar from 'react-native-calendar-picker';

// Import your custom components properly
import { 
  CustomInput, 
  CustomButton, 
  CarouselItem, 
  //RecentSearchItem 
} from '../components/sharedComponents';
import TimePickerModal from './TimePickerModal';

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

const RouteItem = ({ route, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      bg="white"
      borderRadius="md"
      shadow={1}
      p={4}
      mr={3} // Right margin for horizontal spacing
      alignItems="center"
      justifyContent="center"
      width={250} // Fixed width for carousel
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

const RecentSearchItem = ({ search, onPress }) => (
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
          {`${search.source} → ${search.destination}`}
          </Text>
          <Text fontSize="xs" color="gray.500" numberOfLines={1} ellipsizeMode="tail">
            {new Date(search.searchTimestamp).toLocaleDateString()}
          </Text>
          <Text fontSize="xs" color="gray.500" numberOfLines={1} ellipsizeMode="tail">
            {`${search.latitude}, ${search.longitude}`}
          </Text>
        </VStack>
      </HStack>
    </Box>
  </TouchableOpacity>
);

const saveSearchHistory = async (searchParams) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const passengerId = await AsyncStorage.getItem('passengerId');

    // Create the request URL with query parameters
    const baseUrl = 'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/searchHistory/add';
    const queryParams = new URLSearchParams({
      passengerId: Number(passengerId),
      latitude: searchParams.pickupLocation.latitude,
      longitude: searchParams.pickupLocation.longitude,
      source: searchParams.pickupLocation.address,
      destination: searchParams.dropLocation.address,
      minRadiusKm: '0.0',
      maxRadiusKm: '10.0',
      searchType: 'searchRidesWithinRadius'
    });

    const url = `${baseUrl}?${queryParams.toString()}`;

    const response = await axios({
      method: 'post',
      url: url,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Disable redirect following
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    });

    console.log('Search history saved successfully:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error saving search history:', error.message);
    }
  }
};

const SearchRideScreen = () => {
  const [pickupLocation, setPickupLocation] = useState({ address: '', coordinates: null });
  const [dropLocation, setDropLocation] = useState({ address: '', coordinates: null });
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [routes, setRoutes] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();

  // Recurring Ride States
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Add these state variables
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasSearchHistory, setHasSearchHistory] = useState(false);

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        await loadRecentSearches();
        await fetchRoutes();
      } catch (error) {
        console.error('Error initializing screen:', error);
      }
    };

    initializeScreen();
  }, []);

  useEffect(() => {
    if (route.params && route.params.address) {
      if (route.params.isPickup) {
        setPickupLocation(route.params.address);
        setPickupCoords(null);
      } else {
        setDropLocation(route.params.address);
        setDropCoords(null);
      }
    }
  }, [route.params]);

  const loadRecentSearches = async () => {
    try {
      const passengerId = await AsyncStorage.getItem('passengerId');
      if (!passengerId) {
        setHasSearchHistory(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/searchHistory/recent?passengerId=${passengerId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data && Array.isArray(response.data)) {
          const validSearches = response.data.filter(search => 
            search.source !== null && search.destination !== null
          );
          setRecentSearches(validSearches);
          setHasSearchHistory(validSearches.length > 0);
        }
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setHasSearchHistory(false);
    }
  };

  const saveRecentSearches = async () => {
    if (!pickupLocation.address || !dropLocation.address) return;

    const searchEntry = {
      from: pickupLocation.address,
      to: dropLocation.address,
      time: new Date().toLocaleString(),
      isRecurring: isRecurring,
      recurringDays: selectedDays,
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

  const handleSearch = async () => {
    if (!pickupLocation.address || !dropLocation.address || 
        !pickupLocation.coordinates || !dropLocation.coordinates) {
        Alert.alert('Error', 'Please select both pickup and drop-off locations.');
        return;
    }

    setLoading(true);
    try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const formattedTime = `${selectedTime}:00`;
        const formattedDateTime = `${formattedDate}T${formattedTime}`;

        // Save search history first
        const searchHistoryParams = {
            pickupLocation: {
                latitude: pickupLocation.coordinates.lat,
                longitude: pickupLocation.coordinates.lng,
                address: pickupLocation.address
            },
            dropLocation: {
                address: dropLocation.address
            },
            searchRadius: 10
        };

        // Only save search history once with complete data
        await saveSearchHistory(searchHistoryParams);

        await storeLocationDetails({
            startLocation: pickupLocation.address,
            startLatitude: pickupLocation.coordinates.lat,
            startLongitude: pickupLocation.coordinates.lng,
            endLocation: dropLocation.address,
            endLatitude: dropLocation.coordinates.lat,
            endLongitude: dropLocation.coordinates.lng,
            rideDate: formattedDate,
            rideTime: formattedTime
        });

        // Save recent searches
        await saveRecentSearches();

        navigation.navigate('RideList', {
            pickupLocation: pickupLocation.address,
            dropLocation: dropLocation.address,
            pickupCoords: {
                lat: Number(pickupLocation.coordinates.lat),
                lng: Number(pickupLocation.coordinates.lng)
            },
            dropCoords: {
                lat: Number(dropLocation.coordinates.lat),
                lng: Number(dropLocation.coordinates.lng)
            },
            rideDate: formattedDate,
            rideTime: formattedTime,
            rideDateTime: formattedDateTime,
            isRecurring: isRecurring,
            recurringDays: selectedDays,
        });
    } catch (error) {
        console.error('Error during search:', error);
        Alert.alert('Error', 'Failed to process search. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const storeLocationDetails = async (details) => {
    try {
      await AsyncStorage.setItem('locationDetails', JSON.stringify(details));
      console.log('Location details stored successfully');
    } catch (error) {
      console.error('Error storing location details:', error);
    }
  };

  const handleRecentSearchSelect = (search) => {
    setPickupLocation({
      address: search.searchLocation || '',
      coordinates: {
        lat: search.latitude,
        lng: search.longitude
      }
    });
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

  const handleRouteSelect = (route) => {
    setPickupLocation({
      address: route.source,
      coordinates: { lat: route.startLatitude, lng: route.startLongitude }
    });
    setDropLocation({
      address: route.destination,
      coordinates: { lat: route.endLatitude, lng: route.endLongitude }
    });
    setIsRecurring(false);
    setSelectedDays([]);
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
        styles.scrollContainer,
        { paddingBottom: Platform.OS === 'ios' ? 90 : 70 }  
      ]}
    >
      <Box>
        <Heading style={styles.heading}>Search a Ride</Heading>
        <VStack space={4}>
          {/* Pickup Location */}
          <TouchableOpacity onPress={() => navigation.navigate('SelectLocation', {
            isPickup: true,
            onSelect: (locationData) => {
              setPickupLocation(locationData);
              setPickupCoords(null);
            }
          })}>
            <CustomInput
              label="Pickup Location"
              value={pickupLocation.address}
              placeholder="Select pickup location"
              icon="location-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* Drop Location */}
          <TouchableOpacity onPress={() => navigation.navigate('SelectLocation', {
            isPickup: false,
            onSelect: (locationData) => {
              setDropLocation(locationData);
              setDropCoords(null);
            }
          })}>
            <CustomInput
              label="Drop Location"
              value={dropLocation.address}
              placeholder="Select drop location"
              icon="location-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* Date Selection */}
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <CustomInput
              label="Date"
              value={format(selectedDate, 'dd MMM yyyy')}
              placeholder="Select date"
              icon="calendar-outline"
              editable={false}
            />
          </TouchableOpacity>

          {/* Time Selection */}
          <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <CustomInput
              label="Time"
              value={format(parse(selectedTime, 'HH:mm', new Date()), 'hh:mm a')}
              placeholder="Select time"
              icon="time-outline"
              editable={false}
            />
          </TouchableOpacity>

          

          {/* Search Ride Button */}
          <CustomButton
            title="Search Ride"
            onPress={handleSearch}
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

      {/* Recent Searches Carousel - Only show if user has search history */}
      {hasSearchHistory && recentSearches.length > 0 && (
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

      {/* Date Picker Modal */}
      <Modal isOpen={showDatePicker} onClose={() => setShowDatePicker(false)}>
        <Modal.Content>
          <Modal.Header>Select Date</Modal.Header>
          <Modal.Body>
            <Calendar
              onDateChange={(date) => {
                setSelectedDate(new Date(date));
                setShowDatePicker(false);
              }}
              minDate={format(new Date(), 'yyyy-MM-dd')}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={(time) => {
          setSelectedTime(time);
          setShowTimePicker(false);
        }}
        initialTime={selectedTime}
        is24Hour={true}
      />
    </ScrollView>
  );
};

export default SearchRideScreen;