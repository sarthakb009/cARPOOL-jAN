import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, Spinner, Pressable, Modal } from 'native-base';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BackButton, CustomInput } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FadeInDown } from 'react-native-reanimated';
import MapScreen from './MapScreen';
const OLA_API_KEY = 'JKoeWGojXNaDyyuCvvEprFq4kSI9HCObU8R3Gy9k';

const ErrorToast = ({ message, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.errorToast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <HStack alignItems="center" space={3}>
        <Icon as={Ionicons} name="alert-circle" size={6} color="white" />
        <Text color="white" fontWeight="medium">
          {message}
        </Text>
      </HStack>
    </Animated.View>
  );
};

const AddRoutesScreen = ({ navigation, route }) => {
  //const { routeDetails, editMode } = route.params;
  const { routeDetails, editMode, startLatitude, startLongitude, endLatitude, endLongitude } = route.params;

  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [tag, setTag] = useState('');
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSelectingStart, setIsSelectingStart] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [driverLocation, setDriverLocation] = useState(null);
  const [acceptedPassengers, setAcceptedPassengers] = useState([]);

  // useEffect(() => {
  //   if (editMode && routeDetails) {
  //     console.log('Start Latitude -->', startLatitude);
  //     console.log('Start Longitude -->', startLongitude);
  //     console.log('End Latitude -->', endLatitude);
  //     console.log('End Longitude -->', endLongitude);
     
  //     setSource(routeDetails.source);
  //     setDestination(routeDetails.destination);
  //     setTag(routeDetails.tag);
  //     setStartLocation({
  //       latitude: routeDetails.startLatitude,
  //       longitude: routeDetails.startLongitude,
  //       addressLine1: routeDetails.startAddressLine1,
  //       addressLine2: routeDetails.startAddressLine2,
  //       city: routeDetails.startCity,
  //       state: routeDetails.startState,
  //       country: routeDetails.startCountry,
  //       pincode: routeDetails.startPincode,
  //     });
  //     setEndLocation({
  //       latitude: routeDetails.endLatitude,
  //       longitude: routeDetails.endLongitude,
  //       addressLine1: routeDetails.endAddressLine1,
  //       addressLine2: routeDetails.endAddressLine2,
  //       city: routeDetails.endCity,
  //       state: routeDetails.endState,
  //       country: routeDetails.endCountry,
  //       pincode: routeDetails.endPincode,
  //     });
  //   }
  // }, [editMode, routeDetails]);
  useEffect(() => {
    if (editMode && routeDetails) {
      console.log('Start Latitude -->', startLatitude);
      console.log('Start Longitude -->', startLongitude);
      console.log('End Latitude -->', endLatitude);
      console.log('End Longitude -->', endLongitude);
     
      setSource(routeDetails.source);
      setDestination(routeDetails.destination);
      setTag(routeDetails.tag);
      setStartLocation({
        latitude: startLatitude,
        longitude: startLongitude,
        addressLine1: routeDetails.startAddressLine1,
        addressLine2: routeDetails.startAddressLine2,
        city: routeDetails.startCity,
        state: routeDetails.startState,
        country: routeDetails.startCountry,
        pincode: routeDetails.startPincode,
      });
      setEndLocation({
        latitude: endLatitude,
        longitude: endLongitude,
        addressLine1: routeDetails.endAddressLine1,
        addressLine2: routeDetails.endAddressLine2,
        city: routeDetails.endCity,
        state: routeDetails.endState,
        country: routeDetails.endCountry,
        pincode: routeDetails.endPincode,
      });
    }
  }, [editMode, routeDetails]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchSuggestions = async (text) => {
    if (text.length > 2) {
      try {
        const response = await axios.get(`https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(text)}&api_key=${OLA_API_KEY}`);
        if (response.data.status === 'ok') {
          setSuggestions(response.data.predictions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleLocationSelect = async (selectedLocation) => {
    try {
      const response = await axios.get(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${selectedLocation.geometry.location.lat},${selectedLocation.geometry.location.lng}&api_key=${OLA_API_KEY}`);
     
      if (response.data.status === 'ok' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const locationData = {
          latitude: selectedLocation.geometry.location.lat,
          longitude: selectedLocation.geometry.location.lng,
          addressLine1: result.name || '',
          addressLine2: `${result.address_components.find(comp => comp.types.includes('administrative_area_level_2'))?.long_name || ''}, ${result.address_components.find(comp => comp.types.includes('sublocality'))?.long_name || ''}`.trim(),
          city: result.address_components.find(comp => comp.types.includes('locality'))?.long_name || '',
          state: result.address_components.find(comp => comp.types.includes('administrative_area_level_1'))?.long_name || '',
          country: result.address_components.find(comp => comp.types.includes('country'))?.long_name || '',
          pincode: result.address_components.find(comp => comp.types.includes('postal_code'))?.long_name || '',
        };

        if (isSelectingStart) {
          setStartLocation(locationData);
          setSource(result.formatted_address);
        } else {
          setEndLocation(locationData);
          setDestination(result.formatted_address);
        }

        setShowLocationModal(false);
        setSearchQuery('');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      setErrorMessage('Failed to fetch location details. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!source || !destination || !tag || !startLocation || !endLocation) {
      setErrorMessage('Please fill in all fields');
      return;
    }
 
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
 
      console.log('Token:', token);
      console.log('UserId:', userId);
 
      const payload = {
        source,
        destination,
        startLatitude: startLocation.latitude,
        startLongitude: startLocation.longitude,
        endLatitude: endLocation.latitude,
        endLongitude: endLocation.longitude,
        tag,
        startAddressLine1: startLocation.addressLine1,
        startAddressLine2: startLocation.addressLine2,
        startCity: startLocation.city,
        startState: startLocation.state,
        startCountry: startLocation.country,
        startPincode: startLocation.pincode,
        endAddressLine1: endLocation.addressLine1,
        endAddressLine2: endLocation.addressLine2,
        endCity: endLocation.city,
        endState: endLocation.state,
        endCountry: endLocation.country,
        endPincode: endLocation.pincode,
      };
 
      console.log('Payload:', JSON.stringify(payload, null, 2));
 
      if (editMode && routeDetails.id) {
        console.log('Editing existing route');
        await axios.put(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saved-routes/edit?routeId=${routeDetails.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Route updated successfully');
        setErrorMessage('Route updated successfully.');
      } else {
        console.log('Creating new route');
        const response = await axios.post(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saved-routes/passenger?passengerId=${userId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
       
        console.log('Create response:', JSON.stringify(response.data, null, 2));
       
        if (response.data && response.data.id) {
          console.log('Updating tag for new route');
          try {
            const updateResponse = await axios.put(
              `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saved-routes/edit?routeId=${response.data.id}`,
              { tag: tag },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Tag update response:', JSON.stringify(updateResponse.data, null, 2));
          } catch (updateError) {
            console.error('Error updating tag:', updateError);
            if (updateError.response) {
              console.error('Update error response:', JSON.stringify(updateError.response.data, null, 2));
            }
            setErrorMessage('Route created but tag may not have been saved. Please check and edit if necessary.');
          }
        } else {
          console.error('No route ID received in create response');
        }
       
        setErrorMessage('Route added successfully.');
      }
 
      navigation.goBack();
    } catch (error) {
      console.error('Error saving route:', error);
      if (error.response) {
        console.error('Error response:', JSON.stringify(error.response.data, null, 2));
      }
      setErrorMessage('Failed to save route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const LocationCard = ({ location, onPress, iconColor, title }) => (
    <Pressable onPress={onPress} style={styles.locationCard}>
      <HStack space={3} alignItems="center">
        <Icon as={Ionicons} name="location" size={6} color={iconColor} />
        <VStack flex={1}>
          <Text fontSize="md" fontWeight="bold" numberOfLines={1}>{title}</Text>
          {location && (
            <Text fontSize="sm" color="gray.500" numberOfLines={1}>
              {location.addressLine1}, {location.city}
            </Text>
          )}
        </VStack>
        <Icon as={MaterialIcons} name="chevron-right" size={6} color="gray.400" />
      </HStack>
    </Pressable>
  );

  return (
    <Box style={styles.container}>
      {errorMessage ? (
        <ErrorToast message={errorMessage} onHide={() => setErrorMessage('')} />
      ) : null}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HStack alignItems="center" p="4" borderBottomWidth={1} borderColor="gray.200">
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>{editMode ? 'Edit Route' : 'Add New Route'}</Text>
        </HStack>
        <Box bg="white" rounded="lg" shadow={2} p={4} mb={4} h={300}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>Driver's Location</Text>
        {/* <MapScreen driverLocation={driverLocation} acceptedPassengers={acceptedPassengers} /> */}
        <MapScreen
            driverLocation={startLocation}
            acceptedPassengers={acceptedPassengers}
            endLocation={endLocation}
          />
      </Box>
        <VStack space={6} mt={6} px={4}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <VStack space={4}>
              <CustomInput
                label="Tag"
                value={tag}
                onChangeText={setTag}
                leftElement={<Icon as={MaterialIcons} name="local-offer" size={5} color="gray.400" ml={2} />}
              />
            </VStack>
          </Animated.View>
         
          <LocationCard
            location={startLocation}
            onPress={() => {
              setIsSelectingStart(true);
              setShowLocationModal(true);
            }}
            iconColor="blue.500"
            title={source || "Select Start Location"}
          />
         
          <LocationCard
            location={endLocation}
            onPress={() => {
              setIsSelectingStart(false);
              setShowLocationModal(true);
            }}
            iconColor="green.500"
            title={destination || "Select End Location"}
          />
         
          <Button
            onPress={handleSave}
            isLoading={loading}
            style={styles.saveButton}
            _text={{ color: 'white', fontWeight: 'bold' }}
          >
            {editMode ? 'Save Changes' : 'Add Route'}
          </Button>
        </VStack>
      </ScrollView>

      <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} size="full">
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>Select {isSelectingStart ? 'Start' : 'End'} Location</Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              <CustomInput
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  fetchSuggestions(text);
                }}
                placeholder="Search for a location"
                leftElement={<Icon as={MaterialIcons} name="search" size={5} color="gray.400" ml={2} />}
              />
              {suggestions.map((suggestion, index) => (
                <Pressable key={index} onPress={() => handleLocationSelect(suggestion)} p={2}>
                  <Text>{suggestion.description}</Text>
                </Pressable>
              ))}
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: '#6200EE',
    borderRadius: 30,
  },
  errorToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    padding: 16,
    zIndex: 1000,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default AddRoutesScreen;