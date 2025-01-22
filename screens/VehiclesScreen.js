import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Button, useToast, FlatList, Spinner, Pressable } from 'native-base';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const VehicleCard = useCallback(({ vehicle, index }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 500,
        delay: index * 100,
        easing: Easing.out(Easing.ease),
      }}
    >
      <Box
        bg="white"
        borderRadius="2xl"
        shadow={2}
        mb={4}
        borderWidth={1}
        borderColor="gray.100"
        style={{
          shadowColor: "#718096",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <VStack space={3} p={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={3} alignItems="center" flex={1}>
              <Box
                bg="gray.100"
                p={3}
                borderRadius="xl"
                style={{
                  shadowColor: "#718096",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Icon
                  as={FontAwesome5}
                  name={getVehicleIcon(vehicle.type)}
                  size={6}
                  color="gray.700"
                />
              </Box>
              <VStack flex={1}>
                <Text fontSize="lg" fontWeight="700" color="gray.800" numberOfLines={1}>
                  {vehicle.make} {vehicle.model}
                </Text>
                <Text fontSize="sm" color="gray.500" numberOfLines={1}>
                  {vehicle.vehicleNumber}
                </Text>
              </VStack>
            </HStack>
            <HStack space={4} alignItems="center">
              {/* Comment out default toggle button */}
              {/*<Pressable 
                onPress={() => handleToggleActive(vehicle.id, vehicle.isDefault)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Box
                  bg={vehicle.isDefault ? "black" : "gray.100"}
                  p={2}
                  borderRadius="lg"
                >
                  <Icon
                    as={MaterialIcons}
                    name={vehicle.isDefault ? "check-circle" : "radio-button-unchecked"}
                    size={5}
                    color={vehicle.isDefault ? "white" : "gray.500"}
                  />
                </Box>
              </Pressable>*/}
              <HStack space={2}>
                <Pressable 
                  onPress={() => navigation.navigate('AddVehicle', { vehicleId: vehicle.id })}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Box
                    bg="gray.100"
                    p={2}
                    borderRadius="lg"
                  >
                    <Icon as={MaterialIcons} name="edit" size={5} color="gray.700" />
                  </Box>
                </Pressable>
                <Pressable 
                  onPress={() => handleDeleteVehicle(vehicle.id)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Box
                    bg="red.50"
                    p={2}
                    borderRadius="lg"
                  >
                    <Icon as={MaterialIcons} name="delete" size={5} color="red.500" />
                  </Box>
                </Pressable>
              </HStack>
            </HStack>
          </HStack>

          <Box 
            bg="gray.50" 
            p={3} 
            borderRadius="xl"
            borderWidth={1}
            borderColor="gray.100"
          >
            <HStack justifyContent="space-between">
              <VehicleInfoItem icon="calendar" label="Year" value={vehicle.year} />
              <VehicleInfoItem icon="palette" label="Color" value={vehicle.color} />
              <VehicleInfoItem icon="users" label="Seats" value={vehicle.vehicleCapacity} />
              <VehicleInfoItem icon="car" label="Type" value={vehicle.type || 'Car'} />
            </HStack>
          </Box>

          {/* Comment out default vehicle badge */}
          {/*vehicle.isDefault && (
            <Box
              bg="black"
              px={3}
              py={1.5}
              borderRadius="full"
              alignSelf="flex-start"
            >
              <Text color="white" fontSize="xs" fontWeight="600">
                DEFAULT VEHICLE
              </Text>
            </Box>
          )*/}
        </VStack>
      </Box>
    </MotiView>
  ), [handleDeleteVehicle, handleToggleActive, navigation]);

  const VehicleInfoItem = ({ icon, label, value }) => (
    <VStack alignItems="center" space={1}>
      <HStack space={1} alignItems="center">
        <Icon as={FontAwesome5} name={icon} size={3} color="gray.500" />
        <Text fontSize="xs" color="gray.500" fontWeight="medium">
          {label}
        </Text>
      </HStack>
      <Text fontSize="sm" fontWeight="600" color="gray.700">
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
      {/* Modern Header Design */}
      <Box>
        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 150,
          }}
        />
        <Box safeAreaTop style={styles.headerContainer}>
          <HStack 
            alignItems="flex-start" 
            px={4} 
            pt={4}
            pb={6}
            space={4}
          >
            <Box>
              <BackButton onPress={() => navigation.goBack()} />
            </Box>
            <VStack flex={1} space={2}>
              <HStack alignItems="center" space={3}>
                <Box
                  bg="black"
                  p={2}
                  borderRadius="xl"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Icon 
                    as={FontAwesome5} 
                    name="car" 
                    size={5} 
                    color="white" 
                  />
                </Box>
                <VStack>
                  <Text 
                    fontSize="2xl" 
                    fontWeight="700" 
                    color="gray.900"
                    letterSpacing={0.5}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 1,
                    }}
                  >
                    Your Vehicles
                  </Text>
                  <Text 
                    fontSize="xs" 
                    color="gray.500"
                    letterSpacing={0.5}
                    mt={0.5}
                  >
                    {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} registered
                  </Text>
                </VStack>
              </HStack>
              <Box
                bg="gray.100"
                borderRadius="2xl"
                p={3}
                mt={2}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <HStack space={4} justifyContent="space-between">
                  <HStack space={2} alignItems="center">
                    <Icon 
                      as={FontAwesome5} 
                      name="info-circle" 
                      size={4} 
                      color="gray.500" 
                    />
                    <Text fontSize="xs" color="gray.600" fontWeight="500">
                      Add vehicles to start offering rides
                    </Text>
                  </HStack>
                  <Pressable
                    onPress={() => navigation.navigate('AddVehicle')}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text fontSize="xs" color="black" fontWeight="600">
                      Add New
                    </Text>
                  </Pressable>
                </HStack>
              </Box>
            </VStack>
          </HStack>
        </Box>
      </Box>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" color="black" />
        </Box>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={({ item, index }) => <VehicleCard vehicle={item} index={index} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 500 }}
            >
              <Box 
                bg="white" 
                borderRadius="2xl" 
                p={6} 
                alignItems="center"
                shadow={2}
                mt={6}
              >
                <Icon 
                  as={FontAwesome5} 
                  name="car" 
                  size={12} 
                  color="gray.400" 
                  mb={4} 
                />
                <Text 
                  fontSize="lg" 
                  fontWeight="600" 
                  color="gray.700" 
                  textAlign="center"
                >
                  No vehicles yet
                </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.500" 
                  textAlign="center" 
                  mt={2}
                >
                  Add your first vehicle to start offering rides! 🚗
                </Text>
                <Button
                  onPress={() => navigation.navigate('AddVehicle')}
                  mt={6}
                  bg="black"
                  _pressed={{ bg: 'gray.800' }}
                  startIcon={<Icon as={Ionicons} name="add" size="sm" />}
                >
                  Add Your First Vehicle
                </Button>
              </Box>
            </MotiView>
          }
        />
      )}

      {vehicles.length > 0 && (
        <Box position="absolute" bottom={8} right={8}>
          <MotiView
            from={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              delay: 300,
            }}
          >
            <Pressable
              onPress={() => navigation.navigate('AddVehicle')}
              style={({ pressed }) => [
                styles.fabButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] }
              ]}
            >
              <Icon as={Ionicons} name="add" size="lg" color="white" />
            </Pressable>
          </MotiView>
        </Box>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  headerContainer: {
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
});

export default VehiclesScreen;
