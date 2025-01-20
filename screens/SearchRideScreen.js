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
  Button 
} from 'native-base';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { styles, CustomInput, CustomButton, CarouselItem, RecentSearchItem } from '../components/sharedComponents';

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
    if (route.params?.address) {
      const locationData = route.params.address;
      if (route.params.isPickup) {
        setPickupLocation(locationData);
        setPickupCoords(locationData.coordinates);
      } else {
        setDropLocation(locationData);
        setDropCoords(locationData.coordinates);
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
    if (!pickupLocation.address || !dropLocation.address) {
      Alert.alert('Error', 'Please select both pickup and drop-off locations.');
      return;
    }

    if (isRecurring && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one weekday for recurring searches');
      return;
    }

    setLoading(true);
    try {
      // Store the details in local storage
      await storeLocationDetails({
        startLocation: pickupLocation.address,
        startLatitude: pickupLocation.coordinates.lat,
        startLongitude: pickupLocation.coordinates.lng,
        endLocation: dropLocation.address,
        endLatitude: dropLocation.coordinates.lat,
        endLongitude: dropLocation.coordinates.lng,
      });

      await saveRecentSearches();

      // Pass recurring information if needed in future API calls
      navigation.navigate('RideList', { 
        pickupLocation: pickupLocation.address,
        dropLocation: dropLocation.address,
        pickupCoords: pickupLocation.coordinates,
        dropCoords: dropLocation.coordinates,
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
      address: search.from,
      coordinates: null
    });
    setDropLocation({
      address: search.to,
      coordinates: null
    });
    setIsRecurring(search.isRecurring);
    setSelectedDays(search.recurringDays || []);
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
              setPickupCoords(locationData.coordinates);
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
              setDropCoords(locationData.coordinates);
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

          {/* Recurring Ride Toggle */}
          {/* <HStack alignItems="center" space={2} mt={4}>
            <Text fontSize="md">Recurring Search</Text>
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
    </ScrollView>
  );
};

export default SearchRideScreen;
