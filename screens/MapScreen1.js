// MapScreen.js

import React, { useState, useEffect, useRef } from 'react';
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

// **Note:** Avoid hardcoding API keys in production environments.
// For demonstration purposes, API keys are kept as constants.
const OLA_API_KEY = 'BLiCQHHuN3GFygSHe27hv4rRBpbto7K35v7HXYtANC8';
const REVERSE_GEOCODE_API_KEY = 'EUfyvZrGNq5nhaO07DeHxfBehVrlqPIFTAqDY3em';

const MapScreen1 = ({
  route = {},
  navigation,
  driverLocation,
  passengerPickupLocation,
  passengerDropLocation,
  acceptedPassengers,
  rideState,
  ride,
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
    console.log('Passenger Pickup Location:  ==>', passengerPickupLocation);
    console.log('Passenger Drop Location:  ==>', passengerDropLocation);
    console.log('Accepted Passengers:  ==>', acceptedPassengers);
    console.log('Ride State:  ==>', rideState);
    console.log('Ride:  ==>', ride);
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
  const origin =
    rideState === 'IN_PROGRESS' && !ride.checkinStatus
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
  const fetchRoute = async () => {
    setIsLoadingRoute(true);
    try {
      const response = await axios.post(
        `https://api.olamaps.io/routing/v1/directions`,
        {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          api_key: OLA_API_KEY,
        }
      );

      if (
        response.data &&
        response.data.routes &&
        response.data.routes[0] &&
        response.data.routes[0].overview_polyline
      ) {
        const polylineString = response.data.routes[0].overview_polyline;
        const decodedCoordinates = decodePolyline(polylineString);
        setRouteCoordinates(decodedCoordinates);
        fitMapToCoordinates(decodedCoordinates);
      } else {
        console.error('Invalid response structure:', response.data);
        toast.show({
          title: 'Route Error',
          description: 'Invalid response structure from routing API.',
          status: 'error',
          placement: 'top',
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      toast.show({
        title: 'Route Error',
        description: 'Failed to fetch route. Please try again.',
        status: 'error',
        placement: 'top',
      });
    } finally {
      setIsLoadingRoute(false);
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
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Handle map region changes (used in select mode)
  const handleMapChange = async () => {
    if (mapRef.current && isSelectMode) {
      try {
        const camera = await mapRef.current.getCamera();
        const { latitude, longitude } = camera.center;
        setSelectedLocation({ latitude, longitude });
        const addressInfo = await reverseGeocode(latitude, longitude);
        setAddressName(addressInfo.formattedAddress);
      } catch (error) {
        console.error('Error handling map change:', error);
        toast.show({
          title: 'Map Error',
          description: 'Failed to fetch location details. Please try again.',
          status: 'error',
          placement: 'top',
        });
      }
    }
  };

  // Handle confirmation of selected location in select mode
  const handleConfirm = () => {
    if (route.params && route.params.onLocationSelect && selectedLocation) {
      route.params.onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: addressName,
      });
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
    if (origin && destination) {
      fetchRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to render markers based on ride state
  const renderMarkers = () => {
    if (isSelectMode) return null;

    return (
      <>
        {driverLocation ? (
          <Marker
            coordinate={driverLocation}
            title="Driver"
            description="Driver's current location"
            pinColor="blue"
          />
        ) : null}

        {rideState === 'IN_PROGRESS' && !ride.checkinStatus && passengerPickupLocation ? (
          <Marker
            coordinate={passengerPickupLocation}
            title="Pickup"
            description="Passenger pickup location"
            pinColor="green"
          />
        ) : null}

        {rideState === 'IN_PROGRESS' && ride.checkinStatus && passengerDropLocation ? (
          <Marker
            coordinate={passengerDropLocation}
            title="Drop-off"
            description="Passenger drop-off location"
            pinColor="red"
          />
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleMapChange}
      >
        {renderMarkers()}
        {routeCoordinates.length > 0 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#0000FF"
            strokeWidth={3}
          />
        ) : null}
      </MapView>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(true)}
          accessibilityLabel="Zoom In"
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(false)}
          accessibilityLabel="Zoom Out"
        >
          <Text style={styles.zoomButtonText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Select Mode UI */}
      {isSelectMode ? (
        <>
          <View style={styles.markerFixed}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <View style={styles.addressContainer}>
            {isFetchingAddress ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Text style={styles.addressText}>
                  {addressName || 'Move the map to select a location'}
                </Text>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  accessibilityLabel="Confirm Location"
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      ) : null}

      {/* Loading Overlay for Route Fetching */}
      {isLoadingRoute ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000FF" />
          <Text style={styles.loadingText}>Fetching Route...</Text>
        </View>
      ) : null}
    </View>
  );
};

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -60 }],
    backgroundColor: 'transparent',
  },
  zoomButton: {
    width: 45,
    height: 45,
    backgroundColor: 'white',
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zoomButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  markerFixed: {
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    position: 'absolute',
    top: '50%',
  },
  markerText: {
    fontSize: 48,
  },
  addressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },
  addressText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0000FF',
  },
});

export default MapScreen1;
