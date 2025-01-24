import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Alert, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, Spinner, Pressable } from 'native-base';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

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

const EmptyRoutesState = () => (
  <VStack space={4} alignItems="center" justifyContent="center" flex={1} p={6}>
    <Icon as={MaterialIcons} name="route" size="6xl" color="gray.300" />
    <Text fontSize="xl" fontWeight="bold" textAlign="center" color="gray.700">
      No Saved Routes Yet
    </Text>
    <Text fontSize="md" textAlign="center" color="gray.500">
      Save your favorite routes for quick access. Tap the 'Add New Route' button to get started!
    </Text>
  </VStack>
);

const RoutesScreen = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
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
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [])
  );

  const handleDeleteRoute = async (routeId) => {
    Alert.alert(
      "Delete Route",
      "Are you sure you want to delete this route?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/saved-routes/delete?routeId=${routeId}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              setRoutes(routes.filter(route => route.id !== routeId));
              setSuccessMessage('Route deleted successfully');
            } catch (error) {
              console.error('Error deleting route:', error);
              setError('Failed to delete route. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const RouteCard = ({ route, onDelete }) => (
    <Animated.View
      entering={FadeInRight}
      exiting={FadeOutLeft}
      style={styles.card}
    >
      <HStack justifyContent="space-between" alignItems="center" mb={3}>
        <Text style={styles.cardTitle}>{route.tag || 'Unnamed Route'}</Text>
        <HStack space={2} alignItems="center">
          <Pressable onPress={() => navigation.navigate('AddRoutes', { routeDetails: route, editMode: true })}>
            <Icon as={MaterialIcons} name="edit" size={5} color="gray.500" />
          </Pressable>
          <Pressable onPress={() => onDelete(route.id)}>
            <Icon as={MaterialIcons} name="delete" size={5} color="red.500" />
          </Pressable>
        </HStack>
      </HStack>
      <VStack space={2}>
        <HStack alignItems="center" space={2}>
          <Icon as={Ionicons} name="location" size={4} color="blue.500" />
          <Text style={styles.cardDescription}>{formatAddress(route.source || route.startAddressLine1, route.startCity)}</Text>
        </HStack>
        <HStack alignItems="center" space={2}>
          <Icon as={Ionicons} name="location" size={4} color="green.500" />
          <Text style={styles.cardDescription}>{formatAddress(route.destination || route.endAddressLine1, route.endCity)}</Text>
        </HStack>
        <HStack justifyContent="space-between" alignItems="center">
          <HStack alignItems="center" space={2}>
            <Icon as={FontAwesome5} name="route" size={3} color="purple.500" />
            <Text style={styles.cardTag}>{route.distance ? `${route.distance.toFixed(2)} km` : 'N/A'}</Text>
          </HStack>
          {route.estimatedTime && (
            <HStack alignItems="center" space={2}>
              <Icon as={Ionicons} name="time-outline" size={4} color="orange.500" />
              <Text style={styles.cardTag}>{(route.estimatedTime * 60).toFixed(0)} min</Text>
            </HStack>
          )}
        </HStack>
      </VStack>
    </Animated.View>
  );

  const formatAddress = (addressLine, city) => {
    return `${addressLine}${city ? `, ${city}` : ''}`;
  };

  return (
    <Box style={styles.container}>
      {successMessage ? (
        <SuccessToast message={successMessage} onHide={() => setSuccessMessage('')} />
      ) : null}
      <HStack alignItems="center" p="4" borderBottomWidth={1} borderColor="gray.200">
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Saved Routes</Text>
      </HStack>
      {loading ? (
        <Spinner size="lg" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Array.isArray(routes) && routes.length > 0 ? (
            <VStack space={4} mt={4}>
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} onDelete={handleDeleteRoute} />
              ))}
            </VStack>
          ) : (
            <EmptyRoutesState />
          )}
        </ScrollView>
      )}
      <Button
        leftIcon={<Icon as={Ionicons} name="add" size="sm" color="white" />}
        onPress={() => navigation.navigate('AddRoutes', { editMode: false, onRouteAdded: (newRoute) => setRoutes([...routes, newRoute]) })}
        style={styles.addButton}
        _text={{ color: 'white', fontWeight: 'bold' }}
      >
        Add New Route
      </Button>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, 
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cardDescription: {
    color: '#4A4A4A',
    fontSize: 14,
    flex: 1,
  },
  cardTag: {
    color: '#6200EE',
    fontSize: 14,
    fontWeight: '500',
  },
  noRoutes: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4A4A4A',
    marginTop: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 30,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: 'red',
    marginTop: 20,
    padding: 20,
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

export default RoutesScreen;