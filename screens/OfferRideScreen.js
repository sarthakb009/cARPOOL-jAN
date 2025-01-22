import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, TouchableOpacity, Platform, Pressable } from 'react-native';
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
  FlatList,
  Modal,
  Select,
  useToast
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, CustomInput, CustomButton, CarouselItem, RecentSearchItem } from '../components/sharedComponents';
import TimePickerModal from './TimePickerModal';
import { format, parse, addMinutes } from 'date-fns';
import Calendar from 'react-native-calendar-picker';

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
  const toast = useToast();
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
  const [seats, setSeats] = useState(0);
  const [routes, setRoutes] = useState([]);

  // Recurring Ride States
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Add these with your existing state variables
  const [rideType, setRideType] = useState('normal'); // 'normal', 'scheduled', 'recurring'
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [frequency, setFrequency] = useState('WEEKLY');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState('start'); // 'start' or 'end'

  // Add these to your existing state variables if not already present
  const [userDetails, setUserDetails] = useState(null);

  const [tempDate, setTempDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

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
          setSelectedVehicle(null);
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

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(
          'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/user-details',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setUserDetails(response.data);
        console.log('User Details:', response.data);
      } catch (error) {
        console.error('Error fetching user details:', error);
        Alert.alert('Error', 'Failed to fetch user details');
      }
    };

    fetchUserDetails();
  }, []);

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
    if (!from?.address || !to?.address || !selectedTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedVehicle) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    if (seats === 0) {
      Alert.alert('Error', 'Please select number of seats');
      return;
    }

    if (seats > selectedVehicle.vehicleCapacity) {
      Alert.alert('Error', 'Selected seats cannot exceed vehicle capacity');
      return;
    }

    if (!userDetails?.driverId || !selectedVehicle?.id) {
      Alert.alert('Error', 'Driver or vehicle information is missing');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let endpoint;
      let rideData;

      switch(rideType) {
        case 'normal':
          // Calculate end time (30 minutes after start time)
          const startDateTime = parse(selectedTime, 'HH:mm', new Date());
          const endDateTime = addMinutes(startDateTime, 30);
          const rideDate = format(new Date(), 'yyyy-MM-dd');
          
          // Format times
          const formattedStartTime = format(startDateTime, 'HH:mm:ss');
          const formattedEndTime = format(endDateTime, 'HH:mm:ss');
          
          // Full datetime strings for start and end
          const fullStartDateTime = `${rideDate}T${formattedStartTime}`;
          const fullEndDateTime = `${rideDate}T${formattedEndTime}`;

          endpoint = 'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/add';
          rideData = {
            source: from.address,
            sourceLatitude: Number(from.coordinates.lat),
            sourceLongitude: Number(from.coordinates.lng),
            destination: to.address,
            destinationLatitude: Number(to.coordinates.lat),
            destinationLongitude: Number(to.coordinates.lng),
            rideDate: rideDate,
            rideScheduledStartTime: formattedStartTime,
            rideScheduledEndTime: formattedEndTime,
            status: "Scheduled",
            checkinStatus: false,
            checkoutStatus: false,
            durationInMinutes: 30,
            rideStartTime: fullStartDateTime,
            rideEndTime: fullEndDateTime,
            price: 100.0, // You might want to calculate this based on distance
            distance: 10.0, // You might want to calculate this using coordinates
            driverDetails: {
              id: userDetails?.driverId
            },
            vehicleDto: {
              id: selectedVehicle.id
            }
          };
          break;

        case 'scheduled':
          if (!scheduledDate || !selectedTime) {
            Alert.alert('Error', 'Please select both date and time for scheduled ride');
            return;
          }
          endpoint = 'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides';
          rideData = {
            passengerId: userDetails?.customerId,
            driverId: null,
            date: format(scheduledDate, 'yyyy-MM-dd'),
            source: from.address,
            destination: to.address,
            scheduledTime: format(parse(selectedTime, 'HH:mm', new Date()), 'HH:mm'),
            status: "Scheduled"
          };

          console.log('Scheduled Ride Payload:', JSON.stringify(rideData, null, 2));
          break;

        case 'recurring':
          if (!selectedDays.length) {
            Alert.alert('Error', 'Please select at least one recurring day');
            return;
          }

          if (!startDate || !endDate || !selectedTime) {
            Alert.alert('Error', 'Please select start date, end date, and time');
            return;
          }

          endpoint = 'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/add';
          
          // Format the time to match required format (HH:mm:ss)
          const formattedTime = selectedTime.length === 5 
            ? `${selectedTime}:00` 
            : selectedTime;

          rideData = {
            rideId: null,
            driverId: userDetails?.driverId,
            frequency: frequency,
            recurringDays: selectedDays,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            timeOfDay: formattedTime,
            source: from.address,
            destination: to.address,
            status: "ACTIVE"
          };

          console.log('Recurring Ride Payload:', JSON.stringify(rideData, null, 2));
          break;
      }

      console.log('Making API call to:', endpoint);
      console.log('With data:', JSON.stringify(rideData, null, 2));

      const response = await axios.post(endpoint, rideData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Ride creation response:', response.data);

      // Handle the case where response.data is just the ID number
      const createdRideId = typeof response.data === 'number' 
        ? response.data 
        : response.data.id || response.data.rideId;

      if (!createdRideId) {
        throw new Error('No ride ID returned from server');
      }

      // Store the created ride ID
      await AsyncStorage.setItem('lastCreatedRideId', createdRideId.toString());

      if (response.data) {
        toast.show({
          title: 'Success',
          description: 'Ride offered successfully!',
          status: 'success',
          placement: 'top',
        });

        // Different navigation based on ride type
        switch(rideType) {
          case 'normal':
            // Navigate to RideDetails for normal rides
            navigation.replace('RideDetails', {
              rideId: createdRideId,
              isDriver: true,
              rideType: rideType,
              initialFetch: true
            });
            break;

          case 'recurring':
            // Navigate to RideHistory with Recurring Rides tab
            navigation.replace('RideHistory', {
              initialTab: 2 // Index for Recurring Rides tab
            });
            break;

          case 'scheduled':
            // Navigate to RideHistory with Scheduled Rides tab
            navigation.replace('RideHistory', {
              initialTab: 3 // Index for Scheduled Rides tab
            });
            break;
        }
      }

    } catch (error) {
      console.error('Error offering ride:', error);
      
      let errorMessage = 'Failed to offer ride. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.show({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        placement: 'top',
      });
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
    // Only adjust seats if they're 0 or exceed vehicle capacity
    const currentSeats = seats || 0;
    if (currentSeats === 0) {
      setSeats(vehicle.vehicleCapacity);
    } else if (currentSeats > vehicle.vehicleCapacity) {
      setSeats(vehicle.vehicleCapacity);
    }
    onClose();
  };

  const incrementSeats = () => {
    if (selectedVehicle) {
      setSeats(prev => Math.min(selectedVehicle.vehicleCapacity, (prev || 0) + 1));
    } else {
      setSeats(prev => (prev || 0) + 1);
    }
  };

  const decrementSeats = () => {
    setSeats(prev => Math.max(0, (prev || 0) - 1));
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
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleDateSelect = (day) => {
    const selectedDate = new Date(day.timestamp);
    if (datePickerType === 'start') {
      setStartDate(selectedDate);
    } else {
      setEndDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setIsTimePickerOpen(false);
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
                value={String(seats || 0)}
                placeholder="Select seats"
                icon="people-outline"
                editable={false}
                InputRightElement={
                  <HStack space={2} mr={2}>
                    <TouchableOpacity onPress={decrementSeats}>
                      <Icon as={Ionicons} name="remove-circle-outline" size="sm" color="coolGray.400" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={incrementSeats}>
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

          {/* Ride Type Selection */}
          <Box mb={6}>
            <Text fontSize="lg" fontWeight="bold" mb={3} color="gray.700">
              Ride Type
            </Text>
            <HStack space={3} mb={4}>
              {[
                { id: 'normal', label: 'One-time', icon: 'car-outline', description: 'Single trip' },
                { id: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', description: 'Future date' },
                { id: 'recurring', label: 'Recurring', icon: 'repeat-outline', description: 'Regular trips' }
              ].map((type) => (
                <Pressable
                  key={type.id}
                  flex={1}
                  onPress={() => setRideType(type.id)}
                >
                  <Box
                    bg={rideType === type.id ? 'black' : 'white'}
                    borderWidth={1}
                    borderColor={rideType === type.id ? "black" : "gray.200"}
                    borderRadius={16}
                    py={4}
                    px={2}
                    shadow={rideType === type.id ? 4 : 1}
                    style={{
                      transform: [{ scale: rideType === type.id ? 1.02 : 1 }]
                    }}
                  >
                    <VStack alignItems="center" space={2}>
                      <Box
                        bg={rideType === type.id ? "white" : "gray.100"}
                        p={2}
                        borderRadius="full"
                      >
                        <Icon
                          as={Ionicons}
                          name={type.icon}
                          size="md"
                          color={rideType === type.id ? "black" : "gray.500"}
                        />
                      </Box>
                      <Text
                        fontSize="sm"
                        color={rideType === type.id ? "white" : "gray.700"}
                        fontWeight="bold"
                      >
                        {type.label}
                      </Text>
                      <Text
                        fontSize="xs"
                        color={rideType === type.id ? "gray.300" : "gray.500"}
                        textAlign="center"
                      >
                        {type.description}
                      </Text>
                    </VStack>
                  </Box>
                </Pressable>
              ))}
            </HStack>

            {/* Scheduled Ride Options */}
            {rideType === 'scheduled' && (
              <Box  p={4} rounded="lg" shadow="sm" borderWidth={1} borderColor="gray.100">
                <VStack space={4}>
                  <HStack space={3}>
                    <Box flex={1}>
                      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <CustomInput
                          label="Date"
                          value={format(scheduledDate, 'EEE, dd MMM yyyy')}
                          placeholder="Select date"
                          icon="calendar-outline"
                          editable={false}
                        />
                      </TouchableOpacity>
                    </Box>
                    <Box flex={1}>
                      <TouchableOpacity onPress={() => setIsTimePickerOpen(true)}>
                        <CustomInput
                          label="Time"
                          value={format(parse(selectedTime, 'HH:mm', new Date()), 'hh:mm a')}
                          placeholder="Select time"
                          icon="time-outline"
                          editable={false}
                        />
                      </TouchableOpacity>
                    </Box>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Recurring Ride Options */}
            {rideType === 'recurring' && (
              <Box p={4} rounded="lg" shadow="sm" borderWidth={1} borderColor="gray.100">
                <VStack space={4}>
                  {/* Date Range */}
                  <HStack space={3}>
                    <Box flex={1}>
                      <TouchableOpacity onPress={() => {
                        setDatePickerType('start');
                        setShowDatePicker(true);
                      }}>
                        <CustomInput
                          label="Start Date"
                          value={format(startDate, 'dd MMM yyyy')}
                          placeholder="Start"
                          icon="calendar-outline"
                          editable={false}
                        />
                      </TouchableOpacity>
                    </Box>
                    <Box flex={1}>
                      <TouchableOpacity onPress={() => {
                        setDatePickerType('end');
                        setShowDatePicker(true);
                      }}>
                        <CustomInput
                          label="End Date"
                          value={format(endDate, 'dd MMM yyyy')}
                          placeholder="End"
                          icon="calendar-outline"
                          editable={false}
                        />
                      </TouchableOpacity>
                    </Box>
                  </HStack>

                  {/* Time Selection */}
                  <TouchableOpacity onPress={() => setIsTimePickerOpen(true)}>
                    <CustomInput
                      label="Daily Time"
                      value={format(parse(selectedTime, 'HH:mm', new Date()), 'hh:mm a')}
                      placeholder="Select time"
                      icon="time-outline"
                      editable={false}
                    />
                  </TouchableOpacity>

                  {/* Days Selection */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                      Repeat on
                    </Text>
                    <HStack flexWrap="wrap" space={2}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                        <Pressable
                          key={day}
                          onPress={() => toggleDay(weekdays[index])}
                          bg={selectedDays.includes(weekdays[index]) ? "black" : "white"}
                        
                          borderWidth={1}
                          borderColor="black"
                          borderRadius={11}
                          w="40px"
                          h="40px"
                          alignItems="center"
                          justifyContent="center"
                          mb={2}
                        >
                          <Text 
                            color={selectedDays.includes(weekdays[index]) ? "white" : "black"}
                            variant={selectedDays.includes(weekdays[index]) ? "solid" : "outline"}
                            bg={selectedDays.includes(weekdays[index]) ? "black" : "white"}
                            borderRadius={10}
                            px={3}
                            py={1}

                            fontSize="sm"
                            fontWeight="medium"
                          >
                            {day}
                          </Text>
                        </Pressable>
                      ))}
                    </HStack>
                  </Box>

                  {/* Frequency - Optional, if needed */}
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1}>
                      Repeat
                    </Text>
                    <Select
                      selectedValue={frequency}
                      onValueChange={value => setFrequency(value)}
                      bg="gray.50"
                      borderColor="gray.200"
                      _selectedItem={{
                        bg: "gray.100",
                        endIcon: <Icon as={Ionicons} name="checkmark" size="sm" color="black" />
                      }}
                      rounded="full"
                    >
                      <Select.Item label="Weekly" value="WEEKLY" />
                    </Select>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>

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
        onSelect={handleTimeSelect}
        initialTime={selectedTime}
        is24Hour={true}
      />

      {/* Date Picker Modal */}
      <Modal isOpen={showDatePicker} onClose={() => setShowDatePicker(false)}>
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>
            <Text fontSize="lg" fontWeight="bold">
              {rideType === 'scheduled' ? 'Select Date' : 
               `Select ${datePickerType === 'start' ? 'Start' : 'End'} Date`}
            </Text>
          </Modal.Header>
          <Modal.Body>
            <Calendar
              onDateChange={(date) => {
                const selectedDate = new Date(date);
                // Store temporary selection
                if (rideType === 'scheduled') {
                  setTempDate(selectedDate);
                } else {
                  if (datePickerType === 'start') {
                    setTempStartDate(selectedDate);
                  } else {
                    setTempEndDate(selectedDate);
                  }
                }
              }}
              markedDates={{
                [format(
                  rideType === 'scheduled' ? (tempDate || scheduledDate) :
                  datePickerType === 'start' ? (tempStartDate || startDate) : (tempEndDate || endDate),
                  'yyyy-MM-dd'
                )]: {
                  selected: true,
                  selectedColor: 'black'
                }
              }}
              minDate={
                datePickerType === 'end' && rideType === 'recurring'
                  ? format(startDate, 'yyyy-MM-dd')
                  : format(new Date(), 'yyyy-MM-dd')
              }
              theme={{
                selectedDayBackgroundColor: 'black',
                todayTextColor: 'black',
                arrowColor: 'black',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500'
              }}
            />
            <HStack justifyContent="flex-end" mt={4} space={2}>
              <Button
                variant="ghost"
                onPress={() => {
                  setTempDate(null);
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setShowDatePicker(false);
                }}
              >
                Cancel
              </Button>
              <Button
                bg="black"
                onPress={() => {
                  if (rideType === 'scheduled' && tempDate) {
                    setScheduledDate(tempDate);
                  } else {
                    if (datePickerType === 'start' && tempStartDate) {
                      setStartDate(tempStartDate);
                    } else if (datePickerType === 'end' && tempEndDate) {
                      setEndDate(tempEndDate);
                    }
                  }
                  setTempDate(null);
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setShowDatePicker(false);
                }}
              >
                Confirm
              </Button>
            </HStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </ScrollView>
  );
};

export default OfferRideScreen;