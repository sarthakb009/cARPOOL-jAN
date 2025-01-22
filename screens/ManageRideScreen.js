import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  View,
  PanResponder, 
  Image,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  Progress,
  Icon,
  useTheme,
  Badge,
  Button,
  useToast,
  Spinner
} from 'native-base';
import { Ionicons, Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import EventSource from 'react-native-event-source'; // Ensure this polyfill is correctly installed
import MapScreen from './MapScreen';
import { Linking } from 'react-native';

// Get device width for animations
const { width } = Dimensions.get('window');

// Define Ride States
const RideStates = {
  WAITING_FOR_REQUESTS: 'WAITING_FOR_REQUESTS',
  RECEIVING_REQUESTS: 'RECEIVING_REQUESTS',
  READY_TO_START: 'READY_TO_START',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

// Custom button styles
const buttonStyles = {
  actionButton: {
    base: {
      height: 40,
      minWidth: 40,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    primary: {
      backgroundColor: '#000000',
      borderWidth: 1,
      borderColor: '#000000',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#000000',
    },
  },
  iconStyle: {
    size: 18,
  },
};

const ManageRideScreen = ({ route, navigation }) => {
  // Add validation for route.params


  const { ride: initialRide } = route.params;
  
  // Initialize states with safe defaults
  const [ride, setRide] = useState(initialRide || {});
  const [currentRideStatus, setCurrentRideStatus] = useState(initialRide?.status || 'PENDING');
  const [rideState, setRideState] = useState(RideStates.WAITING_FOR_REQUESTS);
  const [acceptedPassengers, setAcceptedPassengers] = useState([]);
  const [checkedInPassengers, setCheckedInPassengers] = useState([]);
  const [droppedPassengers, setDroppedPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(width)).current;
  const theme = useTheme();
  const toast = useToast();
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [subRideState, setSubRideState] = useState('EN_ROUTE_PICKUP'); // For internal sub-states during IN_PROGRESS
  const [driverId, setDriverId] = useState(null);
  const [allRequests, setAllRequests] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Coordinates and ETA States
  const [passengerPickupLocation, setPassengerPickupLocation] = useState(null);
  const [passengerDropLocation, setPassengerDropLocation] = useState(null);
  const [eta, setEta] = useState(null);

  // EventSource references
  const rideStatusEventSourceRef = useRef(null);
  const rideRequestsEventSourceRef = useRef(null);

  // Add these new states at the beginning with other state declarations
  const [formattedDriverLocation, setFormattedDriverLocation] = useState(null);
  const [formattedPassengerPickup, setFormattedPassengerPickup] = useState(null);
  const [formattedPassengerDrop, setFormattedPassengerDrop] = useState(null);

  // Add this with other state declarations at the top
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Add these new states with the other state declarations
  const [isStartingJourney, setIsStartingJourney] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState({});
  const [isCheckingOut, setIsCheckingOut] = useState({});
  const [isEndingJourney, setIsEndingJourney] = useState(false);

  // Add these new state variables with your other states
  const [isAccepting, setIsAccepting] = useState({});
  const [isRejecting, setIsRejecting] = useState({});
  const [position, setPosition] = useState(new Animated.Value(0));
  const maxWidth = 300; // Slider width in pixels

  // Add these functions after other function declarations
const callPassenger = (passenger) => {
  if (passenger.phone) {
    Linking.openURL(`tel:${passenger.phone}`);
  } else {
    toast.show({
      title: 'Unable to Call',
      status: 'error',
      description: "Passenger's phone number is not available.",
      placement: 'top',
    });
  }
};

const messagePassenger = (passenger) => {
  if (passenger.phone) {
    Linking.openURL(`sms:${passenger.phone}`);
  } else {
    toast.show({
      title: 'Unable to Message',
      status: 'error',
      description: "Passenger's phone number is not available.",
      placement: 'top',
    });
  }
};


const panResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onPanResponderMove: (_, gestureState) => {
    const newPosition = Math.min(
      Math.max(0, gestureState.dx),
      maxWidth - 50 // Account for the knob width
    );
    position.setValue(newPosition);
  },
  onPanResponderRelease: async (_, gestureState) => {
    if (gestureState.dx >= maxWidth * 0.8) { // Reduced threshold to 80% for better UX
      // Animate to complete position
      Animated.timing(position, {
        toValue: maxWidth - 50,
        duration: 100,
        useNativeDriver: false,
      }).start();

      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show confirmation alert
      Alert.alert(
        "End Journey",
        "Are you sure you want to end this journey?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              // Reset slider position if cancelled
              Animated.timing(position, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }
          },
          {
            text: "End Journey",
            style: "destructive",
            onPress: async () => {
              try {
                await handleEndRide();
              } catch (error) {
                console.error('Error ending ride:', error);
                // Reset slider position on error
                Animated.timing(position, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              }
            }
          }
        ]
      );
    } else {
      // Reset position if not slid far enough
      Animated.timing(position, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  },
});


  // Add this handler function with other handlers
  const handleLocationSelect = useCallback((location) => {
    setSelectedLocation(location);
    // You can add additional logic here if needed
  }, []);

  // Function to initiate SSE for ride status
  const makeRideStatusCall = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Make the GET call without using its output
      await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/sse/notifications/stream/ride-status/${initialRide.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Ride status call completed');
    } catch (error) {
      console.error('Error making ride status call:', error);
    }
  }, [initialRide.id]);

  // Function to fetch passenger locations
  const fetchPassengerLocations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/passengerLocation?rideId=${initialRide.id}`,
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
  }, [initialRide.id]);

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

      if (!initialRide?.id) {
        throw new Error('No ride ID provided');
      }

      // Fetch ride details
      const response = await axios.get(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${initialRide.id}`,
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

      // Setup SSE connections
      if (token && initialRide.id) {
        setupRideRequestsEventSource(initialRide.id, token);
        setupRideStatusEventSource(initialRide.id, token);
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
  }, [initialRide?.id, setupRideRequestsEventSource, setupRideStatusEventSource, toast]);

  useEffect(() => {
    initialize();
    makeRideStatusCall();
    fetchPassengerLocations(); // Fetch passenger locations on mount
    return () => {
      // Cleanup EventSource connections
      if (rideStatusEventSourceRef.current) {
        rideStatusEventSourceRef.current.close();
      }
      if (rideRequestsEventSourceRef.current) {
        rideRequestsEventSourceRef.current.close();
      }
      stopLocationUpdates();
    };
  }, [initialize, makeRideStatusCall, fetchPassengerLocations]);

  useEffect(() => {
    if (currentRideStatus || Object.keys(allRequests).length > 0 || acceptedPassengers.length > 0) {
      updateRideState();
    }
  }, [currentRideStatus, allRequests, acceptedPassengers, updateRideState]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (rideState === RideStates.IN_PROGRESS) {
      startLocationUpdates();
    } else {
      stopLocationUpdates();
    }
  }, [rideState, startLocationUpdates, stopLocationUpdates]);

  // Setup SSE for ride status
  const setupRideStatusEventSource = useCallback(
    (rideId, token) => {
      const rideStatusUrl = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/sse/notifications/stream/ride-status/${rideId}`;

      const connect = () => {
        rideStatusEventSourceRef.current = new EventSource(rideStatusUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        rideStatusEventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRideStatusEvent(data);
          } catch (e) {
            console.error('Error parsing ride status event data:', e);
          }
        };

        rideStatusEventSourceRef.current.onerror = (error) => {
          console.error('Ride Status SSE Error:', error);
          toast.show({
            title: 'Connection Error',
            description: 'Lost connection to the ride status stream. Reconnecting...',
            status: 'error',
            placement: 'top',
          });

          // Close and attempt to reconnect after delay
          rideStatusEventSourceRef.current.close();
          setTimeout(() => {
            connect();
          }, 5000);
        };
      };

      connect();
    },
    [handleRideStatusEvent, toast]
  );

  // Handle incoming ride status events
  const handleRideStatusEvent = useCallback(
    (eventData) => {
      switch (eventData.type) {
        case 'RIDE_STARTED':
          setCurrentRideStatus('Ongoing'); // Assuming 'Ongoing' is the status string
          setRide((prevRide) => ({
            ...prevRide,
            rideStartTime: eventData.data.startTime,
          }));
          setRideState(RideStates.IN_PROGRESS);
          setSubRideState('EN_ROUTE_PICKUP');
          toast.show({
            title: 'Ride Started',
            description: eventData.message,
            status: 'info',
            placement: 'top',
          });
          break;
        case 'RIDE_COMPLETED':
          setCurrentRideStatus('Completed'); // Assuming 'Completed' is the status string
          setRide((prevRide) => ({
            ...prevRide,
            rideEndTime: eventData.data.endTime,
          }));
          setRideState(RideStates.COMPLETED);
          toast.show({
            title: 'Ride Completed',
            description: eventData.message,
            status: 'success',
            placement: 'top',
          });
          break;
        default:
          console.log('Unhandled ride status event type:', eventData.type);
      }
    },
    [toast]
  );

  // Handle incoming ride request events
  const handleRideRequestEvent = useCallback(
    (eventType, eventData) => {
      try {
        // Parse the JSON data
        const parsedData = JSON.parse(eventData);

        // Add additional validation
        if (!parsedData) {
          console.warn('Empty or invalid event data received');
          return;
        }

        // Validate presence of essential passenger information
        if (!parsedData.passengerId || !parsedData.passengerName) {
          console.warn('Passenger information missing in event data');
          return;
        }

        // Construct the parsed request object with status validation
        const parsedRequest = {
          id: parsedData.id,
          status: parsedData.status || 'PENDING', // Provide default status
          passengerId: parsedData.passengerId,
          name: parsedData.passengerName,
          passengerJourneyId: parsedData.passengerJourneyId,
          timestamp: new Date(parsedData.requestTime || Date.now()),
          // Additional passenger details with default values
          startLocation: parsedData.startLocation || 'Unknown',
          startLatitude: typeof parsedData.startLatitude === 'number' ? parsedData.startLatitude : 0,
          startLongitude: typeof parsedData.startLongitude === 'number' ? parsedData.startLongitude : 0,
          endLocation: parsedData.endLocation || 'Unknown',
          endLatitude: typeof parsedData.endLatitude === 'number' ? parsedData.endLatitude : 0,
          endLongitude: typeof parsedData.endLongitude === 'number' ? parsedData.endLongitude : 0,
        };

        // Update allRequests state only if we have a valid request
        if (parsedRequest.id) {
          setAllRequests((prev) => ({
            ...prev,
            [parsedRequest.id]: parsedRequest,
          }));

          // Check status before updating acceptedPassengers
          if (parsedRequest.status === 'Accepted') {
            setAcceptedPassengers((prev) => {
              const exists = prev.find((p) => p.id === parsedRequest.id);
              if (exists) return prev;
              
              return [
                ...prev,
                {
                  id: parsedRequest.id,
                  name: parsedRequest.name,
                  passengerId: parsedRequest.passengerId,
                  passengerJourneyId: parsedRequest.passengerJourneyId,
                  // Additional passenger details with null checks
                  firstName: parsedData.passengerName?.split(' ')[0] || 'N/A',
                  lastName: parsedData.passengerName?.split(' ')[1] || 'N/A',
                  phone: parsedData.rideDto?.driverDetails?.driverPhone || 'N/A',
                  email: parsedData.rideDto?.driverDetails?.email || 'N/A',
                  startLocation: parsedData.startLocation || 'Unknown',
                  endLocation: parsedData.endLocation || 'Unknown',
                  startLatitude: typeof parsedData.startLatitude === 'number' ? parsedData.startLatitude : 0,
                  startLongitude: typeof parsedData.startLongitude === 'number' ? parsedData.startLongitude : 0,
                  endLatitude: typeof parsedData.endLatitude === 'number' ? parsedData.endLatitude : 0,
                  endLongitude: typeof parsedData.endLongitude === 'number' ? parsedData.endLongitude : 0,
                },
              ];
            });
          }
        }
      } catch (error) {
        console.error('Error parsing ride request event data:', error);
      }
    },
    [setAllRequests, setAcceptedPassengers]
  );

  // Setup SSE for ride requests history
  const setupRideRequestsEventSource = useCallback(
    (rideId, token) => {
      const rideRequestsUrl = `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/sse/notifications/stream/ride-requests/history/${rideId}`;

      const connect = () => {
        rideRequestsEventSourceRef.current = new EventSource(rideRequestsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Listen for the 'RIDE_REQUEST_UPDATE' event
        rideRequestsEventSourceRef.current.addEventListener('RIDE_REQUEST_UPDATE', (event) => {
          handleRideRequestEvent('RIDE_REQUEST_UPDATE', event.data);
        });

        rideRequestsEventSourceRef.current.onerror = (error) => {
          console.error('Ride Requests SSE Error:', error);
          toast.show({
            title: 'Connection Error',
            description: 'Lost connection to the ride requests stream. Reconnecting...',
            status: 'error',
            placement: 'top',
          });

          // Close and attempt to reconnect after delay
          rideRequestsEventSourceRef.current.close();
          setTimeout(() => {
            connect();
          }, 5000);
        };
      };

      connect();
    },
    [handleRideRequestEvent, toast]
  );

  // Update ride state based on current status and passenger activities
  const updateRideState = useCallback(() => {
    if (currentRideStatus === 'Completed') {
      setRideState(RideStates.COMPLETED);
    } else if (currentRideStatus === 'Ongoing') {
      setRideState(RideStates.IN_PROGRESS);
    } else {
      const hasPending = Object.values(allRequests).some((req) => req.status === 'PENDING');
      if (hasPending) {
        setRideState(RideStates.RECEIVING_REQUESTS);
      } else if (acceptedPassengers.length > 0) {
        setRideState(RideStates.READY_TO_START);
      } else {
        setRideState(RideStates.WAITING_FOR_REQUESTS);
      }
    }
  }, [currentRideStatus, allRequests, acceptedPassengers.length]);

  // Start location updates
  const startLocationUpdates = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to start the ride.');
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
        }
      );
      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location updates:', error);
    }
  }, []);

  // Stop location updates
  const stopLocationUpdates = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  }, [locationSubscription]);
  

  // Handle accepting a ride request
  // Handle accepting a ride request
  const handleAcceptRequest = useCallback(
    async (request) => {
      if (isAccepting[request.id]) return;
      setIsAccepting(prev => ({ ...prev, [request.id]: true }));
      try {
        const token = await AsyncStorage.getItem('userToken');
        const driverId = ride.driverDetails.id;
        console.log('Accepting request with driverId:', driverId);
        // Accept the request
        await axios.put(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/respond?requestId=${request.id}&status=Accepted&driverId=${driverId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Re-initialize to get fresh data
        await initialize();

        toast.show({
          title: 'Request Accepted',
          description: 'Passenger will be notified.',
          status: 'success',
          placement: 'top',
        });
      } catch (error) {
        console.error('Error accepting request:', error);
        Alert.alert('Error', 'Failed to accept request. Please try again.');
      } finally {
        setIsAccepting(prev => ({ ...prev, [request.id]: false }));
      }
    },
    [toast, isAccepting, initialize] // Add initialize to dependencies
  );
  

  // Handle rejecting a ride request
  const handleRejectRequest = useCallback(
    async (request) => {
      if (isRejecting[request.id]) return;
      setIsRejecting(prev => ({ ...prev, [request.id]: true }));
      try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.post(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/respond?requestId=${request.id}&status=Rejected`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        toast.show({
          title: 'Request Rejected',
          description: 'Passenger will be notified.',
          status: 'info',
          placement: 'top',
        });
      } catch (error) {
        console.error('Error rejecting request:', error);
        Alert.alert('Error', 'Failed to reject request. Please try again.');
      } finally {
        setIsRejecting(prev => ({ ...prev, [request.id]: false }));
      }
    },
    [toast, isRejecting]
  );

  // Handle starting the ride
  const handleStartRide = useCallback(async () => {
    if (isStartingJourney) return;
    setIsStartingJourney(true);
    try {
      console.log('Starting ride...'); // Add logging
      const token = await AsyncStorage.getItem('userToken');
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permissions to start the ride.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      // Log the request being made
      console.log('Making request to /rides/start with:', {
        rideId: ride.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const response = await axios.put(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/start',
        {
          rideId: ride.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Start ride response:', response.data); // Add logging

      if (response.data === 'Ride Started!') {
        // Start location tracking
        startLocationUpdates();

        // Update ride state
        setCurrentRideStatus('Ongoing');
        setRideState(RideStates.IN_PROGRESS);
        setSubRideState('EN_ROUTE_PICKUP');

        // Set initial passenger pickup location from the API response
        const passengerLocation = {
          latitude: 25.25936, // from the passenger location API
          longitude: 51.58896, // from the passenger location API
        };
        setFormattedPassengerPickup(passengerLocation);

        toast.show({
          title: 'Ride Started',
          description: 'Your journey has begun. You can now pick up passengers.',
          status: 'success',
          placement: 'top',
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error starting ride:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to start ride. Please try again.',
        status: 'error',
        placement: 'top',
      });
    } finally {
      setIsStartingJourney(false);
    }
  }, [ride.id, startLocationUpdates, toast, isStartingJourney]);

  // Handle ending the ride
  const handleEndRide = useCallback(async () => {
    if (isEndingJourney) return;
    setIsEndingJourney(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      let location = await Location.getCurrentPositionAsync({});
      const response = await axios.put(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/end',
        {
          rideId: ride.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Immediately update states if the response is successful
      if (response.data === 'Ride Completed!') {
        // Update ride status
        setCurrentRideStatus('Completed'); // Assuming 'Completed' is the status string
        setRideState(RideStates.COMPLETED);

        // Update ride object with end time
        setRide((prevRide) => ({
          ...prevRide,
          status: 'Completed',
          rideEndTime: new Date().toISOString(),
        }));

        // Stop location tracking
        stopLocationUpdates();

        // Show success toast
        toast.show({
          title: 'Ride Completed',
          description: 'Your journey has been completed successfully.',
          status: 'success',
          placement: 'top',
        });

        // Trigger haptic feedback for confirmation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error ending ride:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to end ride. Please try again.',
        status: 'error',
        placement: 'top',
      });
    } finally {
      setIsEndingJourney(false);
    }
  }, [ride.id, stopLocationUpdates, toast, isEndingJourney]);

  // Handle checking in a passenger
  const handleCheckIn = useCallback(async (passenger) => {
    if (isCheckingIn[passenger.id]) return;
    setIsCheckingIn(prev => ({ ...prev, [passenger.id]: true }));
    try {
      console.log('Checking in passenger:', passenger);
      const token = await AsyncStorage.getItem('userToken');
      let location = await Location.getCurrentPositionAsync({});

      const response = await axios.put(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/passenger/start',
        {
          rideId: ride.id,
          passengerJourneyId: passenger.passengerJourneyId,
          checkinLatitude: location.coords.latitude,
          checkinLongitude: location.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        // Update the ride state with the new passenger status
        setRide(prevRide => ({
          ...prevRide,
          passengers: prevRide.passengers.map(p =>
            p.id === passenger.id
              ? { ...p, checkinStatus: true }
              : p
          )
        }));

        // Update checkedInPassengers state
        setCheckedInPassengers(prev => [...prev, passenger]);

        // Fetch updated passenger locations
        await fetchPassengerLocations();

        toast.show({
          title: 'Success',
          description: 'Passenger checked in successfully!',
          status: 'success',
          placement: 'top',
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in passenger. Please try again.');
    } finally {
      setIsCheckingIn(prev => ({ ...prev, [passenger.id]: false }));
    }
  }, [ride.id, fetchPassengerLocations, toast, isCheckingIn]);

  // Handle dropping off a passenger
  const handleDropPassenger = useCallback(async (passenger) => {
    if (isCheckingOut[passenger.id]) return;
    setIsCheckingOut(prev => ({ ...prev, [passenger.id]: true }));
    try {
      console.log('Dropping off passenger:', passenger);
      const token = await AsyncStorage.getItem('userToken');
      let location = await Location.getCurrentPositionAsync({});

      const response = await axios.put(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/passenger/end',
        {
          rideId: ride.id,
          passengerJourneyId: passenger.passengerJourneyId,
          checkoutLatitude: location.coords.latitude,
          checkoutLongitude: location.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        // Update the ride state with the new passenger status
        setRide(prevRide => ({
          ...prevRide,
          passengers: prevRide.passengers.map(p =>
            p.id === passenger.id
              ? { ...p, checkoutStatus: true }
              : p
          )
        }));

        // Update droppedPassengers state
        setDroppedPassengers(prev => [...prev, passenger]);

        // Remove from checkedInPassengers
        setCheckedInPassengers(prev =>
          prev.filter(p => p.id !== passenger.id)
        );

        // Fetch updated passenger locations
        await fetchPassengerLocations();

        toast.show({
          title: 'Success',
          description: 'Passenger dropped off successfully!',
          status: 'success',
          placement: 'top',
        });
      }
    } catch (error) {
      console.error('Drop-off error:', error);
      Alert.alert('Error', 'Failed to drop off passenger. Please try again.');
    } finally {
      setIsCheckingOut(prev => ({ ...prev, [passenger.id]: false }));
    }
  }, [ride.id, fetchPassengerLocations, toast, isCheckingOut]);

  // Handle cancelling the ride offer
  const cancelRideAsDriver = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');

      Alert.alert(
        'Cancel Ride',
        'Are you sure you want to cancel this ride? This action cannot be undone.',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await axios.put(
                  `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/cancelRideByDriver?driverId=${driverId}&rideId=${ride.id}`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                console.log('Cancellation response:', response.data); // Log the response
                if (response.data) {
                  toast.show({
                    title: 'Ride Cancelled',
                    description: 'The ride has been cancelled successfully.',
                    status: 'success',
                    placement: 'top',
                  });
                  navigation.goBack();
                }
              } catch (error) {
                console.error('Error cancelling ride:', error.response ? error.response.data : error.message);
                toast.show({
                  title: 'Error',
                  description: error.response?.data?.message || 'Failed to cancel ride. Please try again.',
                  status: 'error',
                  placement: 'top',
                });
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in cancelRideAsDriver:', error);
      toast.show({
        title: 'Error',
        description: 'Failed to process request. Please try again.',
        status: 'error',
        placement: 'top',
      });
      setIsLoading(false);
    }
  };

  // Calculate ETA using HERE API
  const calculateETA = useCallback(async (origin, destination) => {
    try {
      const response = await axios.get(
        `https://router.hereapi.com/v8/routes`,
        {
          params: {
            transportMode: 'car',
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            return: 'summary',
            apiKey: 'EUfyvZrGNq5nhaO07DeHxfBehVrlqPIFTAqDY3em', // Replace with environment variable in production
          },
        }
      );

      if (
        response.data &&
        response.data.routes &&
        response.data.routes.length > 0 &&
        response.data.routes[0].sections &&
        response.data.routes[0].sections.length > 0
      ) {
        const durationInSeconds = response.data.routes[0].sections[0].summary.duration;
        const durationInMinutes = Math.round(durationInSeconds / 60);
        setEta(durationInMinutes);
      } else {
        setEta(null);
      }
    } catch (error) {
      console.error('Error calculating ETA:', error);
      setEta(null);
    }
  }, []);

  // useEffect to calculate ETA whenever origin or destination changes
  useEffect(() => {
    let originCoords, destinationCoords;

    if (subRideState === 'EN_ROUTE_PICKUP') {
      originCoords = formattedDriverLocation;
      destinationCoords = formattedPassengerPickup;
    } else if (subRideState === 'ON_THE_WAY') {
      originCoords = formattedDriverLocation;
      destinationCoords = formattedPassengerDrop;
    } else {
      return;
    }

    if (
      originCoords &&
      typeof originCoords.latitude === 'number' &&
      typeof originCoords.longitude === 'number' &&
      destinationCoords &&
      typeof destinationCoords.latitude === 'number' &&
      typeof destinationCoords.longitude === 'number'
    ) {
      calculateETA(originCoords, destinationCoords);
    }
  }, [driverLocation, formattedDriverLocation, formattedPassengerPickup, formattedPassengerDrop, subRideState, calculateETA]);

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

  // Render Coordinates Card
  const renderCoordinatesCard = useCallback(() => {
    // Early return if no subRideState
    if (!subRideState) return null;

    // Helper function to format coordinates safely
    const formatCoordinates = (coords) => {
      if (
        !coords ||
        typeof coords.latitude !== 'number' ||
        typeof coords.longitude !== 'number'
      ) {
        return 'Updating...';
      }
      return `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E`;
    };

    // Determine origin and destination based on ride state
    let origin = null;
    let destination = null;

    if (subRideState === 'EN_ROUTE_PICKUP') {
      origin = formattedDriverLocation;
      destination = formattedPassengerPickup;
    } else if (subRideState === 'ON_THE_WAY') {
      origin = formattedDriverLocation;
      destination = formattedPassengerDrop;
    }

    return (
      <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
        <HStack justifyContent="space-between" alignItems="center" mb="4">
          <Text fontSize="lg" fontWeight="bold" color="black">
            Ride Status
          </Text>
          <Badge
            variant="outline"
            colorScheme="coolGray"
            rounded="full"
            px="3"
            py="1"
            _text={{ color: 'white', fontSize: 'xs' }}
            borderColor="coolGray.400"
          >
            {subRideState.replace('_', ' ').toUpperCase()}
          </Badge>
        </HStack>
        <VStack space="4">
          <Box bg="gray.100" p="4" rounded="lg">
            <HStack justifyContent="space-between" mb="2">
              <Text fontSize="sm" fontWeight="medium">
                Driver's Location
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {formatCoordinates(origin)}
              </Text>
            </HStack>
            <HStack justifyContent="space-between" mb="2">
              <Text fontSize="sm" fontWeight="medium">
                {subRideState === 'EN_ROUTE_PICKUP' ? 'Pickup Location' : 'Drop Location'}
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {formatCoordinates(destination)}
              </Text>
            </HStack>
            <HStack justifyContent="space-between">
              <Text fontSize="sm" fontWeight="medium">
                ETA
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                {eta ? `${eta} mins` : 'Calculating...'}
              </Text>
            </HStack>
          </Box>
        </VStack>
      </Box>
    );
  }, [
    subRideState,
    formattedDriverLocation,
    formattedPassengerPickup,
    formattedPassengerDrop,
    eta,
  ]);

  // Render ride details section
  const renderRideDetails = useCallback(() => (
    <LinearGradient
      colors={['#000000', '#1a1a1a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientCard}
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
            {ride.source || 'Unknown'}
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
            {ride.destination || 'Unknown'}
          </Text>
        </VStack>
      </HStack>
      <HStack justifyContent="space-between" mt="2">
        <VStack>
          <Text color="gray.400" fontSize="xs" fontWeight="medium">
            DATE
          </Text>
          <Text color="white" fontSize="md" fontWeight="semibold">
            {ride.rideDate ? new Date(ride.rideDate).toLocaleDateString() : 'N/A'}
          </Text>
        </VStack>
        <VStack>
          <Text color="gray.400" fontSize="xs" fontWeight="medium">
            DEPARTURE
          </Text>
          <Text color="white" fontSize="md" fontWeight="semibold">
            {ride.rideScheduledStartTime
              ? new Date(ride.rideScheduledStartTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              : ''}
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
            {rideState.replace('_', ' ').toUpperCase()}
          </Badge>
        </VStack>
      </HStack>
    </LinearGradient>
  ), [ride.source, ride.destination, ride.rideDate, ride.rideScheduledStartTime, rideState]);

  // Render driver card section
  const renderDriverCard = useCallback(() => (
    <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
      {/* Driver Info Section */}
      <HStack alignItems="center" space="4" mb="6">
        <Avatar size="lg" source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}>
          <Text>
            {ride.driverDetails.driverFirstName
              ? ride.driverDetails.driverFirstName[0].toUpperCase()
              : 'D'}
          </Text>
        </Avatar>
        <VStack>
          <Text fontSize="lg" fontWeight="bold" color="black">
            {ride.driverDetails.driverFirstName
              ? `${ride.driverDetails.driverFirstName} ${ride.driverDetails.driverLastName}`
              : 'John Doe'}{' '}
            (You)
          </Text>
          <HStack alignItems="center">
            <Icon as={Ionicons} name="star" size="sm" color="yellow.400" />
            <Text fontSize="md" color="coolGray.600" ml="1">
              {typeof ride.driverDetails.avgRating === 'number'
                ? ride.driverDetails.avgRating.toFixed(1)
                : '0.0'}{' '}
              ({typeof ride.driverDetails.ratingCount === 'number'
                ? ride.driverDetails.ratingCount
                : '0'} rides)
            </Text>
          </HStack>
        </VStack>
      </HStack>

      {/* Vehicle Details Section */}
      <VStack space="4">
        {/* Row 1 */}
        <HStack justifyContent="space-between">
          <VStack flex={1} mr="4">
            <Text fontSize="xs" color="gray.400" fontWeight="medium">
              VEHICLE
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="black" mt="1">
              {ride.vehicleDto.model || 'N/A'}
            </Text>
          </VStack>
          <VStack flex={1}>
            <Text fontSize="xs" color="gray.400" fontWeight="medium">
              PLATE NUMBER
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="black" mt="1">
              {ride.vehicleDto.vehicleNumber || 'N/A'}
            </Text>
          </VStack>
        </HStack>

        {/* Row 2 */}
        <HStack justifyContent="space-between">
          <VStack flex={1} mr="4">
            <Text fontSize="xs" color="gray.400" fontWeight="medium">
              COLOR
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="black" mt="1">
              {ride.vehicleDto.color || 'N/A'}
            </Text>
          </VStack>
          <VStack flex={1}>
            <Text fontSize="xs" color="gray.400" fontWeight="medium">
              SEATS OFFERED
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="black" mt="1">
              {typeof ride.vehicleDto.vehicleCapacity === 'number'
                ? ride.vehicleDto.vehicleCapacity
                : 'N/A'}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  ), [ride.driverDetails, ride.vehicleDto]);

  // Render content based on ride state
  const renderStateContent = useCallback(() => {

    switch (rideState) {
      case RideStates.WAITING_FOR_REQUESTS:
        return (
          <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
            <HStack alignItems="center" mb="4">
              <Icon as={Feather} name="alert-circle" size="6" color="yellow.600" mr="2" />
              <Text fontSize="lg" fontWeight="bold" color="black">
                Awaiting Passenger Requests
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.600" mb="4">
              Your ride offer is live. We'll notify you as soon as passengers request to join your
              ride.
            </Text>
            <Progress value={33} colorScheme="yellow" mb="4" />
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Average wait time: 5-10 minutes
            </Text>
            <Button
              onPress={cancelRideAsDriver}
              bg="gray.400"
              _text={{ color: 'white', fontWeight: 'bold' }}
              rounded="full"
              mt="4"
            >
              Cancel Ride Offer
            </Button>
          </Box>
        );

      case RideStates.RECEIVING_REQUESTS:
        // Filter only PENDING requests
        const pendingRequests = Object.values(allRequests)
          .filter((req) => req.status === 'PENDING')
          .sort((a, b) => b.timestamp - a.timestamp);
        return (
          <>
            {/* Pending Requests Section */}
            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="users" size="6" color="blue.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Passenger Requests Received
                </Text>
              </HStack>
              {pendingRequests.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  No pending requests at the moment.
                </Text>
              ) : (
                <VStack space="3">
                  {pendingRequests.map((request) => (
                    <Box
                      key={request.id}
                      bg="gray.50"
                      p="4"
                      rounded="xl"
                      borderWidth={1}
                      borderColor="gray.200"
                      shadow="1"
                      mb={2}
                    >
                      <HStack space="3" alignItems="center" justifyContent="space-between">
                        <HStack space="3" alignItems="center">
                          <Avatar bg="gray.800" size="md">
                            <Text>
                              {request.name ? request.name[0].toUpperCase() : 'P'}
                            </Text>
                          </Avatar>
                          <Text fontSize="md" fontWeight="600" color="gray.800">
                            {request.name || 'Passenger'}
                          </Text>
                        </HStack>
                        <HStack space="2">
                          <Pressable
                            style={[
                              buttonStyles.actionButton.base,
                              buttonStyles.actionButton.secondary,
                              isRejecting[request.id] && { opacity: 0.7 }
                            ]}
                            onPress={() => handleRejectRequest(request)}
                            disabled={isRejecting[request.id]}
                          >
                            <HStack space={2} alignItems="center">
                              {isRejecting[request.id] ? (
                                <Spinner color="black" size="sm" />
                              ) : (
                                <Icon
                                  as={Ionicons}
                                  name="close"
                                  size={buttonStyles.iconStyle.size}
                                  color="black"
                                />
                              )}
                            </HStack>
                          </Pressable>
                          <Pressable
                            style={[
                              buttonStyles.actionButton.base,
                              buttonStyles.actionButton.primary,
                              isAccepting[request.id] && { opacity: 0.7 }
                            ]}
                            onPress={() => handleAcceptRequest(request)}
                            disabled={isAccepting[request.id]}
                          >
                            <HStack space={2} alignItems="center">
                              {isAccepting[request.id] ? (
                                <Spinner color="white" size="sm" />
                              ) : (
                                <Icon
                                  as={Ionicons}
                                  name="checkmark"
                                  size={buttonStyles.iconStyle.size}
                                  color="white"
                                />
                              )}
                            </HStack>
                          </Pressable>
                        </HStack>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>

            {/* Accepted Passengers Section */}
            {acceptedPassengers.length > 0 && (
              <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
                <HStack alignItems="center" mb="4">
                  <Icon as={Feather} name="check-circle" size="6" color="green.600" mr="2" />
                  <Text fontSize="lg" fontWeight="bold" color="black">
                    Accepted Passengers
                  </Text>
                </HStack>
                <VStack space="3">
                  {acceptedPassengers.map((passenger) => (
                    <Box
                      key={passenger.id}
                      bg="gray.50"
                      p="4"
                      rounded="xl"
                      borderWidth={1}
                      borderColor="gray.200"
                      shadow="1"
                      mb={2}
                    >
                      <HStack space="3" alignItems="center" justifyContent="space-between">
                        <HStack space="3" alignItems="center">
                          <Avatar bg="gray.800" size="md">
                            <Text>
                              {passenger.name ? passenger.name[0].toUpperCase() : 'P'}
                            </Text>
                          </Avatar>
                          <VStack>
                            <Text fontSize="md" fontWeight="600" color="gray.800">
                              {passenger.name || 'Passenger'}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              Pickup: {passenger.startLocation || 'Unknown'}
                            </Text>
                          </VStack>
                        </HStack>

                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </>
        );

      case RideStates.READY_TO_START:

        return (
          <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
            <HStack alignItems="center" mb="4">
              <Icon as={Feather} name="check-circle" size="6" color="green.600" mr="2" />
              <Text fontSize="lg" fontWeight="bold" color="black">
                Passengers Accepted
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.600" mb="4">
              You have accepted passenger requests. Prepare to start your journey and pick
              up your passengers.
            </Text>
            <VStack space="3">
              {acceptedPassengers.map((passenger) => (
                <Box
                  key={passenger.id}
                  bg="gray.50"
                  p="4"
                  rounded="xl"
                  borderWidth={1}
                  borderColor="gray.200"
                  shadow="1"
                  mb={2}
                >
                  <HStack space="3" alignItems="center" justifyContent="space-between">
                    <HStack space="3" alignItems="center">
                      <Avatar bg="gray.800" size="md">
                        <Text>
                          {ride.passengers.find(p => p.passengerId === passenger.passengerId)?.firstName?.[0] || 'P'}
                        </Text>
                      </Avatar>
                      <VStack>
                        <Text fontSize="md" fontWeight="600" color="gray.800">
                          {ride.passengers.find(p => p.passengerId === passenger.passengerId)?.firstName || 'Passenger'}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Pickup: {ride.passengers.find(p => p.passengerId === passenger.passengerId)?.startLocation || 'Unknown'}
                        </Text>
                      </VStack>
                    </HStack>
                  </HStack>

                  {/* Contact Buttons */}
                  <HStack space="2" mt="6">
                    <Button
                      flex={1}
                      onPress={() => callPassenger(passenger)}
                      leftIcon={<Icon as={Ionicons} name="call" size="sm" color="white" />}
                      bg="black"
                      _text={{ color: 'white' }}
                      rounded="full"
                    >
                      Call
                    </Button>
                    <Button
                      flex={1}
                      onPress={() => messagePassenger(passenger)}
                      leftIcon={<Icon as={Ionicons} name="chatbubble" size="sm" color="black" />}
                      bg="coolGray.100"
                      _text={{ color: 'black' }}
                      rounded="full"
                    >
                      Message
                    </Button>
                  </HStack>
                    </Box>
                  ))}
            </VStack>
            <Button
              onPress={handleStartRide}
              bg="black"
              _text={{ color: 'white', fontWeight: 'bold' }}
              rounded="full"
              mt="4"
              isDisabled={isStartingJourney}
            >
              <HStack space={2} alignItems="center">
                {isStartingJourney ? (
                  <>
                    <Spinner size="sm" color="white" />
                    <Text color="white" fontWeight="bold">Starting...</Text>
                  </>
                ) : (
                  <Text color="white" fontWeight="bold">Start Journey</Text>
                )}
              </HStack>
            </Button>
          </Box>
        );

      case RideStates.IN_PROGRESS:
        // Determine if all passengers have dropped off
        const allPassengersDroppedOff =
          acceptedPassengers.length > 0 &&
          droppedPassengers.length === acceptedPassengers.length;

        return (
          <>
            {/* Only show map if checkout hasn't succeeded */}
            {/* {!checkoutSuccess && ( */}
            <Box bg="white" rounded="lg" shadow="2" p="4" mb="4" h={300}>
              <Text fontSize="lg" fontWeight="bold" mb="2">
                Driver's Location
              </Text>
              <MapScreen
                driverLocation={driverLocation}
                passengerPickupLocation={formattedPassengerPickup}
                passengerDropLocation={formattedPassengerDrop}
                acceptedPassengers={acceptedPassengers}
                rideState={rideState}
                ride={ride}
                onLocationSelect={handleLocationSelect}
              />
            </Box>
            {/* )} */}

            <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
              <HStack alignItems="center" mb="4">
                <Icon as={Feather} name="navigation" size="6" color="blue.600" mr="2" />
                <Text fontSize="lg" fontWeight="bold" color="black">
                  Journey in Progress
                </Text>
              </HStack>
              <Text fontSize="sm" color="gray.600" mb="4">
                Pick up your passengers to start the journey.
              </Text>
              <VStack space="3">
                {acceptedPassengers.map((passenger) => (
                  <Box
                    key={passenger.id}
                    bg="gray.50"
                    p="4"
                    rounded="xl"
                    borderWidth={1}
                    borderColor="gray.200"
                    shadow="1"
                    mb={2}
                  >
                    <HStack space="3" alignItems="center" justifyContent="space-between">
                      <HStack space="3" alignItems="center">
                        <Avatar bg="gray.800" size="md">
                          <Text>
                            {passenger.name ? passenger.name[0].toUpperCase() : 'P'}
                          </Text>
                        </Avatar>
                        <VStack>
                          <Text fontSize="md" fontWeight="600" color="gray.800">
                            {passenger.name || 'Passenger'}
                          </Text>
                          {/* <Text fontSize="sm" color="gray.500">
                            Status:{' '}
                            {checkedInPassengers.find((p) => p.id === passenger.id)
                              ? 'Checked In'
                              : 'Waiting for Pickup'}
                          </Text> */}
                        </VStack>
                      </HStack>
                      
                      <VStack space="4">
                        {ride.passengers.map((passenger) => (
                          // Only render Box if there's a button to show (either check-in or drop-off)
                          (!passenger.checkinStatus || !passenger.checkoutStatus) && (
                            <Box key={passenger.id} padding="4" borderWidth="1" borderColor="gray.300" rounded="md">
                              <HStack space="2">
                                {/* Check if passenger has checked in */}
                                {!passenger.checkinStatus ? (
                                  // Show Green Check-in button
                                  <Pressable
                                    style={[
                                      buttonStyles.actionButton.base,
                                      { backgroundColor: '#22c55e', borderColor: '#22c55e' },
                                      isCheckingIn[passenger.id] && { opacity: 0.7 }
                                    ]}
                                    onPress={() => handleCheckIn(passenger)}
                                    disabled={isCheckingIn[passenger.id]}
                                  >
                                    <HStack space={2} alignItems="center">
                                      {isCheckingIn[passenger.id] ? (
                                        <Spinner color="white" size="sm" />
                                      ) : (
                                        <Icon
                                          as={Ionicons}
                                          name="log-in"
                                          size={buttonStyles.iconStyle.size}
                                          color="white"
                                        />
                                      )}
                                    </HStack>
                                  </Pressable>
                                ) : (
                                  // Show Red Drop-off button
                                  <Pressable
                                    style={[
                                      buttonStyles.actionButton.base,
                                      { backgroundColor: '#ef4444', borderColor: '#ef4444' },
                                      isCheckingOut[passenger.id] && { opacity: 0.7 }
                                    ]}
                                    onPress={() => handleDropPassenger(passenger)}
                                    disabled={isCheckingOut[passenger.id]}
                                  >
                                    <HStack space={2} alignItems="center">
                                      {isCheckingOut[passenger.id] ? (
                                        <Spinner color="white" size="sm" />
                                      ) : (
                                        <Icon
                                          as={Ionicons}
                                          name="log-out"
                                          size={buttonStyles.iconStyle.size}
                                          color="white"
                                        />
                                      )}
                                    </HStack>
                                  </Pressable>
                                )}
                              </HStack>
                            </Box>
                          )
                        ))}

                        {/* Show End Journey button only if all passengers are checked in and dropped off */}
                        {/* {ride.passengers.every(
                          (passenger) => passenger.checkinStatus && passenger.checkoutStatus
                        ) && (
                            <Button
                              onPress={handleEndRide}
                              bg="black"
                              _text={{ color: 'white', fontWeight: 'bold' }}
                              rounded="full"
                              mt="4"
                            >
                              End Journey
                            </Button>
                          )} */}
                      </VStack>

                    </HStack>
                    {/* Contact Buttons */}
                    <HStack space="2" mt="6">
                      <Button
                        flex={1}
                        onPress={() => callPassenger(passenger)}
                        leftIcon={<Icon as={Ionicons} name="call" size="sm" color="white" />}
                        bg="black"
                        _text={{ color: 'white' }}
                        rounded="full"
                      >
                        Call
                      </Button>
                      <Button
                        flex={1}
                        onPress={() => messagePassenger(passenger)}
                        leftIcon={<Icon as={Ionicons} name="chatbubble" size="sm" color="black" />}
                        bg="coolGray.100"
                        _text={{ color: 'black' }}
                        rounded="full"
                      >
                        Message
                      </Button>
                    </HStack>
                  </Box>

                  
                ))}
              </VStack>
              {/* Conditionally render End Journey button */}
              {/* {!passenger.checkinStatus  && (
                <Button
                  onPress={handleEndRide}
                  bg="black"
                  _text={{ color: 'white', fontWeight: 'bold' }}
                  rounded="full"
                  mt="4"
                >
                  End Journey
                </Button>
              )} */}
              {ride.passengers &&
                ride.passengers.length > 0 &&
                ride.passengers.every(
                  (passenger) => passenger.checkinStatus && passenger.checkoutStatus
                ) && (
                  <View style={styles.sliderWrapper}>
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderTrack}>
                        <Animated.View
                          style={[
                            styles.sliderKnob,
                            { transform: [{ translateX: position }] },
                          ]}
                          {...panResponder.panHandlers}
                        >
                          <MaterialIcons name="navigation" size={20} color="white" />
                        </Animated.View>
                        <Text style={styles.sliderText}>Slide to End Journey</Text>
                      </View>
                    </View>
                  </View>
                )}

            </Box>
          </>
        );

      case RideStates.COMPLETED:
        return renderJourneyCompleted();

      default:
        return null;
    }
  }, [
    rideState,
    allRequests,
    acceptedPassengers,
    handleAcceptRequest,
    handleRejectRequest,
    checkedInPassengers,
    droppedPassengers,
    toast,
    handleEndRide,
    handleCheckIn,
    handleDropPassenger,
    renderCoordinatesCard,
    ride.checkinStatus,
    ride.id,
    isStartingJourney,
    isCheckingIn,
    isCheckingOut,
    isEndingJourney,
  ]);

  // Render journey completed section
  const renderJourneyCompleted = useCallback(() => {
    const startCoords = {
      latitude: ride.sourceLatitude, // Assuming these are available in the ride object
      longitude: ride.sourceLongitude,
    };
    const endCoords = {
      latitude: ride.destinationLatitude, // Assuming these are available in the ride object
      longitude: ride.destinationLongitude,
    };
    const totalDistance = calculateDistance(startCoords, endCoords).toFixed(2); // Calculate distance

    return (
      <Box bg="white" rounded="xl" p="6" shadow="2" mb="4">
        <HStack alignItems="center" mb="4">
          <Icon as={Feather} name="check-circle" size="6" color="purple.600" mr="2" />
          <Text fontSize="lg" fontWeight="bold" color="black">
            Journey Completed
          </Text>
        </HStack>
        <Text fontSize="sm" color="gray.600" mb="4">
          Great job! You've successfully completed your journey. Here's a summary of your
          trip.
        </Text>
        <Box bg="gray.50" p="4" rounded="lg" mb="4">
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.500">
              Total Distance
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              {totalDistance} km
            </Text>
          </HStack>
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.500">
              Duration
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              {calculateDuration(ride.rideStartTime, ride.rideEndTime)}
            </Text>
          </HStack>
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.500">
              Passengers
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              {typeof acceptedPassengers.length === 'number' ? acceptedPassengers.length : 'N/A'}
            </Text>
          </HStack>
          <HStack justifyContent="space-between">
            <Text fontSize="sm" color="gray.500">
              Earnings
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              {typeof ride.price === 'number' ? `${ride.price.toFixed(2)}` : 'N/A'}
            </Text>
          </HStack>
        </Box>

        {/* Add Passengers List */}
        <Text fontSize="md" fontWeight="bold" color="black" mb="3">
          Passengers
        </Text>
        <VStack space="3" mb="4">
          {acceptedPassengers.map((passenger) => (
            <Box
              key={passenger.id}
              bg="gray.100"
              p="3"
              rounded="lg"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <HStack space="3" alignItems="center">
                <Avatar bg="blue.500">
                  <Text>
                    {passenger.name ? passenger.name[0].toUpperCase() : 'P'}
                  </Text>
                </Avatar>
                <VStack>
                  <Text fontWeight="bold">{passenger.name || 'Passenger'}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Journey Completed
                  </Text>
                </VStack>
              </HStack>
              <Badge colorScheme="green" variant="subtle" rounded="full" px="2">
                Completed
              </Badge>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  }, [ride, acceptedPassengers, navigation]);

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

  // Loading state
  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" p={4}>
        <Text fontSize="lg" color="red.500" textAlign="center">
          {error}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  // Main render
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderRideDetails()}
      {renderStateContent()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1, // Ensures content can grow and ScrollView can scroll
  },
  gradientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderWrapper: {
      marginTop: 16,
      alignItems: 'center',
    },
    sliderContainer: {
      width: 300,
      alignItems: 'center',
    },
    sliderTrack: {
      width: 300,
      height: 60,
      backgroundColor: '#e0e0e0',
      borderRadius: 30,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    sliderKnob: {
      width: 60,
      height: 60,
      backgroundColor: 'black',
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      zIndex: 2,
    },
    sliderText: {
      position: 'absolute',
      width: '100%',
      textAlign: 'center',
      color: '#666',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
  

export default ManageRideScreen;