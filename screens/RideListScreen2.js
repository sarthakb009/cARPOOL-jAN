import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Dimensions, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Box, Text, HStack, VStack, Icon, Avatar } from 'native-base';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RideCard = ({ ride, onPress }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'orange.500';
      case 'RECEIVING_REQUESTS':
        return 'green.500';
      case 'READY_TO_START':
        return 'blue.500';
      default:
        return 'gray.500';
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Box bg="white" rounded="lg" shadow={2} mb={4} overflow="hidden">
        <Box bg={getStatusColor(ride.status)} p={2}>
          <Text color="white" fontWeight="bold">{ride.status}</Text>
        </Box>
        <VStack space={3} p={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="md" fontWeight="bold">{ride.source}</Text>
              <Icon as={MaterialIcons} name="arrow-downward" size="sm" color="gray.500" />
              <Text fontSize="md" fontWeight="bold">{ride.destination}</Text>
            </VStack>
            <VStack alignItems="flex-end">
              <Text fontSize="sm" color="gray.500">{ride.rideDate}</Text>
              <Text fontSize="sm" color="gray.500">{ride.rideStartTime || 'N/A'}</Text>
            </VStack>
          </HStack>
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={2} alignItems="center">
              <Icon as={FontAwesome5} name="money-bill-wave" size="sm" color="gray.500" />
              <Text fontSize="md">${ride.price || 'N/A'}</Text>
            </HStack>
            <HStack space={2} alignItems="center">
              <Icon as={FontAwesome5} name="route" size="sm" color="gray.500" />
              <Text fontSize="md">{ride.distance || 'N/A'} km</Text>
            </HStack>
          </HStack>
        </VStack>
      </Box>
    </TouchableOpacity>
  );
};

const RideListScreen2 = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchRides = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/scheduledRides?id=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort rides from latest to oldest
      const sortedRides = response.data.sort((a, b) => new Date(b.rideDate) - new Date(a.rideDate));
      setRides(sortedRides);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const handleRidePress = (ride) => {
    navigation.navigate('ManageRide', { ride });
  };

  const renderRideCard = ({ item }) => (
    <RideCard ride={item} onPress={() => handleRidePress(item)} />
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchRides();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Offered Rides</Text>
      <FlatList
        data={rides}
        renderItem={renderRideCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No rides available</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
    color: 'black',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: 'gray',
  },
});

export default RideListScreen2;