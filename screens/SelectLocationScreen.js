import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { Box, Heading, VStack, Text, HStack } from 'native-base';
import axios from 'axios';
import * as Location from 'expo-location';
import { styles, CustomInput, LocationItem, BackButton } from '../components/sharedComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OLA_API_KEY = 'JKoeWGojXNaDyyuCvvEprFq4kSI9HCObU8R3Gy9k';
const OLA_CLIENT_ID = '7ba2810b-f481-4e31-a0c6-d436b0c7c1eb';
const OLA_CLIENT_SECRET = 'klymi04gaquWCnpa57hBEpMXR7YPhkLD';

const SelectLocationScreen = ({ navigation, route }) => {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [location, setLocation] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [accessToken, setAccessToken] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [geocodedAddress, setGeocodedAddress] = useState('');

  const { isPickup, onSelect } = route.params;

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const searches = await AsyncStorage.getItem('recentSearches');
        if (searches) {
          const parsedSearches = JSON.parse(searches);
          // Filter out any empty or invalid entries
          const validSearches = parsedSearches.filter(search => 
            search && search.title && search.title.trim() !== ''
          );
          setRecentSearches(validSearches);
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
        setErrorMessage('Failed to load recent searches.');
      }
    };

    const getAccessToken = async () => {
      try {
        const response = await axios.post(
          'https://account.olamaps.io/realms/olamaps/protocol/openid-connect/token',
          new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'openid',
            client_id: OLA_CLIENT_ID,
            client_secret: OLA_CLIENT_SECRET
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        setAccessToken(response.data.access_token);
      } catch (error) {
        console.error('Error getting access token:', error);
        setErrorMessage('Failed to authenticate with Ola Maps.');
      }
    };

    loadRecentSearches();
    getAccessToken();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const saveRecentSearches = async (searchTerm) => {
    try {
      // Skip empty search terms
      if (!searchTerm?.trim()) return;

      let searches = recentSearches.filter(search => 
        search.title && 
        search.title.trim() !== '' && 
        search.title !== searchTerm
      );
      searches.unshift({ title: searchTerm });
      if (searches.length > 3) {
        searches = searches.slice(0, 3);
      }
      setRecentSearches(searches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  };

  const fetchSuggestions = async (text) => {
    if (text.length > 2) {
      try {
        let url = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(text)}`;
        if (location) {
          url += `&location=${location.coords.latitude},${location.coords.longitude}`;
        }

        let headers = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        } else {
          url += `&api_key=${OLA_API_KEY}`;
        }

        const response = await axios.get(url, { headers });

        if (response.data.status === 'ok') {
          setSuggestions(response.data.predictions);
        } else {
          console.error('Error fetching suggestions:', response.data.error_message);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      let url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}`;

      let headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      } else {
        url += `&api_key=${OLA_API_KEY}`;
      }

      const response = await axios.get(url, { headers });

      console.log('reverse geocoding response:', response.data);
      if (response.data.status === 'ok' && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      } else {
        console.error('Error in reverse geocoding:', response.data.error_message);
        // Fallback to coordinates if no results
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      // If there's a 404 error, it might mean the endpoint is incorrect
      if (error.response && error.response.status === 404) {
        console.error('Reverse geocoding endpoint not found. Please check the API documentation.');
      }
      // Fallback to coordinates
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  const handleInputChange = (text) => {
    setSearch(text);
    fetchSuggestions(text);
  };

  const handleLocationSelect = (selectedLocation) => {
    const locationData = {
      address: selectedLocation.structured_formatting?.main_text || selectedLocation.description,
      coordinates: {
        lat: selectedLocation.geometry?.location?.lat || null,
        lng: selectedLocation.geometry?.location?.lng || null
      }
    };

    console.log('Sending location data:', locationData);
    onSelect(locationData);
    saveRecentSearches(locationData.address);
    navigation.goBack();
  };

  const handleMapSelection = () => {
    navigation.navigate('Map', {
      fromSelectLocation: true,
      source: 'SelectLocationScreen',
      onLocationSelect: (locationData) => {
        const formattedLocation = {
          structured_formatting: {
            main_text: locationData.address
          },
          geometry: {
            location: locationData.coordinates
          }
        };
        handleLocationSelect(formattedLocation);
      }
    });
  };

  const isCoordinate = (str) => {
    // This regex matches strings like "12.3456, -78.9012"
    return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(str);
  }

  useEffect(() => {
    async function fetchAddress() {
      if (recentSearches.length > 0 && isCoordinate(recentSearches[0]?.title)) {
        const [lat, lon] = recentSearches[0].title.split(',').map(coord => parseFloat(coord.trim()));
        try {
          const address = await reverseGeocode(lat, lon);
          setGeocodedAddress(address);
        } catch (error) {
          console.error('Failed to reverse geocode:', error);
          setGeocodedAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
      }
    }
    fetchAddress();
  }, [recentSearches]);

  return (
    <Box style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HStack alignItems="center" mb={4}>
          <BackButton onPress={() => navigation.goBack()} />
          <Heading size="lg" ml={4}>
            Select {isPickup ? 'Pickup' : 'Drop-off'} Location
          </Heading>
        </HStack>

        {errorMessage ? (
          <Text color="red.500" mb={4}>{errorMessage}</Text>
        ) : null}

        <CustomInput
          value={search}
          onChangeText={handleInputChange}
          placeholder="Search for a location"
          icon="search"
        />

        {suggestions.length > 0 && (
          <VStack space={2} mt={2}>
            {suggestions.map((suggestion, index) => (
              <LocationItem
                key={index}
                icon="location-on"
                title={suggestion.structured_formatting?.main_text || suggestion.description}
                subtitle={suggestion.structured_formatting?.secondary_text || ''}
                onPress={() => handleLocationSelect(suggestion)}
              />
            ))}
          </VStack>
        )}

        <LocationItem
          icon="map"
          title="Select on map"
          subtitle="Choose a location from the map"
          onPress={handleMapSelection}
        />

        {recentSearches.length > 0 && (
          <>
            <Text fontWeight="bold" fontSize="lg" mt={6} mb={2}>
              {isCoordinate(recentSearches[0]?.title)
                ? 'CONFIRM LOCATION'
                : 'RECENT SEARCHES'}
            </Text>
            <VStack space={2}>
              {isCoordinate(recentSearches[0]?.title) ? (
                <LocationItem
                  key={0}
                  icon="map-pin"
                  title={geocodedAddress || 'Loading address...'}
                  subtitle={recentSearches[0].title}
                  onPress={() => handleLocationSelect({ structured_formatting: { main_text: geocodedAddress, secondary_text: recentSearches[0].title } })}
                />
              ) : (
                recentSearches.map((searchItem, index) => (
                  <LocationItem
                    key={index}
                    icon="history"
                    title={searchItem.title}
                    subtitle=""
                    onPress={() => handleLocationSelect({ structured_formatting: { main_text: searchItem.title } })}
                  />
                ))
              )}
            </VStack>
          </>
        )}
      </ScrollView>
    </Box>
  );
};

export default SelectLocationScreen;