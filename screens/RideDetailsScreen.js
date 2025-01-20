import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  Icon,
  Button,
  useTheme,
  Pressable,
  Progress,
  useToast,
  Badge,
} from 'native-base';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import EventSource from 'react-native-event-source';
import * as Location from 'expo-location';
import MapScreen from './MapScreen';

const { width } = Dimensions.get('window');

const RideStates = {
  NOT_JOINED: 'NOT_JOINED',
  JOINING: 'JOINING',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const RideDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId } = route.params;

  // State variables
  const [rideState, setRideState] = useState(RideStates.NOT_JOINED);
  const [otp, setOtp] = useState('');
  const [rideDetails, setRideDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joiningRide, setJoiningRide] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [currentPassengerId, setCurrentPassengerId] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [previousDriverLocation, setPreviousDriverLocation] = useState(null);
  const [acceptedPassengers, setAcceptedPassengers] = useState([]);
  const [formattedPassengerPickup, setFormattedPassengerPickup] = useState(null);
  const [formattedPassengerDrop, setFormattedPassengerDrop] = useState(null);
  const [routeDetails, setRouteDetails] = useState({ distance: null, duration: null });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [formattedDriverLocation, setFormattedDriverLocation] = useState(null);

  const theme = useTheme();
  const toast = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Refs to manage rideState and isFetching without causing re-renders
  const rideStateRef = useRef(rideState);
  const isFetchingRef = useRef(false);

  // Update rideStateRef whenever rideState changes
  useEffect(() => {
    rideStateRef.current = rideState;
  }, [rideState]);

  // API Key (Note: For security, consider moving this to environment variables or backend)
  const HERE_API_KEY = 'BLiCQHHuN3GFygSHe27hv4rRBpbto7K35v7HXYtANC8';

  // Ref to manage EventSource
  const eventSourceRef = useRef(null);

  // Optimized fetchRideDetails with useCallback (removed rideState and isFetching from dependencies)
  const fetchRideDetails = useCallback(async () => {
    // Prevent overlapping requests using ref
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');
      setCurrentPassengerId(passengerId);

      const rideResponse = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${rideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (rideResponse.data) {
        setRideDetails(rideResponse.data);
        const passengerData = rideResponse.data.passengers?.[0];

        // Check passenger status first
        if (passengerData) {
          const passengerStatus = passengerData.status.toUpperCase();
          const isCheckedIn = passengerData.checkinStatus;
          const isCheckedOut = passengerData.checkoutStatus;

          // Check for completed state first
          if (passengerStatus === 'COMPLETED' && isCheckedIn && isCheckedOut) {
            setRideState(RideStates.COMPLETED);
            return;
          }
          // Then check for in-progress and driver arriving states
          else if (passengerStatus === 'SCHEDULED' && !isCheckedIn) {
            setRideState(RideStates.DRIVER_ARRIVING);
            return;
          } else if (passengerStatus === 'ONGOING' && isCheckedIn) {
            setRideState(RideStates.IN_PROGRESS);
            return;
          }
        }

        // Normalize status to match RideStates keys
        const normalizedStatus = rideResponse.data.status.toUpperCase().replace(' ', '_');

        // Handle high-priority statuses first
        switch (normalizedStatus) {
          case 'COMPLETED':
            setRideState(RideStates.COMPLETED);
            return; // Exit early to prevent further processing
          case 'ONGOING':
            setRideState(RideStates.IN_PROGRESS);
            return;
          case 'DRIVER_ARRIVING':
            setRideState(RideStates.DRIVER_ARRIVING);
            return;
        }

        // If not in high-priority states, check request status
        try {
          const requestsResponse = await axios.get(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getRequestByRide?rideId=${rideId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log('Request Response:', requestsResponse.data); // Debug log

          const userRequest = requestsResponse.data.find(
            (request) => request.passengerId.toString() === passengerId
          );

          console.log('User Request:', userRequest); // Debug log

          if (userRequest) {
            // Use rideStateRef to get the latest rideState
            if (
              rideStateRef.current === RideStates.PENDING &&
              userRequest.status.toLowerCase() === 'pending'
            ) {
              return; // Keep existing PENDING state without changes
            }

            switch (userRequest.status.toLowerCase()) {
              case 'accepted':
                setRideState(RideStates.ACCEPTED);
                break;
              case 'rejected':
                setRideState(RideStates.REJECTED);
                break;
              case 'pending':
                setRideState(RideStates.PENDING);
                break;
              default:
                setRideState(RideStates.NOT_JOINED);
            }
          } else {
            // If no request found, set to NOT_JOINED unless already PENDING
            if (rideStateRef.current !== RideStates.PENDING) {
              setRideState(RideStates.NOT_JOINED);
            }
          }
        } catch (requestError) {
          if (requestError.response && requestError.response.status === 400) {
            console.log('No ride requests available');
            // Only set to NOT_JOINED if not already PENDING
            if (rideStateRef.current !== RideStates.PENDING) {
              setRideState(RideStates.NOT_JOINED);
            }
          } else {
            throw requestError;
          }
        }
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching ride details:', error);
      if (error.response && error.response.status !== 400) {
        setError('Failed to fetch ride details. Please try again.');
      } else {
        setError('Ride details not found.');
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [rideId]); // Only depends on rideId

  // Set up polling with useEffect
  useEffect(() => {
    // Initial fetch
    fetchRideDetails();

    // Set up interval to fetch ride details every 6 seconds
    const intervalId = setInterval(() => {
      fetchRideDetails();
    }, 6000); // 6000 milliseconds = 6 seconds

    // Cleanup function to clear the interval when component unmounts or when rideId changes
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchRideDetails]); // Only depends on fetchRideDetails (which only depends on rideId)

  // useEffect for animations and EventSource setup
  useEffect(() => {
    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // If ride is accepted or driver is arriving, set up EventSource and get user location
    if (
      rideState === RideStates.ACCEPTED ||
      rideState === RideStates.DRIVER_ARRIVING
    ) {
      getUserLocation();

      // Only create a new EventSource if one doesn't exist
      if (!eventSourceRef.current) {
        eventSourceRef.current = new EventSource(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/sse/location/stream/last-known/${rideId}`
        );

        eventSourceRef.current.addEventListener('LAST_KNOWN_LOCATION', (e) => {
          try {
            const data = JSON.parse(e.data);
            const newDriverLocation = {
              latitude: data.latitude,
              longitude: data.longitude,
            };

            // Check if driver location has actually changed
            const hasLocationChanged = !driverLocation ||
              (driverLocation.latitude !== newDriverLocation.latitude ||
                driverLocation.longitude !== newDriverLocation.longitude);

            // Only update driver location and calculate ETA if location has changed
            if (hasLocationChanged) {
              setDriverLocation(newDriverLocation);
              if (userLocation) {
                calculateETA(userLocation, newDriverLocation);
              }
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        });

        eventSourceRef.current.addEventListener('error', (e) => {
          console.error('SSE error:', e);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        });
      }

      // Cleanup function to close EventSource when rideState changes
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }
  }, [rideState, fadeAnim, driverLocation, userLocation, rideId]); // rideState triggers this effect

  // useEffect to calculate ETA when locations change
  useEffect(() => {
    if (userLocation && driverLocation) {
      // Check if driver location has actually changed
      const hasLocationChanged = !previousDriverLocation ||
        (previousDriverLocation.latitude !== driverLocation.latitude ||
          previousDriverLocation.longitude !== driverLocation.longitude);

      if (hasLocationChanged) {
        calculateETA(userLocation, driverLocation);
        setPreviousDriverLocation(driverLocation);
      }
    }
  }, [userLocation, driverLocation]);

  // Function to join ride
  const joinRide = async () => {
    setJoiningRide(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const locationDetailsString = await AsyncStorage.getItem('locationDetails');
      if (!locationDetailsString) {
        toast.show({
          title: 'Location Missing',
          description: 'Please select your pickup and drop-off locations before joining the ride.',
          status: 'warning',
          placement: 'top',
        });
        setJoiningRide(false);
        return;
      }

      const locationDetails = JSON.parse(locationDetailsString);
      const payload = {
        rideId: rideId,
        startLocation: locationDetails.startLocation,
        startLatitude: locationDetails.startLatitude,
        startLongitude: locationDetails.startLongitude,
        endLocation: locationDetails.endLocation,
        endLatitude: locationDetails.endLatitude,
        endLongitude: locationDetails.endLongitude,
      };

      const requiredFields = ['startLocation', 'startLatitude', 'startLongitude', 'endLocation', 'endLatitude', 'endLongitude'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      if (missingFields.length > 0) {
        console.error('Missing fields in payload:', missingFields);
        toast.show({
          title: 'Incomplete Location Data',
          description: `Missing fields: ${missingFields.join(', ')}`,
          status: 'error',
          placement: 'top',
        });
        setJoiningRide(false);
        return;
      }

      const response = await axios.post(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/request?passengerId=${currentPassengerId}&rideId=${rideId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Check if the request was successful
      if (response.data) {
        setRideState(RideStates.PENDING);
        // Force a refresh of ride details
        await fetchRideDetails();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: "Request Sent",
          status: "success",
          description: "Your request to join the ride has been sent.",
          placement: "top"
        });
      }
    } catch (error) {
      console.error('Error joining ride:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        title: "Failed to Join",
        status: "error",
        description: error.response?.data?.message || "There was an error sending your request. Please try again.",
        placement: "top",
      });
    } finally {
      setJoiningRide(false);
    }
  };

  // Function to cancel request
  const cancelRequest = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const response = await axios.post(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/cancelRequest?passengerId=${passengerId}&rideId=${rideId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setRideState(RideStates.NOT_JOINED);
        setRequestStatus(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: 'Request Cancelled',
          status: 'success',
          description: 'Your ride request has been cancelled.',
          placement: 'top',
        });
      } else {
        throw new Error('Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        title: 'Failed to Cancel Request',
        status: 'error',
        description: error.response?.data?.message || 'Please try again later.',
        placement: 'top',
      });
    }
  };

  // Function to start ride
  const startRide = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const response = await axios.post(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/start`,
        {
          rideId: rideId,
          passengerId: passengerId,
          otp: otp,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setRideState(RideStates.IN_PROGRESS);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: 'Ride Started',
          status: 'success',
          description: 'Your ride has started. Enjoy your journey!',
          placement: 'top',
        });
      } else {
        throw new Error('Failed to start ride');
      }
    } catch (error) {
      console.error('Error starting ride:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        title: 'Failed to Start Ride',
        status: 'error',
        description: error.response?.data?.message || 'Please check your OTP and try again.',
        placement: 'top',
      });
    }
  };

  // Function to end ride
  const endRide = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const response = await axios.post(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/end`,
        {
          rideId: rideId,
          passengerId: passengerId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setRideState(RideStates.COMPLETED);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: 'Ride Completed',
          status: 'success',
          description:
            'Your ride has been completed. Thank you for traveling with us!',
          placement: 'top',
        });
      } else {
        throw new Error('Failed to end ride');
      }
    } catch (error) {
      console.error('Error ending ride:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        title: 'Failed to End Ride',
        status: 'error',
        description: error.response?.data?.message || 'Please try again later.',
        placement: 'top',
      });
    }
  };

  // Function to call driver
  const callDriver = () => {
    if (
      rideDetails &&
      rideDetails.driverDetails &&
      rideDetails.driverDetails.driverPhone
    ) {
      Linking.openURL(`tel:${rideDetails.driverDetails.driverPhone}`);
    } else {
      toast.show({
        title: 'Unable to Call',
        status: 'error',
        description: "Driver's phone number is not available.",
        placement: 'top',
      });
    }
  };

  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    // You can add additional logic here if needed
  }, []);
  // Function to message driver
  const messageDriver = () => {
    if (
      rideDetails &&
      rideDetails.driverDetails &&
      rideDetails.driverDetails.driverPhone
    ) {
      Linking.openURL(`sms:${rideDetails.driverDetails.driverPhone}`);
    } else {
      toast.show({
        title: 'Unable to Message',
        status: 'error',
        description: "Driver's phone number is not available.",
        placement: 'top',
      });
    }
  };

  // Function to get user's current location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const formattedLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setUserLocation(formattedLocation);
      setFormattedPassengerPickup(formattedLocation);
    } catch (error) {
      console.error('Error getting user location:', error);
      setError('Unable to fetch your location');
    }
  };

  // Function to calculate ETA using HERE API
  const calculateETA = async (userLoc, driverLoc) => {
    try {
      const response = await axios.get(
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${driverLoc.latitude},${driverLoc.longitude}&destination=${userLoc.latitude},${userLoc.longitude}&return=summary&apiKey=${HERE_API_KEY}`
      );
      const etaInSeconds = response.data.routes[0].sections[0].summary.duration;
      const etaInMinutes = Math.round(etaInSeconds / 60);
      setEta(etaInMinutes);
    } catch (error) {
      console.error('Error calculating ETA:', error);
      toast.show({
        title: 'ETA Error',
        description: 'Failed to calculate ETA. Please try again.',
        status: 'error',
        placement: 'top',
      });
    }
  };

  // Function to render the main card with ride details
  const renderMainCard = () => {
    // Determine which location fields to use based on ride state
    let displaySource, displayDestination;

    if (rideState === RideStates.NOT_JOINED) {
      // Use ride's source/destination for NOT_JOINED and PENDING states
      displaySource = rideDetails.source ? rideDetails.source.split(',')[0] : 'N/A';
      displayDestination = rideDetails.destination ? rideDetails.destination.split(',')[0] : 'N/A';
    } else {
      console.log('Ride passengers Details -->', rideDetails);
      // Use passenger's locations for all other states
      const passengerData = rideDetails.passengers?.[0];
      if (passengerData) {
        displaySource = passengerData.startLocation || 'N/A';
        displayDestination = passengerData.endLocation || 'N/A';
      } else {
        displaySource = 'N/A';
        displayDestination = 'N/A';
      }
    }

    return (
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 12, padding: 24, marginBottom: 16 }}
      >
        <HStack justifyContent="space-between" alignItems="center" mb="4">
          <VStack flex={1}>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              FROM
            </Text>
            <Text
              color="white"
              fontSize="md"
              fontWeight="bold"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displaySource}
            </Text>
          </VStack>
          <Icon as={Ionicons} name="arrow-forward" size="md" color="white" mx={2} />
          <VStack flex={1}>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              TO
            </Text>
            <Text
              color="white"
              fontSize="md"
              fontWeight="bold"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayDestination}
            </Text>
          </VStack>
        </HStack>
        <HStack justifyContent="space-between" mt="2">
          <VStack>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              DATE
            </Text>
            <Text color="white" fontSize="md" fontWeight="semibold">
              {rideDetails.rideDate
                ? new Date(rideDetails.rideDate).toLocaleDateString()
                : 'N/A'}
            </Text>
          </VStack>
          <VStack>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              PICKUP
            </Text>
            <Text color="white" fontSize="md" fontWeight="semibold">
              {rideDetails.pickupTime
                ? new Date(rideDetails.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A'}
            </Text>
          </VStack>
          <VStack>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              STATUS
            </Text>
            <Badge
              variant="outline"
              colorScheme="coolGray"
              rounded="full"
              px="3"
              py="1"
              _text={{ color: 'white', fontSize: 'xs' }}
              borderColor="white"
            >
              {rideState.replace('_', ' ')}
            </Badge>
          </VStack>
        </HStack>
      </LinearGradient>
    );
  };

  // Function to render the driver information card
  const renderDriverCard = () => (
    <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
      <HStack alignItems="center" space="4">
        <Avatar
          size="lg"
          source={{
            uri: rideDetails.vehicleDto?.driverProfilePicture || 'https://randomuser.me/api/portraits/men/32.jpg',
          }}
        >
          {rideDetails.vehicleDto?.driverFirstName?.charAt(0) || 'D'}
        </Avatar>
        <VStack>
          <Text fontSize="lg" fontWeight="bold" color="black">
            {rideDetails.vehicleDto?.driverFirstName || 'Driver'}{' '}
            {rideDetails.vehicleDto?.driverLastName || ''}
          </Text>
          <HStack alignItems="center">
            <Icon as={Ionicons} name="star" size="sm" color="yellow.400" />
            <Text fontSize="md" color="coolGray.600" ml="1">
              {rideDetails.rating ? rideDetails.rating.toFixed(1) : 'N/A'} (120 rides)
            </Text>
          </HStack>
        </VStack>
      </HStack>
      <VStack mt="4" space="2">
        <HStack justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            VEHICLE
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="black">
            {rideDetails.vehicleDto?.vehicleModel || 'N/A'}
          </Text>
        </HStack>
        <HStack justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            PLATE NUMBER
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="black">
            {rideDetails.vehicleDto?.vehicleNumber || 'N/A'}
          </Text>
        </HStack>
        <HStack justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            COLOR
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="black">
            {rideDetails.vehicleDto?.vehicleColor || 'N/A'}
          </Text>
        </HStack>
        <HStack justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            SEATS
          </Text>
          <Text fontSize="sm" fontWeight="medium" color="black">
            {rideDetails.availableSeats != null ? `${rideDetails.availableSeats} Available` : 'N/A'}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );

  // Function to render the action card based on rideState
  const renderActionCard = () => {
    switch (rideState) {
      case RideStates.NOT_JOINED:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="map-pin" size="6" color="green.500" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Passenger Location Details
                </Text>
              </HStack>

              {/* Distance and Location Info */}
              <Box bg="gray.100" p="4" rounded="lg" mb="4">
                <VStack space="3">
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">Distance to Passenger</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {routeDetails.distance ? `${(routeDetails.distance / 1000).toFixed(1)} km` : 'Calculating...'}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">Estimated Duration</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {routeDetails.duration ? `${Math.round(routeDetails.duration / 60)} mins` : 'Calculating...'}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Map showing passenger location */}
              <Box bg="white" rounded="lg" shadow={2} p="4" mb="4" h={200}>
                <MapScreen
                  driverLocation={driverLocation}
                  passengerPickupLocation={formattedPassengerPickup}
                  passengerDropLocation={formattedPassengerDrop}
                  rideState={rideState}
                  ride={rideDetails}
                  hideNavigationButton={true}
                  source={rideDetails?.source}
                  destination={rideDetails?.destination}
                  shouldFetchRoute={true}
                  onLocationSelect={handleLocationSelect}
                />
              </Box>

              <Text fontSize="md" color="gray.600" mb="4">
                Join this ride to save 2.5 kg of CO2
              </Text>
              
              <Button
                onPress={joinRide}
                isLoading={joiningRide}
                isLoadingText="Sending Request..."
                bg="black"
                _text={{ color: 'white', fontWeight: 'bold' }}
                rounded="full"
              >
                Request to Join
              </Button>
            </Box>
          </Animated.View>
        );
      case RideStates.PENDING:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon
                  as={MaterialIcons}
                  name="hourglass-empty"
                  size="6"
                  color="yellow.600"
                  mr="2"
                />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Request Pending
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                Hang tight! Your request is being reviewed by the driver. We'll
                notify you as soon as there's an update.
              </Text>
              <Progress value={33} colorScheme="yellow" mb="4" />
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Estimated response time: 2-5 minutes
              </Text>
              <Button
                onPress={cancelRequest}
                bg="gray.400"
                _text={{ color: 'white', fontWeight: 'bold' }}
                rounded="full"
                mt="4"
              >
                Cancel Request
              </Button>
            </Box>
          </Animated.View>
        );
      case RideStates.ACCEPTED:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon
                  as={MaterialIcons}
                  name="check-circle"
                  size="6"
                  color="green.600"
                  mr="2"
                />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Ride Accepted!
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                Great news! Your ride request has been accepted. The driver will pick you up at your selected location.
              </Text>
              <Progress value={33} colorScheme="yellow" mb="4" />
              <Text fontSize="xs" color="gray.500" textAlign="center" mb="4">
                Ride will start soon
              </Text>
              <HStack space="4">
                <Button
                  onPress={callDriver}
                  leftIcon={<Icon as={Ionicons} name="call" size="sm" color="white" />}
                  bg="black"
                  _text={{ color: 'white' }}
                  rounded="full"
                  flex={1}
                >
                  Call Driver
                </Button>
                <Button
                  onPress={messageDriver}
                  leftIcon={<Icon as={Ionicons} name="chatbubble" size="sm" color="black" />}
                  bg="coolGray.100"
                  _text={{ color: 'black' }}
                  rounded="full"
                  flex={1}
                >
                  Message
                </Button>
              </HStack>
            </Box>
          </Animated.View>
        );
      case RideStates.DRIVER_ARRIVING:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="truck" size="6" color="blue.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Driver Arriving
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                Your driver is on the way to pick you up. Please be ready at your
                pickup location.
              </Text>
              {driverLocation && userLocation ? (
                <Box bg="gray.100" p="4" rounded="lg" mb="4">
                  <HStack justifyContent="space-between" mb="2">
                    <Text fontSize="sm" fontWeight="medium">
                      ETA
                    </Text>
                    <Text fontSize="lg" fontWeight="bold">
                      {eta ? `${eta} mins` : 'Calculating...'}
                    </Text>
                  </HStack>
                  <VStack space="1">
                    <Text fontSize="xs" color="gray.500">
                      Driver's Location
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {driverLocation.latitude?.toFixed(4)}° N,{' '}
                      {driverLocation.longitude?.toFixed(4)}° W
                    </Text>
                  </VStack>
                  <VStack space="1" mt="2">
                    <Text fontSize="xs" color="gray.500">
                      Your Pickup Location
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {userLocation.latitude?.toFixed(4)}° N,{' '}
                      {userLocation.longitude?.toFixed(4)}° W
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <ActivityIndicator size="small" color="#000" />
              )}
              <HStack space="4" mt="4">
                <Button
                  onPress={callDriver}
                  leftIcon={<Icon as={Ionicons} name="call" size="sm" color="white" />}
                  bg="black"
                  _text={{ color: 'white' }}
                  rounded="full"
                  flex={1}
                >
                  Call Driver
                </Button>
                <Button
                  onPress={messageDriver}
                  leftIcon={<Icon as={Ionicons} name="chatbubble" size="sm" color="black" />}
                  bg="coolGray.100"
                  _text={{ color: 'black' }}
                  rounded="full"
                  flex={1}
                >
                  Message
                </Button>
              </HStack>
              <Box bg="white" rounded="lg" shadow={2} p="4" mb="4" h={300}>
                <MapScreen
                  driverLocation={driverLocation}
                  passengerPickupLocation={formattedPassengerPickup}
                  passengerDropLocation={formattedPassengerDrop}
                  acceptedPassengers={acceptedPassengers}
                  rideState={rideState}
                  ride={rideDetails}
                  hideNavigationButton={true}
                  source={rideDetails?.source}
                  destination={rideDetails?.destination}
                  shouldFetchRoute={true}
                  onLocationSelect={handleLocationSelect}
                />
              </Box>
            </Box>
          </Animated.View>
        );
      case RideStates.REJECTED:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="x-circle" size="6" color="red.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Request Rejected
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                We're sorry, but the driver couldn't accommodate your request this
                time. Don't worry, there are plenty of other rides available!
              </Text>
              <Box bg="gray.100" p="3" rounded="md" mb="4">
                <Text fontSize="sm" fontWeight="semibold" mb="2">
                  Why was my request rejected?
                </Text>
                <VStack space="1">
                  <Text fontSize="sm" color="gray.600">
                    • The driver's route may have changed
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    • The available seats might have been filled
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    • There could be a timing conflict
                  </Text>
                </VStack>
              </Box>
              <Button
                onPress={() => navigation.navigate('FindRide')}
                bg="black"
                _text={{ color: 'white', fontWeight: 'bold' }}
                rounded="full"
              >
                Find Another Ride
              </Button>
            </Box>
          </Animated.View>
        );
      case RideStates.IN_PROGRESS:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="check-circle" size="6" color="green.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Ride in Progress
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                You're on your way! Enjoy your ride and remember to wear your
                seatbelt.
              </Text>
              <Button
                onPress={callDriver}
                leftIcon={<Icon as={Ionicons} name="chatbubble" size="sm" color="black" />}
                bg="coolGray.100"
                _text={{ color: 'black' }}
                rounded="full"
                mt="4"
              >
                Call Driver
              </Button>

              <Box bg="white" rounded="lg" shadow={2} p="4" mb="4" h={300}>
                <MapScreen
                  driverLocation={driverLocation}
                  passengerPickupLocation={formattedPassengerPickup}
                  passengerDropLocation={formattedPassengerDrop}
                  acceptedPassengers={acceptedPassengers}
                  rideState={rideState}
                  ride={rideDetails}
                  hideNavigationButton={true}
                  source='RideDetailsScreen'
                  destination={rideDetails?.destination}
                  shouldFetchRoute={true}
                  onLocationSelect={handleLocationSelect}
                />
                
              </Box>
            </Box>
          </Animated.View>
        );
      case RideStates.COMPLETED:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="check-circle" size="6" color="purple.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Ride Completed
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                Thanks for riding with us! We hope you had a great experience. Your
                feedback helps us improve our service.
              </Text>
              <Box bg="gray.100" p="3" rounded="md" mb="4">
                <Text fontSize="sm" fontWeight="semibold" mb="2">
                  Ride Summary
                </Text>
                <VStack space="1">
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Distance
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {rideDetails.distance != null ? `${rideDetails.distance} km` : 'N/A'}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Duration
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {rideDetails.duration != null ? `${rideDetails.duration} mins` : 'N/A'}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Cost
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {rideDetails.cost != null ? `$${rideDetails.cost}` : 'N/A'}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
              <Button
                onPress={() => navigation.navigate('RateRide', { rideId: rideDetails.id })}
                bg="black"
                _text={{ color: 'white', fontWeight: 'bold' }}
                rounded="full"
              >
                Rate Your Ride
              </Button>
            </Box>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  // Add the startLocationUpdates function
  const startLocationUpdates = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to continue.');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const formattedLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setDriverLocation(location.coords);
          setFormattedDriverLocation(formattedLocation);
          console.log('Updated Driver Location:', formattedLocation);
          console.log('Raw Location Data:', location.coords);
        }
      );
      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location updates:', error);
    }
  }, []);

  // Add cleanup for location subscription
  useEffect(() => {
    // Start location updates when component mounts
    startLocationUpdates();

    // Cleanup function
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [startLocationUpdates]);

  // Add this function near the other utility functions
  const calculateRouteDetails = async (driverLoc, passengerLoc) => {
    if (!driverLoc || !passengerLoc) return;
    
    try {
      const response = await axios.get(
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${driverLoc.latitude},${driverLoc.longitude}&destination=${passengerLoc.latitude},${passengerLoc.longitude}&return=summary&apiKey=${HERE_API_KEY}`
      );
      
      if (response.data.routes && response.data.routes[0]) {
        const summary = response.data.routes[0].sections[0].summary;
        setRouteDetails({
          distance: summary.length, // in meters
          duration: summary.duration // in seconds
        });
      }
    } catch (error) {
      console.error('Error calculating route details:', error);
    }
  };

  // Add this useEffect to trigger route calculation
  useEffect(() => {
    if (driverLocation && userLocation && rideState === RideStates.NOT_JOINED) {
      calculateRouteDetails(driverLocation, userLocation);
    }
  }, [driverLocation, userLocation, rideState]);

  // Call getUserLocation when component mounts
  useEffect(() => {
    getUserLocation();
  }, []);

  // Render loading indicator
  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#000000" />
      </Box>
    );
  }

  // Render error message
  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" p={4}>
        <Text fontSize="lg" color="red.500" textAlign="center">
          {error}
        </Text>
        <Button mt={4} onPress={fetchRideDetails}>
          Try Again
        </Button>
      </Box>
    );
  }

  // Main render
  return (
    <Box flex={1} bg="coolGray.50" safeArea>
      {/* Header */}
      <Box py="4" px="4">
        <HStack alignItems="center" justifyContent="space-between">
          <Pressable onPress={() => navigation.goBack()}>
            <Icon as={Ionicons} name="arrow-back" size="md" color="black" />
          </Pressable>
          <Text fontSize="lg" fontWeight="semibold" color="black">
            Ride Details
          </Text>
          <Box width={8} />
        </HStack>
      </Box>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderMainCard()}
        {rideDetails && rideDetails.vehicleDto && renderDriverCard()}
        {renderActionCard()}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});

export default RideDetailsScreen;
