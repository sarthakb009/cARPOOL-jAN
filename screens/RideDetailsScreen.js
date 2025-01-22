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
import { calculateAverageRating } from '../utils/ratingUtils';

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
  const { rideId: routeRideId, isDriver, rideType, initialFetch } = route.params;
  
  // Initialize ride state with full object structure
  const [ride, setRide] = useState({
    id: routeRideId,
    sourceLatitude: null,
    sourceLongitude: null,
    destinationLatitude: null,
    destinationLongitude: null,
    status: null,
  });

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
  const [currentRideStatus, setCurrentRideStatus ] = useState(null)
  const [acceptedPassengers, setAcceptedPassengers] = useState([]);
  const [formattedPassengerPickup, setFormattedPassengerPickup] = useState(null);
  const [formattedPassengerDrop, setFormattedPassengerDrop] = useState(null);
  const [routeDetails, setRouteDetails] = useState({ distance: null, duration: null });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [formattedDriverLocation, setFormattedDriverLocation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [viewType, setViewType] = useState(isDriver ? 'driver' : 'passenger');
  const [initialLoad, setInitialLoad] = useState(true);
  const [driverId, setDriverId] = useState(null);

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

  // Function to fetch passenger locations
  const fetchPassengerLocations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/passengerLocation?rideId=${routeRideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Passenger Location Response:', response.data);

      if (Array.isArray(response.data) && response.data.length > 0) {
        const passengerData = response.data[0];

        // Store the checkinStatus
        setRide((prevRide) => ({
          ...prevRide,
          checkinStatus: passengerData.checkinStatus,
        }));

        // Set coordinates based on checkinStatus
        if (passengerData.checkinStatus) {
          const destinationCoords = {
            latitude: passengerData.destinationLatitude,
            longitude: passengerData.destinationLongitude,
          };
          console.log('Destination Coordinates:', destinationCoords);
          setFormattedPassengerDrop(destinationCoords);
        } else {
          const sourceCoords = {
            latitude: passengerData.sourceLatitude,
            longitude: passengerData.sourceLongitude,
          };
          console.log('Source Coordinates:', sourceCoords);
          setFormattedPassengerPickup(sourceCoords);
        }
      }
    } catch (error) {
      console.error('Error fetching passenger locations:', error);
    }
  }, [routeRideId]);

  // Initialize ride details and set up SSE
  const initialize = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const userId = await AsyncStorage.getItem('userId');
      setDriverId(userId);

      if (!routeRideId) {
        throw new Error('No ride ID provided');
      }

      // Fetch ride details
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${routeRideId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.data) {
        throw new Error('No ride data received');
      }

      // Update ride data
      const rideData = response.data;
      setRide(rideData);
      
      // Update status only if we have valid data
      if (rideData.status) {
        setCurrentRideStatus(rideData.status);
      }

      // Process coordinates if available
      if (rideData) {
        if (!rideData.checkinStatus) {
          const sourceCoords = {
            latitude: rideData.sourceLatitude || 0,
            longitude: rideData.sourceLongitude || 0,
          };
          setFormattedPassengerPickup(sourceCoords);
        } else {
          const destinationCoords = {
            latitude: rideData.destinationLatitude || 0,
            longitude: rideData.destinationLongitude || 0,
          };
          setFormattedPassengerDrop(destinationCoords);
        }
      }
    } catch (error) {
      console.error('Initialization Error:', error);
      setError(error.message || 'Failed to initialize. Please try again.');
      toast.show({
        title: "Error",
        description: error.message || "Failed to load ride details",
        status: "error",
        placement: "top"
      });
    } finally {
      setLoading(false);
    }
  }, [routeRideId, toast]);

  useEffect(() => {
    initialize();
    fetchPassengerLocations();
  }, [initialize, fetchPassengerLocations]);

  // Function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (startCoords, endCoords) => {
    const toRad = (value) => (value * Math.PI) / 180;

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(endCoords.latitude - startCoords.latitude);
    const dLon = toRad(endCoords.longitude - startCoords.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(startCoords.latitude)) *
        Math.cos(toRad(endCoords.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Calculate duration between start and end times
  const calculateDuration = useCallback((startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} minutes`;
  }, []);

  // Modify fetchRideDetails to always fetch when initialFetch is true
  const fetchRideDetails = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');
      setCurrentPassengerId(passengerId);

      let endpoint = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${routeRideId}`;
      
      if (rideType === 'scheduled') {
        endpoint = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides/${routeRideId}`;
      } else if (rideType === 'recurring') {
        endpoint = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/${routeRideId}`;
      }

      const rideResponse = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (rideResponse.data) {
        setRideDetails(rideResponse.data);
        
        // Check if the ride is cancelled
        if (rideResponse.data.status?.toUpperCase() === 'CANCELED') {
          setRideState(RideStates.CANCELED);
          return;
        }

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
            return;
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
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getRequestByRide?rideId=${routeRideId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log('Request Response:', requestsResponse.data);

          const userRequest = requestsResponse.data.find(
            (request) => request.passengerId.toString() === passengerId
          );

          console.log('User Request:', userRequest);

          if (userRequest) {
            if (
              rideStateRef.current === RideStates.PENDING &&
              userRequest.status.toLowerCase() === 'pending'
            ) {
              return;
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
            if (rideStateRef.current !== RideStates.PENDING) {
              setRideState(RideStates.NOT_JOINED);
            }
          }
        } catch (requestError) {
          if (requestError.response && requestError.response.status === 400) {
            console.log('No ride requests available');
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
      if (error.response?.status === 400) {
        setError('Unable to fetch ride details. The ride might still be processing.');
        if (initialFetch) {
          setTimeout(() => {
            fetchRideDetails();
          }, 2000);
        }
      } else {
        setError('Failed to fetch ride details. Please try again.');
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [routeRideId, rideType, initialFetch]);

  // Set up polling with useEffect
  useEffect(() => {
    fetchRideDetails();

    const intervalId = setInterval(() => {
      fetchRideDetails();
    }, 6000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchRideDetails]);

  // useEffect for animations and EventSource setup
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (
      rideState === RideStates.ACCEPTED ||
      rideState === RideStates.DRIVER_ARRIVING
    ) {
      getUserLocation();

      if (!eventSourceRef.current) {
        eventSourceRef.current = new EventSource(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/sse/location/stream/last-known/${routeRideId}`
        );

        eventSourceRef.current.addEventListener('LAST_KNOWN_LOCATION', (e) => {
          try {
            const data = JSON.parse(e.data);
            const newDriverLocation = {
              latitude: data.latitude,
              longitude: data.longitude,
            };

            const hasLocationChanged = !driverLocation ||
              (driverLocation.latitude !== newDriverLocation.latitude ||
                driverLocation.longitude !== newDriverLocation.longitude);

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

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }
  }, [rideState, fadeAnim, driverLocation, userLocation, routeRideId]);

  // useEffect to calculate ETA when locations change
  useEffect(() => {
    if (userLocation && driverLocation) {
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
        rideId: routeRideId,
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
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/request?passengerId=${currentPassengerId}&rideId=${routeRideId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        setRideState(RideStates.PENDING);
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

      const response = await axios.put(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/cancelRideByPassenger?passengerId=${passengerId}&rideId=${routeRideId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Cancellation response:', response.data);
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
          rideId: routeRideId,
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
          rideId: routeRideId,
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
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
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

  // Function to calculate available seats
  const calculateSeatAvailability = (rideDetails) => {
    if (!rideDetails || !rideDetails.vehicleDto) return 'N/A';

    const totalCapacity = rideDetails.vehicleDto.vehicleCapacity;
    const occupiedSeats = rideDetails.passengers?.length || 0;
    const availableSeats = totalCapacity - occupiedSeats;

    if (availableSeats <= 0) {
      return 'No seats available';
    }
    return `${availableSeats} out of ${totalCapacity} available`;
  };

  // Function to render the main card with ride details
  const renderMainCard = () => {
    let displaySource, displayDestination, displayDate, displayTime;

    if (!rideDetails) {
      displaySource = 'N/A';
      displayDestination = 'N/A';
      displayDate = 'N/A';
      displayTime = 'N/A';
    } else {
      if (rideState === RideStates.NOT_JOINED) {
        displaySource = rideDetails.source ? rideDetails.source.split(',')[0] : 'N/A';
        displayDestination = rideDetails.destination ? rideDetails.destination.split(',')[0] : 'N/A';
      } else {
        const passengerData = rideDetails.passengers?.find(p => p.passengerId.toString() === currentPassengerId);
        
        displaySource = passengerData?.startLocation || rideDetails.source?.split(',')[0] || 'N/A';
        displayDestination = passengerData?.endLocation || rideDetails.destination?.split(',')[0] || 'N/A';
      }

      displayDate = rideDetails.rideDate
        ? new Date(rideDetails.rideDate).toLocaleDateString()
        : 'N/A';
      displayTime = rideDetails.pickupTime
        ? new Date(rideDetails.pickupTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : 'N/A';
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
              {displayDate}
            </Text>
          </VStack>
          <VStack>
            <Text color="gray.400" fontSize="xs" fontWeight="medium">
              PICKUP
            </Text>
            <Text color="white" fontSize="md" fontWeight="semibold">
              {displayTime}
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
    <Box 
      bg="white" 
      rounded="2xl" 
      p="6" 
      shadow="2" 
      mb="4"
    >
      {/* Driver Profile Section */}
      <HStack alignItems="center" space="4" mb="6">
        <Box>
          <Avatar
            size="lg"
            source={{
              uri: rideDetails.vehicleDto?.driverProfilePicture ||
                   'https://randomuser.me/api/portraits/men/32.jpg',
            }}
            borderWidth={2}
            borderColor="black"
          >
            {rideDetails.vehicleDto?.riderFirstName?.charAt(0) || 'D'}
          </Avatar>
          <Box 
            position="absolute" 
            bottom={0} 
            right={0}
            bg="green.500" 
            w="4" 
            h="4" 
            rounded="full" 
            borderWidth={2} 
            borderColor="white"
          />
        </Box>
        
        <VStack flex={1}>
          <Text fontSize="xl" fontWeight="bold" color="gray.800">
            {rideDetails.vehicleDto?.riderFirstName || 'Driver'}{' '}
            {rideDetails.vehicleDto?.riderLastName || ''}
          </Text>
          <HStack alignItems="center" space={1}>
            <Icon as={Ionicons} name="star" size="sm" color="yellow.500" />
            <Text fontSize="md" color="gray.600" fontWeight="medium">
              {calculateAverageRating(reviews)}
            </Text>
            <Text fontSize="sm" color="gray.400">
              ({reviews.length} reviews)
            </Text>
          </HStack>
        </VStack>
      </HStack>

      {/* Vehicle Details Section */}
      <Box 
        bg="gray.50" 
        p="4" 
        rounded="xl" 
        mb="6"
        borderWidth={1}
        borderColor="gray.100"
      >
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb="3">
          VEHICLE DETAILS
        </Text>
        <VStack space="4">
          <HStack alignItems="center" space="3">
            <Icon as={Ionicons} name="car-outline" size="md" color="gray.400" />
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.400">MODEL</Text>
              <Text fontSize="md" fontWeight="semibold" color="gray.800">
                {rideDetails.vehicleDto?.model || 'N/A'}
              </Text>
            </VStack>
            <VStack>
              <Text fontSize="xs" color="gray.400">PLATE</Text>
              <Text fontSize="md" fontWeight="semibold" color="gray.800">
                {rideDetails.vehicleDto?.vehicleNumber || 'N/A'}
              </Text>
            </VStack>
          </HStack>
          
          <HStack alignItems="center" space="3">
            <Icon as={Ionicons} name="color-palette-outline" size="md" color="gray.400" />
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.400">COLOR</Text>
              <Text fontSize="md" fontWeight="semibold" color="gray.800">
                {rideDetails.vehicleDto?.color || 'N/A'}
              </Text>
            </VStack>
            <VStack>
              <Text fontSize="xs" color="gray.400">SEATS</Text>
              <Text fontSize="md" fontWeight="semibold" color="gray.800">
                {calculateSeatAvailability(rideDetails)}
              </Text>
            </VStack>
          </HStack>
        </VStack>
      </Box>

      {/* Contact Section */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb="3">
          CONTACT INFORMATION
        </Text>
        <VStack space="3">
          <Pressable
            onPress={() => Linking.openURL(`tel:${rideDetails.driverDetails?.driverPhone}`)}
            flexDirection="row"
            alignItems="center"
            bg="gray.50"
            p="3"
            rounded="lg"
            borderWidth={1}
            borderColor="gray.100"
          >
            <Icon as={Ionicons} name="call-outline" size="md" color="black" mr="3" />
            <Text flex={1} fontSize="md" color="gray.700">
              {rideDetails.driverDetails?.driverPhone || 'N/A'}
            </Text>
            <Icon as={Ionicons} name="chevron-forward" size="sm" color="gray.400" />
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL(`mailto:${rideDetails.driverDetails?.email}`)}
            flexDirection="row"
            alignItems="center"
            bg="gray.50"
            p="3"
            rounded="lg"
            borderWidth={1}
            borderColor="gray.100"
          >
            <Icon as={Ionicons} name="mail-outline" size="md" color="black" mr="3" />
            <Text flex={1} fontSize="md" color="gray.700">
              {rideDetails.driverDetails?.email || 'N/A'}
            </Text>
            <Icon as={Ionicons} name="chevron-forward" size="sm" color="gray.400" />
          </Pressable>

          <Button
            mt="2"
            size="md"
            bg="black"
            _pressed={{ bg: "blue.600" }}
            rounded="full"
            leftIcon={<Icon as={Ionicons} name="chatbubble-outline" size="sm" color="white" />}
            _text={{ color: 'white', fontWeight: 'bold' }}
            onPress={messageDriver}
          >
            Message Driver
          </Button>
        </VStack>
      </Box>
    </Box>
  );

  // Function to cancel ride as passenger
  const cancelRideAsPassenger = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const response = await axios.put(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/cancelRideByPassenger?passengerId=${passengerId}&rideId=${routeRideId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setRideState(RideStates.CANCELED);
        
        setRideDetails(prevDetails => ({
          ...prevDetails,
          status: 'CANCELED'
        }));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: 'Ride Cancelled',
          status: 'success',
          description: 'Your ride has been cancelled successfully.',
          placement: 'top',
        });

        await fetchRideDetails();
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      toast.show({
        title: 'Failed to Cancel Ride',
        status: 'error',
        description: error.response?.data?.message || 'Please try again later.',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to render the action card based on rideState
  const renderActionCard = () => {
    console.log('Current ride state:', rideState);
    if (viewType === 'driver') {
      return (
        <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
          <HStack alignItems="center" mb="4">
            <Icon
              as={MaterialIcons}
              name="local-taxi"
              size="6"
              color="black"
              mr="2"
            />
            <Text fontSize="lg" fontWeight="bold" color="black">
              Ride Posted Successfully
            </Text>
          </HStack>
          <Text fontSize="sm" color="gray.600" mb="4">
            Your ride has been posted. You'll be notified when passengers request to join.
          </Text>
          <VStack space={4}>
          <Button
            onPress={() => {
              console.log('Navigating to ManageRide:', { routeRideId, isDriver });
              navigation.navigate('ManageRide', { ride: rideDetails });
            }}
            bg="black"
            _text={{ color: 'white', fontWeight: 'bold' }}
            rounded="full"
          >
            Manage Ride
          </Button>

            <Button
              onPress={() => navigation.replace('RideHistory', {
                initialTab: 1 
              })}
              variant="outline"
              _text={{ color: 'black' }}
              rounded="full"
            >
              View All Rides
            </Button>
          </VStack>
        </Box>
      );
    }

    switch (rideState) {
      case RideStates.CANCELED:
        return (
          <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
            <HStack alignItems="center" mb="4">
              <Icon as={Feather} name="x-circle" size="6" color="red.600" mr="2" />
              <Text fontSize="lg" fontWeight="bold" color="black">
                Ride Cancelled
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.600" mb="4">
              You have successfully cancelled this ride. We hope to see you book another ride soon!
            </Text>
            <Box bg="gray.100" p="4" rounded="lg" mb="4">
              <Text fontSize="sm" color="gray.600">
                Cancellation Details:
              </Text>
              <Text fontSize="sm" fontWeight="medium" mt="2">
                • Cancelled on: {new Date().toLocaleDateString()}
              </Text>
              <Text fontSize="sm" fontWeight="medium">
                • Ride ID: {routeRideId}
              </Text>
            </Box>
            <Button
              onPress={() => navigation.navigate('FindRide')}
              bg="black"
              _text={{ color: 'white', fontWeight: 'bold' }}
              rounded="full"
            >
              Find New Ride
            </Button>
          </Box>
        );
      case RideStates.NOT_JOINED:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="zap" size="6" color="green.500" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Eco-Friendly Ride
                </Text>
              </HStack>
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
            <VStack space={4}>
              <Button
                onPress={cancelRideAsPassenger}
                bg="red.600"
                _text={{ color: 'white', fontWeight: 'bold' }}
                rounded="full"
              >
                Cancel Ride
              </Button>
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
            </VStack>
          </Box>
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
        const startCoords = {
          latitude: ride.sourceLatitude,
          longitude: ride.sourceLongitude,
        };
        const endCoords = {
          latitude: ride.destinationLatitude,
          longitude: ride.destinationLongitude,
        };
        const totalDistance = calculateDistance(startCoords, endCoords).toFixed(2);
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
                      {totalDistance}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Duration
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {calculateDuration(ride.rideStartTime, ride.rideEndTime)}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Cost
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {rideDetails.cost != null ? `$${rideDetails.price}` : 'N/A'}
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
    startLocationUpdates();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [startLocationUpdates]);

  // Add new useEffect to fetch reviews
  useEffect(() => {
    const fetchDriverReviews = async () => {
      try {
        if (rideDetails?.vehicleDto?.driverId) {
          const token = await AsyncStorage.getItem('userToken');
          const response = await axios.get(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/review/getByDriver?driverId=${rideDetails.vehicleDto.driverId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setReviews(response.data);
        }
      } catch (error) {
        console.error('Error fetching driver reviews:', error);
      }
    };

    fetchDriverReviews();
  }, [rideDetails?.vehicleDto?.driverId]);

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