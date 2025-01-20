import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Input, Button, Pressable, Divider } from 'native-base';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const OLA_API_KEY = 'JKoeWGojXNaDyyuCvvEprFq4kSI9HCObU8R3Gy9k';

const AddLocationScreen = ({ navigation, route }) => {
  const { location, editMode, onRefresh } = route.params || {};

  const [tag, setTag] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (editMode && location) {
      setTag(location.tag || '');
      setAddressLine1(location.addressLine1);
      setAddressLine2(location.addressLine2);
      setCity(location.city);
      setState(location.state);
      setCountry(location.country);
      setPincode(location.pincode);
      setLatitude(location.latitude);
      setLongitude(location.longitude);
      setSelectedLocation({
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
      });
    }
  }, [editMode, location]);

  const fetchSuggestions = useCallback(
    debounce(async (text) => {
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
    }, 300),
    []
  );

  const handleLocationSelect = async (selectedLocation) => {
    try {
      const response = await axios.get(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${selectedLocation.geometry.location.lat},${selectedLocation.geometry.location.lng}&api_key=${OLA_API_KEY}`);
      
      if (response.data.status === 'ok' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const newLocation = {
          addressLine1: result.name || '',
          addressLine2: `${result.address_components.find(comp => comp.types.includes('administrative_area_level_2'))?.long_name || ''}, ${result.address_components.find(comp => comp.types.includes('sublocality'))?.long_name || ''}`.trim(),
          city: result.address_components.find(comp => comp.types.includes('locality'))?.long_name || '',
          state: result.address_components.find(comp => comp.types.includes('administrative_area_level_1'))?.long_name || '',
          country: result.address_components.find(comp => comp.types.includes('country'))?.long_name || '',
          pincode: result.address_components.find(comp => comp.types.includes('postal_code'))?.long_name || '',
        };
        
        setSelectedLocation(newLocation);
        setAddressLine1(newLocation.addressLine1);
        setAddressLine2(newLocation.addressLine2);
        setCity(newLocation.city);
        setState(newLocation.state);
        setCountry(newLocation.country);
        setPincode(newLocation.pincode);
        setLatitude(selectedLocation.geometry.location.lat);
        setLongitude(selectedLocation.geometry.location.lng);
        
        setSearchQuery(result.formatted_address);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      Alert.alert('Error', 'Failed to fetch location details. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!tag || !addressLine1 || !city || !state || !country || !pincode || !latitude || !longitude) {
      Alert.alert('Error', 'Please fill all required fields, including the location tag.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      const payload = {
        tag,
        latitude,
        longitude,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        pincode
      };

      if (editMode && location.id) {
        await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saveLocation/edit?locationId=${location.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Success', 'Location updated successfully.');
      } else {
        const response = await axios.post(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saveLocation/passenger?passengerId=${userId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('Location saved with ID:', response.data);
        Alert.alert('Success', 'Location added successfully.');
      }
      if (onRefresh) {
        onRefresh();
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const LocationCard = ({ location }) => (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.locationCard}
    >
      <VStack space={3}>
        <HStack justifyContent="space-between" alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="gray.800">
            {tag || 'Selected Location'}
          </Text>
          <Icon as={FontAwesome5} name="map-marked-alt" size={6} color="gray.500" />
        </HStack>
        <Divider />
        <HStack space={3} alignItems="flex-start">
          <Icon as={Ionicons} name="location" size={6} color="red.500" />
          <VStack flex={1}>
            <Text fontSize="md" fontWeight="semibold" color="gray.700">
              {location.addressLine1}
            </Text>
            {location.addressLine2 && (
              <Text fontSize="sm" color="gray.600" mt={1}>
                {location.addressLine2}
              </Text>
            )}
          </VStack>
        </HStack>
        <HStack justifyContent="space-between" mt={2}>
          <InfoItem icon="city" label="City" value={location.city} />
          <InfoItem icon="map" label="State" value={location.state} />
        </HStack>
        <HStack justifyContent="space-between">
          <InfoItem icon="flag" label="Country" value={location.country} />
          <InfoItem icon="mailbox" label="Pincode" value={location.pincode} />
        </HStack>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setSearchQuery(location.addressLine1);
            setSelectedLocation(null);
          }}
        >
          <HStack space={2} alignItems="center" justifyContent="center">
            <Icon as={MaterialIcons} name="edit-location" size={5} color="white" />
            <Text color="white" fontWeight="semibold">
              Edit Location
            </Text>
          </HStack>
        </TouchableOpacity>
      </VStack>
    </Animated.View>
  );

  const InfoItem = ({ icon, label, value }) => (
    <VStack alignItems="center" width="48%">
      <HStack space={2} alignItems="center">
        <Icon as={FontAwesome5} name={icon} size={4} color="gray.500" />
        <Text fontSize="xs" color="gray.500" fontWeight="medium">
          {label}
        </Text>
      </HStack>
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mt={1} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </VStack>
  );

  return (
    <Box flex={1} bg="white">
      <ScrollView contentContainerStyle={styles.container}>
        <HStack alignItems="center" p={4} borderBottomWidth={1} borderBottomColor="gray.200">
          <BackButton onPress={() => navigation.goBack()} />
          <Text fontSize="xl" fontWeight="bold" ml={4}>
            {editMode ? 'Edit Location' : 'Add Location'}
          </Text>
        </HStack>

        <VStack space={4} mt={6} px={4}>
          <Input
            placeholder="Location Tag (e.g., Home, Work, Gym)"
            value={tag}
            onChangeText={setTag}
            fontSize="md"
            borderRadius="lg"
            borderColor="gray.300"
            _focus={{ borderColor: "black", backgroundColor: "gray.100" }}
            InputLeftElement={
              <Icon as={FontAwesome5} name="tag" size={4} color="gray.400" ml={3} />
            }
          />

          <Input
            placeholder="Search Location"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              fetchSuggestions(text);
            }}
            fontSize="md"
            borderRadius="lg"
            borderColor="gray.300"
            _focus={{ borderColor: "black", backgroundColor: "gray.100" }}
            InputLeftElement={
              <Icon as={MaterialIcons} name="search" size={5} color="gray.400" ml={2} />
            }
          />

          {suggestions.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
              <VStack space={2} bg="white" borderRadius="md" borderColor="gray.200" borderWidth={1} p={2}>
                {suggestions.map((suggestion, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleLocationSelect(suggestion)}
                    p={2}
                    borderRadius="md"
                    _pressed={{ bg: "gray.100" }}
                  >
                    <HStack space={2} alignItems="center">
                      <Icon as={Ionicons} name="location-outline" size={5} color="gray.500" />
                      <VStack>
                        <Text fontSize="sm" fontWeight="medium">
                          {suggestion.structured_formatting?.main_text || suggestion.description}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {suggestion.structured_formatting?.secondary_text || ''}
                        </Text>
                      </VStack>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            </Animated.View>
          )}

          {selectedLocation && <LocationCard location={selectedLocation} />}

          <Button
            onPress={handleSave}
            bg="black"
            _pressed={{ bg: "gray.800" }}
            _text={{ color: "white", fontWeight: "bold" }}
            isLoading={loading}
            isLoadingText="Saving..."
            mt={4}
          >
            {editMode ? 'Save Changes' : 'Add Location'}
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'white',
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  editButton: {
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
});

export default AddLocationScreen;