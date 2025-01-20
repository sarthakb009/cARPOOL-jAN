import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, useToast, FlatList, Spinner, Pressable } from 'native-base';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const VehiclesScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/getByDriver?id=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.show({
        title: "Error",
        description: "Failed to load vehicles. Please try again.",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [fetchVehicles])
  );

  const handleDeleteVehicle = useCallback(async (vehicleId) => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('userToken');
              const response = await axios.delete(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/delete?id=${vehicleId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.status === 200) {
                setVehicles(prevVehicles => prevVehicles.filter(vehicle => vehicle.id !== vehicleId));
                toast.show({
                  title: "Success",
                  description: "Vehicle deleted successfully.",
                  status: "success"
                });
              } else {
                throw new Error('Failed to delete vehicle');
              }
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              toast.show({
                title: "Error",
                description: "Failed to delete vehicle. Please try again.",
                status: "error"
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [toast]);


  const handleToggleActive = async (vehicleId, currentStatus) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/update?id=${vehicleId}`,
        { isDefault: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVehicles(prevVehicles =>
        prevVehicles.map(vehicle => ({
          ...vehicle,
          isDefault: vehicle.id === vehicleId ? !currentStatus : false
        }))
      );

      toast.show({
        title: "Success",
        description: `Vehicle ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
        status: "success"
      });
    } catch (error) {
      console.error('Error toggling vehicle status:', error);
      toast.show({
        title: "Error",
        description: "Failed to update vehicle status. Please try again.",
        status: "error"
      });
    }
  };

  const VehicleCard = useCallback(({ vehicle }) => (
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
          bg={vehicle.isDefault ? "black" : "gray.100"}
          p={3}
          borderRadius="full"
        >
          <Icon
            as={FontAwesome5}
            name={getVehicleIcon(vehicle.type)}
            size={6}
            color={vehicle.isDefault ? "white" : "black"}
          />
        </Box>
        <VStack flex={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="lg" fontWeight="bold" color="black">
              {vehicle.make} {vehicle.model}
            </Text>
            <HStack space={2}>
              <Pressable onPress={() => handleToggleActive(vehicle.id, vehicle.isDefault)}>
                <Icon
                  as={MaterialIcons}
                  name={vehicle.isDefault ? "check-circle" : "radio-button-unchecked"}
                  size={6}
                  color={vehicle.isDefault ? "black" : "gray.400"}
                />
              </Pressable>
              <Pressable onPress={() => navigation.navigate('AddVehicle', { vehicleId: vehicle.id })}>
                <Icon as={MaterialIcons} name="edit" size={6} color="black" />
              </Pressable>
              <Pressable onPress={() => handleDeleteVehicle(vehicle.id)}>
                <Icon as={MaterialIcons} name="delete" size={6} color="red.500" />
              </Pressable>

            </HStack>
          </HStack>
          <HStack justifyContent="space-between" mt={2}>
            <VehicleInfo icon="calendar" label="Year" value={vehicle.year} />
            <VehicleInfo icon="palette" label="Color" value={vehicle.color} />
            <VehicleInfo icon="users" label="Capacity" value={`${vehicle.capacity} seats`} />
          </HStack>
          <HStack justifyContent="space-between" mt={2}>
            <VehicleInfo icon="id-card" label="Number" value={vehicle.vehicleNumber} />
            <VehicleInfo icon="car" label="Type" value={vehicle.type} />
          </HStack>
        </VStack>
      </HStack>
    </Box>
  ), [handleDeleteVehicle, handleToggleActive, navigation]);

  const VehicleInfo = ({ icon, label, value }) => (
    <VStack alignItems="center">
      <HStack space={1} alignItems="center">
        <Icon as={FontAwesome5} name={icon} size={3} color="gray.500" />
        <Text fontSize="xs" color="gray.500">{label}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="medium" color="black" mt={1}>
        {value}
      </Text>
    </VStack>
  );

  const getVehicleIcon = (type) => {
    if (!type) return 'car-side'; // Return a default icon if type is undefined
    switch (type.toLowerCase()) {
      case 'car': return 'car';
      case 'suv': return 'truck';
      case 'van': return 'shuttle-van';
      case 'bike': return 'motorcycle';
      default: return 'car-side';
    }
  };

  return (
    <Box flex={1} bg="white">
      <HStack alignItems="center" p={4} borderBottomWidth={1} borderBottomColor="gray.200">
        <BackButton onPress={() => navigation.goBack()} />
        <Text fontSize="xl" fontWeight="bold" ml={4} color="black">
          Your Vehicles
        </Text>
      </HStack>
      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" color="black" />
        </Box>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Icon as={FontAwesome5} name="car" size={16} color="gray.400" mb={4} />
              <Text fontSize="md" color="gray.500" textAlign="center">
                No vehicles found.
              </Text>
              <Text fontSize="sm" color="gray.400" textAlign="center" mt={2}>
                Add your first vehicle to get started! 🚗
              </Text>
            </Box>
          }
        />
      )}
      <Box position="absolute" bottom={8} right={8}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddVehicle')}
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
    padding: 16,
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
});

export default VehiclesScreen;
