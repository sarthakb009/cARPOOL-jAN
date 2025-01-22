// // // MapScreen.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useToast } from 'native-base';
import { Image } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Searchbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
// **Note:** Avoid hardcoding API keys in production environments.
// For demonstration purposes, API keys are kept as constants.
const OLA_API_KEY = 'BLiCQHHuN3GFygSHe27hv4rRBpbto7K35v7HXYtANC8';
const REVERSE_GEOCODE_API_KEY = 'EUfyvZrGNq5nhaO07DeHxfBehVrlqPIFTAqDY3em';

const MapScreen = ({
  route = {},
  navigation,
  driverLocation,
  passengerPickupLocation,
  passengerDropLocation,
  acceptedPassengers,
  rideState,
  ride,
  source,
  hideNavigationButton = false,
  shouldFetchRoute = false,
}) => {
  const toast = useToast();
  const mapRef = useRef(null);

  // State declarations
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addressName, setAddressName] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [distanceToNextStep, setDistanceToNextStep] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [userHeading, setUserHeading] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRouteSegment, setCurrentRouteSegment] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showRouteInfo, setShowRouteInfo] = useState(false);

  // Console logging useEffect for debugging
  useEffect(() => {
    const driverCoords = driverLocation
      ? {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      }
      : null;
    console.log('MapScreen Props ==>:');
    console.log('Driver Location:  ==>', driverCoords);
    console.log('Source Location:  ==>', source);
    console.log('Passenger Pickup Location:  ==>', passengerPickupLocation);
    console.log('Passenger Drop Location:  ==>', passengerDropLocation);
    console.log('Accepted Passengers:  ==>', acceptedPassengers);
    console.log('Ride State:  ==>', rideState);
    console.log('Ride:  ==>', ride);

    if (source === 'RideDetailsScreen') {
      console.log('Fetching route with working passenger:', driverLocation, passengerDropLocation);
      fetchRoute(driverLocation, passengerDropLocation);
    }
  }, [
    driverLocation,
    passengerPickupLocation,
    passengerDropLocation,
    acceptedPassengers,
    rideState,
    ride,
  ]);

  // Determine if the map is in select mode based on navigation params
  useEffect(() => {
    const source = route.params?.source || 'Unknown';
    console.log(`MapScreen opened from: ${source}`);
    setIsSelectMode(source === 'SelectLocationScreen');
  }, [route.params]);

  // Fetch route whenever not in select mode and pickup/drop locations change
  useEffect(() => {
    if (!isSelectMode && passengerPickupLocation && passengerDropLocation) {
      fetchRoute();
    }
  }, [isSelectMode, passengerPickupLocation, passengerDropLocation]);

  // Function to reverse geocode coordinates to an address
  const reverseGeocode = async (latitude, longitude) => {
    setIsFetchingAddress(true);
    try {
      const response = await axios.get(
        `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${REVERSE_GEOCODE_API_KEY}`
      );

      if (response.data.status === 'ok' && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
        };
      } else {
        console.error('Error in reverse geocoding:', response.data.error_message);
        return {
          formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          addressComponents: [],
        };
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed. Please check your API key.');
      }
      return {
        formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        addressComponents: [],
      };
    } finally {
      setIsFetchingAddress(false);
    }
  };

  // Function to validate and get a fallback location if necessary
  const getValidLocation = (pickupLocation, dropLocation) => {
    const defaultLocation = {
      latitude: 12.9352,
      longitude: 77.6245,
    };

    const isValidLocation = (location) => {
      return (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        location.latitude !== null &&
        location.longitude !== null
      );
    };

    if (isValidLocation(pickupLocation)) {
      return pickupLocation;
    }

    if (isValidLocation(dropLocation)) {
      return dropLocation;
    }

    return defaultLocation;
  };

  // Determine origin and destination based on ride state
  const origin = rideState === 'IN_PROGRESS' && !ride.checkinStatus
    ? passengerPickupLocation
    : driverLocation || {
      latitude: 12.9166,
      longitude: 77.6101,
    };

  const destination = getValidLocation(passengerPickupLocation, passengerDropLocation);

  // Initial region for the map
  const initialRegion = {
    ...origin,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Function to fetch route between origin and destination
  const fetchRoute = async (origin, destination) => {
    console.log('first')
    try {
      const response = await axios.post(
        `https://api.olamaps.io/routing/v1/directions?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&api_key=EUfyvZrGNq5nhaO07DeHxfBehVrlqPIFTAqDY3em`
      );

      if (response.data && response.data.routes && response.data.routes[0]) {
        const route = response.data.routes[0];
        if (route.legs && route.legs[0]) {
          setRouteInfo({
            distance: route.legs[0].readable_distance,
            duration: route.legs[0].readable_duration
          });
        }
        
        if (route.overview_polyline) {
          const decodedCoordinates = decodePolyline(route.overview_polyline);
          setRouteCoordinates(decodedCoordinates);
          fitMapToCoordinates(decodedCoordinates);
        }
      } else {
        console.error('Invalid response structure:', response.data);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Function to decode polyline string into coordinates array
  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      const position = {
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      };

      poly.push(position);
    }

    return poly;
  };

  // Function to fit map view to the route coordinates
  const fitMapToCoordinates = (coordinates) => {
    if (mapRef.current && coordinates.length > 0) {
      // Calculate the center point
      const centerLat = (coordinates[0].latitude + coordinates[coordinates.length - 1].latitude) / 2;
      const centerLng = (coordinates[0].longitude + coordinates[coordinates.length - 1].longitude) / 2;

      // Calculate appropriate zoom level based on distance
      const latDelta = Math.abs(coordinates[0].latitude - coordinates[coordinates.length - 1].latitude) * 1.5;
      const lngDelta = Math.abs(coordinates[0].longitude - coordinates[coordinates.length - 1].longitude) * 1.5;

      
    }
  };

  // Add this helper function to calculate bearing between two points
  const calculateBearing = (startLat, startLng, destLat, destLng) => {
    startLat = startLat * Math.PI / 180;
    startLng = startLng * Math.PI / 180;
    destLat = destLat * Math.PI / 180;
    destLng = destLng * Math.PI / 180;

    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
              Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    if (bearing < 0) {
      bearing += 360;
    }
    return bearing;
  };

  // Handle map region changes (used in select mode)
  const handleMapChange = async () => {
    if (mapRef.current && isSelectMode) {
      try {
        const camera = await mapRef.current.getCamera();
        const { latitude, longitude } = camera.center;
        setSelectedLocation({ latitude, longitude });

        // Fetch address for the center point
        const response = await axios.get(
          `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${REVERSE_GEOCODE_API_KEY}`
        );

        if (response.data.status === 'ok' && response.data.results.length > 0) {
          const result = response.data.results[0];
          setAddressName(result.formatted_address);
        } else {
          setAddressName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        setAddressName('Unable to fetch address');
      }
    }
  };

  // Handle confirmation of selected location in select mode
  const handleConfirm = () => {
    if (route.params && route.params.onLocationSelect && selectedLocation) {
      const locationData = {
        address: addressName,
        coordinates: {
          lat: selectedLocation.latitude,
          lng: selectedLocation.longitude
        }
      };
      
      route.params.onLocationSelect(locationData);
      navigation.goBack();
    } else {
      toast.show({
        title: 'Selection Error',
        description: 'No location selected to confirm.',
        status: 'warning',
        placement: 'top',
      });
    }
  };

  // Handle zoom in and zoom out actions
  const handleZoom = async (zoomIn) => {
    if (mapRef.current) {
      try {
        const camera = await mapRef.current.getCamera();
        const newZoomLevel = zoomIn
          ? Math.min(camera.zoom + 1, 20) // Max zoom level is 20
          : Math.max(camera.zoom - 1, 1); // Min zoom level is 1

        mapRef.current.animateCamera(
          {
            center: camera.center,
            zoom: newZoomLevel,
          },
          { duration: 300 }
        );

        setZoomLevel(newZoomLevel);
      } catch (error) {
        console.error('Error handling zoom:', error);
        toast.show({
          title: 'Zoom Error',
          description: 'Failed to adjust zoom level. Please try again.',
          status: 'error',
          placement: 'top',
        });
      }
    }
  };

  // Fetch route on component mount if not in select mode
  useEffect(() => {
    if (!isSelectMode && driverLocation) {
      // Get active check-in passenger (if any)
      const checkInPassenger = ride?.passengers?.find(p => {
        const checkInButton = !p.checkinStatus;
        return checkInButton;
      });

      // Get active check-out passenger (if any)
      const checkOutPassenger = ride?.passengers?.find(p => {
        const checkOutButton = p.checkinStatus && !p.checkoutStatus;
        return checkOutButton;
      });

      // Check end ride status
      const isEndRideActive = rideState === 'IN_PROGRESS' && 
                             ride?.passengers?.every(p => p.checkinStatus && p.checkoutStatus);

      let destination = null;

      // Case 1: Check-in is active (route to pickup location)
      if (checkInPassenger) {
        destination = {
          latitude: checkInPassenger.startLatitude,
          longitude: checkInPassenger.startLongitude
        };
        console.log('Setting route to pickup location for passenger:', {
          passengerId: checkInPassenger.passengerId,
          destination
        });
      }
      // Case 2: Check-out is active (route to drop-off location)
      else if (checkOutPassenger) {
        destination = {
          latitude: checkOutPassenger.endLatitude,
          longitude: checkOutPassenger.endLongitude
        };
        console.log('Setting route to drop-off location for passenger:', {
          passengerId: checkOutPassenger.passengerId,
          destination
        });
      }
      // Case 3: End Ride is active (route to final destination)
      else if (isEndRideActive) {
        destination = {
          latitude: ride.destinationLatitude,
          longitude: ride.destinationLongitude
        };
        console.log('Setting route to final destination:', destination);
      }

      // If we have a valid destination, fetch the route
      if (destination) {
        console.log('Fetching route:', {
          origin: driverLocation,
          destination,
          activeState: {
            hasCheckIn: !!checkInPassenger,
            hasCheckOut: !!checkOutPassenger,
            isEndRideActive
          }
        });
        console.log('Fetching route with working:', driverLocation, destination);
        fetchRoute(driverLocation, destination);
      }
    }
  }, [
    isSelectMode,
    driverLocation,
    rideState,
    ride?.passengers,
    ride?.destinationLatitude,
    ride?.destinationLongitude
  ]);

  // Function to render markers based on ride state
  const renderMarkers = () => {
    if (isSelectMode) return null;

    return (
      <>
        {driverLocation ? (
          <Marker.Animated
            coordinate={driverLocation}
            title="Driver"
            description="Driver's current location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: '#2563eb',
                borderRadius: 10,
                borderWidth: 3,
                borderColor: 'white',
              }}
            />
          </Marker.Animated>
        ) : null}

        {rideState === 'IN_PROGRESS' && !ride.checkinStatus && passengerPickupLocation ? (
          <Marker
            coordinate={passengerPickupLocation}
            title="Pickup"
            description="Passenger pickup location"
          >
            <FontAwesome5 
              name="map-marker-alt"
              size={40}
              color="#22c55e"
            />
          </Marker>
        ) : null}

        {rideState === 'IN_PROGRESS' && 
         ride?.passengers?.every(p => p.checkinStatus && p.checkoutStatus) && 
         passengerDropLocation ? (
          <Marker
            coordinate={passengerDropLocation}
            title="Drop-off"
            description="Passenger drop-off location"
          >
            <FontAwesome5 
              name="map-marker-alt"
              size={40}
              color="#8e0dd9"
            />
          </Marker>
        ) : null}

        {rideState === 'IN_PROGRESS' && 
         ride?.passengers?.every(p => p.checkinStatus && p.checkoutStatus) && 
         ride?.destinationLatitude && ride?.destinationLongitude ? (
          <Marker
            coordinate={{
              latitude: ride.destinationLatitude,
              longitude: ride.destinationLongitude
            }}
            title="Driver Destination"
            description={ride.destination || "Driver's final destination"}
          >
            <FontAwesome5 
              name="flag-checkered"
              size={40}
              color="#ef4444"
            />
          </Marker>
        ) : null}
      </>
    );
  };

  // Add this new function to fetch detailed route instructions
  const fetchDetailedRoute = async () => {
    console.log('second')
    try {
      const response = await axios.post(
        `https://api.olamaps.io/routing/v1/directions?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&api_key=EUfyvZrGNq5nhaO07DeHxfBehVrlqPIFTAqDY3em&steps=true`
      );

      if (response.data && response.data.routes && response.data.routes[0]) {
        const route = response.data.routes[0];
        setNavigationSteps(route.legs[0].steps);
        setEstimatedTime(route.legs[0].duration.text);
        updateCurrentStep(0);

        // Set initial polyline
        if (route.overview_polyline) {
          const decodedCoordinates = decodePolyline(route.overview_polyline);
          setRouteCoordinates(decodedCoordinates);
          fitMapToCoordinates(decodedCoordinates);
        }
      }
    } catch (error) {
      console.error('Error fetching detailed route:', error);
      toast.show({
        title: 'Navigation Error',
        description: 'Failed to fetch navigation details',
        status: 'error',
        placement: 'top',
      });
    }
  };

  // Add function to update current navigation step
  const updateCurrentStep = (stepIndex) => {
    if (navigationSteps[stepIndex]) {
      setCurrentStep(navigationSteps[stepIndex]);
      // Update the polyline to show only the current step
      if (navigationSteps[stepIndex].polyline) {
        const stepCoordinates = decodePolyline(navigationSteps[stepIndex].polyline);
        setRouteCoordinates(stepCoordinates);
      }
    }
  };

  // Add function to calculate distance to next maneuver
  const calculateDistanceToNextStep = useCallback((userLocation) => {
    if (currentStep && userLocation) {
      const distance = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        currentStep.end_location.lat,
        currentStep.end_location.lng
      );
      setDistanceToNextStep(distance);
    }
  }, [currentStep]);

  // Add this new component for the navigation overlay
  const NavigationOverlay = () => (
    <View style={styles.navigationOverlay}>
      <View style={styles.navigationHeader}>
        <Text style={styles.estimatedTime}>{estimatedTime}</Text>
        <TouchableOpacity 
          style={styles.exitNavButton}
          onPress={() => setNavigationMode(false)}
        >
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {currentStep && (
        <View style={styles.navigationInstruction}>
          <MaterialIcons 
            name={getNavigationIcon(currentStep.maneuver)} 
            size={32} 
            color="white" 
          />
          <View style={styles.instructionTextContainer}>
            <Text style={styles.instructionText}>
              {currentStep.html_instructions}
            </Text>
            {distanceToNextStep && (
              <Text style={styles.distanceText}>
                {`${distanceToNextStep.toFixed(0)} m`}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );

  // Add this function to get appropriate icon for navigation step
  const getNavigationIcon = (maneuver) => {
    switch (maneuver) {
      case 'turn-right': return 'turn-right';
      case 'turn-left': return 'turn-left';
      case 'straight': return 'straight';
      case 'roundabout-right': return 'rotate-right';
      case 'roundabout-left': return 'rotate-left';
      default: return 'arrow-upward';
    }
  };

  // Add this function to start navigation mode
  const startNavigation = async () => {
    try {
      // Request location permissions if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.show({
          title: 'Permission Denied',
          description: 'Location permission is required for navigation',
          status: 'error',
        });
        return;
      }

      // Start location and heading updates
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5, // Update every 5 meters
          timeInterval: 1000, // Update every second
        },
        (location) => {
          updateNavigationState(location);
        }
      );

      // Start heading updates
      Location.watchHeadingAsync((heading) => {
        setUserHeading(heading.magHeading);
      });

      setIsNavigating(true);
      fetchDetailedRoute();
    } catch (error) {
      console.error('Error starting navigation:', error);
      toast.show({
        title: 'Navigation Error',
        description: 'Failed to start navigation mode',
        status: 'error',
      });
    }
  };

  // Add this function to update navigation state
  const updateNavigationState = async (location) => {
    if (!mapRef.current || !routeCoordinates.length) return;

    const { latitude, longitude } = location.coords;
    const currentPosition = { latitude, longitude };

    // Find the nearest point on the route
    const nearestSegment = findNearestRouteSegment(currentPosition);
    if (nearestSegment) {
      setCurrentRouteSegment(nearestSegment);

      // Updated to true 2D view with fixed north-up orientation
      mapRef.current.animateCamera({
        center: currentPosition,
        heading: 0,     // Fixed north-up orientation
        pitch: 0,       // Flat view
        zoom: 18,
      }, { duration: 1000 });
    }
  };

  // Add this helper function to find nearest route segment
  const findNearestRouteSegment = (currentPosition) => {
    let minDistance = Infinity;
    let nearestSegment = null;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const start = routeCoordinates[i];
      const end = routeCoordinates[i + 1];

      // Calculate distance from current position to this segment
      const distance = getDistanceFromLine(
        currentPosition,
        start,
        end
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestSegment = {
          startPoint: start,
          nextPoint: end,
          distance: distance,
          index: i
        };
      }
    }

    return nearestSegment;
  };

  // Add this helper function to calculate distance from point to line segment
  const getDistanceFromLine = (point, lineStart, lineEnd) => {
    const { latitude: x, longitude: y } = point;
    const { latitude: x1, longitude: y1 } = lineStart;
    const { latitude: x2, longitude: y2 } = lineEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
  };

  // Define styles inside the component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      flex: 1,
    },
    startNavigationButton: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      backgroundColor: '#2563eb',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      elevation: 4,
    },
    startNavigationText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    exitNavigationButton: {
      position: 'absolute',
      top: 24,
      right: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 12,
      borderRadius: 24,
    },
    markerFixed: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -12,
      marginTop: -24,
    },
    markerText: {
      fontSize: 24,
    },
    addressContainer: {
      position: 'absolute',
      bottom: 24,
      left: 24,
      right: 24,
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 12,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    addressText: {
      fontSize: 16,
      marginBottom: 12,
      color: '#333',
    },
    confirmButton: {
      backgroundColor: '#2563eb',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
    },
    confirmButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    markerAddressContainer: {
      position: 'absolute',
      top: -40,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      padding: 8,
      borderRadius: 8,
      width: 200,
      alignItems: 'center',
      left: -100, // Center horizontally relative to marker
    },
    markerAddressText: {
      color: 'white',
      fontSize: 12,
      textAlign: 'center',
    },
    routeInfoCard: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-around',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 999,
    },
    routeInfoItem: {
      alignItems: 'center',
    },
    routeInfoLabel: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
    },
    routeInfoValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#2563eb',
    },
    estimateButton: {
      position: 'absolute',
      top: 16,
      left: 16,
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 12,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 999,
    },
    estimateButtonText: {
      color: '#2563eb',
      fontWeight: 'bold',
      fontSize: 14,
    },
    searchContainer: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      zIndex: 1,
    },
    searchBar: {
      elevation: 4,
      borderRadius: 12,
      backgroundColor: 'white',
    },
    backButton: {
      position: 'absolute',
      top: 80,
      left: 16,
      backgroundColor: 'white',
      padding: 12,
      borderRadius: 12,
      elevation: 4,
      zIndex: 1,
    },
    markerFixed: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -24,
      marginTop: -48,
      zIndex: 2,
    },
    markerContainer: {
      alignItems: 'center',
    },
    markerPin: {
      fontSize: 48,
    },
    markerPulse: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#2563eb',
      marginTop: -8,
    },
    addressContainer: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 16,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    addressHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 8,
    },
    addressText: {
      fontSize: 16,
      color: '#4b5563',
      marginBottom: 16,
      lineHeight: 24,
    },
    confirmButton: {
      backgroundColor: 'black',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      elevation: 2,
    },
    confirmButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
  });

  // Add this useEffect to log ride state and button conditions
  useEffect(() => {
    console.log('\n=== Ride Control Buttons Status ===');
    console.log('Ride State:', rideState);
    console.log('Ride:', {
      id: ride?.id,
      status: ride?.status,
      checkinStatus: ride?.checkinStatus,
      checkoutStatus: ride?.checkoutStatus
    });
    
    // Log Start Ride button condition
    console.log('Start Ride Button:', {
      shouldShow: rideState === 'READY_TO_START',
      isStartingJourney: ride?.isStartingJourney
    });

    // Log Check-in button conditions
    if (ride?.passengers) {
      console.log('Check-in Buttons:', ride.passengers.map(passenger => ({
        passengerId: passenger.passengerId,
        shouldShow: !passenger.checkinStatus,
        isCheckingIn: passenger.isCheckingIn
      })));
    }

    // Log Check-out button conditions
    if (ride?.passengers) {
      console.log('Check-out Buttons:', ride.passengers.map(passenger => ({
        passengerId: passenger.passengerId,
        shouldShow: passenger.checkinStatus && !passenger.checkoutStatus,
        isCheckingOut: passenger.isCheckingOut
      })));
    }

    // Log End Ride button condition
    const allPassengersCompleted = ride?.passengers?.every(
      passenger => passenger.checkinStatus && passenger.checkoutStatus
    );
    console.log('End Ride Button:', {
      shouldShow: rideState === 'IN_PROGRESS' && allPassengersCompleted,
      isEndingJourney: ride?.isEndingJourney
    });
    
  }, [rideState, ride]);

  // Modify the useEffect to handle shouldFetchRoute prop
  useEffect(() => {
    if (shouldFetchRoute && driverLocation && (passengerPickupLocation || passengerDropLocation)) {
      console.log('Fetching route due to shouldFetchRoute prop:', {
        driverLocation,
        passengerPickupLocation,
        passengerDropLocation
      });

      // Determine the appropriate destination
      let destination;
      if (rideState === 'IN_PROGRESS' && !ride?.checkinStatus) {
        destination = passengerPickupLocation;
      } else {
        destination = passengerDropLocation;
      }

      if (destination) {
        console.log('Fetching route with working:', driverLocation, destination);
        fetchRoute(driverLocation, destination);
      }
    }
  }, [shouldFetchRoute, driverLocation, passengerPickupLocation, passengerDropLocation, rideState, ride?.checkinStatus]);

  // Return the component JSX
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        followsUserLocation={isNavigating}
        showsCompass={!isNavigating}
        loadingEnabled={true}
        mapPadding={{ top: 100, right: 0, bottom: 100, left: 0 }}
        rotateEnabled={true}
        pitchEnabled={true}
        onRegionChangeComplete={handleMapChange}
        onUserLocationChange={handleMapChange}
      >
        {!isSelectMode && routeCoordinates.length > 0 && (
          <>
            {/* Traveled path (dimmed) */}
            <Polyline
              coordinates={routeCoordinates.filter(coord => coord.traveled)}
              strokeColor="rgba(37, 99, 235, 0.3)"
              strokeWidth={5}
              lineDashPattern={[0]}
            />
            {/* Remaining path (solid) */}
            <Polyline
              coordinates={routeCoordinates.filter(coord => !coord.traveled)}
              strokeColor="#2563eb"
              strokeWidth={5}
              lineDashPattern={[0]}
            />
          </>
        )}
        {renderMarkers()}
      </MapView>

      {routeInfo && !showRouteInfo && !isSelectMode && (
        <TouchableOpacity 
          style={styles.estimateButton}
          onPress={() => setShowRouteInfo(true)}
        >
          <Text style={styles.estimateButtonText}>
            {routeInfo.duration}
          </Text>
        </TouchableOpacity>
      )}

      {routeInfo && showRouteInfo && !isSelectMode && (
        <View style={styles.routeInfoCard}>
          <View style={styles.routeInfoItem}>
            <Text style={styles.routeInfoLabel}>Distance</Text>
            <Text style={styles.routeInfoValue}>{routeInfo.distance} km</Text>
          </View>
          <View style={styles.routeInfoItem}>
            <Text style={styles.routeInfoLabel}>Duration</Text>
            <Text style={styles.routeInfoValue}>{routeInfo.duration}</Text>
          </View>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 8, right: 8 }}
            onPress={() => setShowRouteInfo(false)}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {!isSelectMode && !isNavigating && !hideNavigationButton && (
        <TouchableOpacity 
          style={styles.startNavigationButton}
          onPress={startNavigation}
        >
          <MaterialIcons name="navigation" size={24} color="white" />
          <Text style={styles.startNavigationText}>Start Navigation</Text>
        </TouchableOpacity>
      )}

      {!isSelectMode && isNavigating && (
        <TouchableOpacity 
          style={styles.exitNavigationButton}
          onPress={() => setIsNavigating(false)}
        >
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      )}

{isSelectMode && (
      <>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search location"
            onChangeText={(text) => {
              // Handle search text change
              console.log('Search:', text);
            }}
            style={styles.searchBar}
            icon={() => <Ionicons name="search" size={24} color="#4b5563" />}
          />
        </View>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>

        <View style={styles.markerFixed}>
          <View style={styles.markerContainer}>
            <Text style={styles.markerPin}>📍</Text>
          </View>
        </View>

        <View style={styles.addressContainer}>
          {isFetchingAddress ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <>
              <Text style={styles.addressHeader}>Selected Location</Text>
              <Text style={styles.addressText}>
                {addressName || 'Move the map to select a location'}
              </Text>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                accessibilityLabel="Confirm Location"
              >
                <Text style={styles.confirmButtonText}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </>
    )}
    </View>
  );
};

// PropTypes should be outside the component
MapScreen.propTypes = {
  driverLocation: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }),
  passengerPickupLocation: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }),
  passengerDropLocation: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }),
  rideState: PropTypes.string,
  ride: PropTypes.object,
  acceptedPassengers: PropTypes.arrayOf(PropTypes.object),
  route: PropTypes.object,
  navigation: PropTypes.object,
  hideNavigationButton: PropTypes.bool,
  shouldFetchRoute: PropTypes.bool,
};

export default MapScreen;
