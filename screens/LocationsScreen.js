import React, { useState, useCallback,useRef } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, Spinner, Pressable, FlatList } from 'native-base';
import { MaterialIcons, Ionicons, Entypo } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SuccessToast = ({ message, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
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
        styles.successToast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <HStack alignItems="center" space={3}>
        <Icon as={Ionicons} name="checkmark-circle" size={6} color="white" />
        <Text color="white" fontWeight="medium">
          {message}
        </Text>
      </HStack>
    </Animated.View>
  );
};

const LocationsScreen = ({ navigation }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        throw new Error('User authentication failed. Please log in again.');
      }

      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saveLocation/getByPassengerId?passengerId=${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (Array.isArray(response.data)) {
        setLocations(response.data);
      } else {
        console.error('Unexpected data format:', response.data);
        throw new Error('Received invalid data format from server.');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLocations();
    }, [])
  );

  const handleDeleteLocation = async (locationId) => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to delete this location?",
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saveLocation/delete?locationId=${locationId}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              setLocations(locations.filter(location => location.id !== locationId));
              setSuccessMessage('Location deleted successfully');
            } catch (error) {
              console.error('Error deleting location:', error);
              setError('Failed to delete location. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      { cancelable: false }
    );
  };

  const LocationCard = ({ location, index }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 100)}
      exiting={FadeOutLeft}
      layout={Layout.springify()}
    >
      <Box 
        bg="white" 
        borderRadius="2xl" 
        shadow={3}
        mb={4}
        overflow="hidden"
        borderWidth={1}
        borderColor="gray.100"
      >
        <HStack space={4} p={4} alignItems="center">
          <Box 
            bg="gray.100" 
            p={3} 
            borderRadius="full"
          >
            <Icon 
              as={Entypo}
              name="location-pin"
              color="black"
              size={6}
            />
          </Box>
          <VStack flex={1}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="lg" fontWeight="bold" color="black">
                {location.tag}
              </Text>
              <HStack space={2}>
                <Pressable 
                  onPress={() => navigation.navigate('AddLocation', { location, editMode: true, onLocationUpdated: fetchLocations })}
                  p={2}
                >
                  <Icon as={MaterialIcons} name="edit" size={5} color="gray.400" />
                </Pressable>
                <Pressable 
                  onPress={() => handleDeleteLocation(location.id)}
                  p={2}
                >
                  <Icon as={MaterialIcons} name="delete" size={5} color="red.400" />
                </Pressable>
              </HStack>
            </HStack>
            <Text fontSize="sm" color="gray.600" numberOfLines={1} mt={1}>
              {location.addressLine1}
            </Text>
            <Text fontSize="xs" color="gray.500" numberOfLines={1} mt={1}>
              {location.city}, {location.state} {location.pincode}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </Animated.View>
  );

  return (
    <Box flex={1} bg="white">
      {successMessage ? (
        <SuccessToast message={successMessage} onHide={() => setSuccessMessage('')} />
      ) : null}
      <HStack alignItems="center" p={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <BackButton onPress={() => navigation.goBack()} />
        <Text fontSize="xl" fontWeight="bold" ml={4}>
          Saved Locations
        </Text>
      </HStack>
      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" color="black" />
          <Text mt={4} fontSize="md" color="gray.500">Loading your locations...</Text>
        </Box>
      ) : error ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Icon as={Entypo} name="emoji-sad" size={12} color="red.500" mb={4} />
          <Text color="red.500" textAlign="center" mb={4}>{error}</Text>
          <Button onPress={fetchLocations} colorScheme="blue">
            Try Again
          </Button>
        </Box>
      ) : (
        <FlatList
          data={locations}
          renderItem={({ item, index }) => <LocationCard location={item} index={index} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Icon as={Entypo} name="location" size={16} color="gray.400" mb={4} />
              <Text fontSize="md" color="gray.500" textAlign="center">
                No saved locations found.
              </Text>
              <Text fontSize="sm" color="gray.400" textAlign="center" mt={2}>
                Add your favorite places to get started! 🏠🏢🏫
              </Text>
            </Box>
          }
        />
      )}
      <Box position="absolute" bottom={8} right={8}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddLocation', { editMode: false, onLocationAdded: fetchLocations })}
          style={styles.fabButton}
        >
          <Icon as={Ionicons} name="add" size="lg" color="white" />
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successToast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CAF50',
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

export default LocationsScreen;