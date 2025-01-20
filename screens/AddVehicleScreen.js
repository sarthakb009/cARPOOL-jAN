import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Box, VStack, HStack, Text, Input, Button, Icon, useToast, Switch, FormControl, Heading } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../components/sharedComponents';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const AddVehicleScreen = ({ navigation, route }) => {
  const [vehicleData, setVehicleData] = useState({
    vehicleNumber: '',
    drivingLicense: '',
    capacity: '',
    model: '',
    make: '',
    year: '',
    type: '', // This should be either 'Car' or 'Bike'
    color: '',
    smoking: false,
    music: false,
    ac: false,
    storage: false,
    luggage: false,
    isDefault: false
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const vehicleId = route.params?.vehicleId;

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleDetails();
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleData.type === 'Bike') {
      setVehicleData(prev => ({ ...prev, capacity: '1' }));
    }
  }, [vehicleData.type]);

  const fetchVehicleDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/getById?id=${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicleData(prevData => ({
        ...prevData,
        ...response.data,
        capacity: response.data.capacity ? response.data.capacity.toString() : ''
      }));
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      toast.show({
        title: "Error",
        description: "Failed to load vehicle details",
        status: "error"
      });
    }
  };

  const handleChange = (name, value) => {
    setVehicleData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!vehicleData.vehicleNumber || !vehicleData.drivingLicense || !vehicleData.type) {
      toast.show({
        title: "Incomplete Information",
        description: "Please fill in all required fields",
        status: "warning"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const driverId = await AsyncStorage.getItem('driverId');
      
      if (!driverId) {
        throw new Error('Driver ID not found');
      }

      const payload = {
        ...vehicleData,
        riderId: parseInt(driverId),
        capacity: vehicleData.type === 'Bike' ? 1 : parseInt(vehicleData.capacity) || null
      };

      if (vehicleId) {
        await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/edit?id=${vehicleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.show({
          title: "Success",
          description: "Vehicle updated successfully",
          status: "success"
        });
      } else {
        await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/vehicle/create', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.show({
          title: "Success",
          description: "Vehicle added successfully",
          status: "success"
        });
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      toast.show({
        title: "Error",
        description: error.message === 'Driver ID not found' 
          ? "Driver ID not found. Please log in again." 
          : "Failed to submit vehicle information",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const vehicleTypes = [
    { type: 'Car', icon: 'car-sport-outline' },
    { type: 'Bike', icon: 'bicycle-outline' },
  ];

  const features = [
    { name: 'smoking', label: 'Smoking', icon: 'smoking-outline' },
    { name: 'music', label: 'Music', icon: 'musical-notes-outline' },
    { name: 'ac', label: 'AC', icon: 'thermometer-outline' },
    { name: 'storage', label: 'Storage', icon: 'cube-outline' },
    { name: 'luggage', label: 'Luggage', icon: 'briefcase-outline' },
  ];

  const renderVehicleTypeItem = (item) => (
    <TouchableOpacity key={item.type} onPress={() => handleChange('type', item.type)}>
      <Box
        bg={vehicleData.type === item.type ? 'black' : 'gray.200'}
        p={3}
        borderRadius="lg"
        alignItems="center"
        justifyContent="center"
        width={width * 0.25}
        height={width * 0.25}
        mr={3}
      >
        <Icon
          as={Ionicons}
          name={item.icon}
          size={6}
          color={vehicleData.type === item.type ? 'white' : 'black'}
        />
        <Text
          mt={1}
          fontSize="xs"
          fontWeight="medium"
          color={vehicleData.type === item.type ? 'white' : 'black'}
        >
          {item.type}
        </Text>
      </Box>
    </TouchableOpacity>
  );

  const renderFeatureItem = (item) => (
    <TouchableOpacity 
      key={item.name} 
      onPress={() => handleChange(item.name, !vehicleData[item.name])}
    >
      <Box
        bg={vehicleData[item.name] ? 'black' : 'gray.200'}
        p={2}
        borderRadius="lg"
        alignItems="center"
        justifyContent="center"
        width={width * 0.18}
        height={width * 0.18}
        mr={2}
      >
        <Icon
          as={Ionicons}
          name={item.icon}
          size={4}
          color={vehicleData[item.name] ? 'white' : 'black'}
        />
        <Text
          mt={1}
          fontSize="2xs"
          fontWeight="medium"
          color={vehicleData[item.name] ? 'white' : 'black'}
        >
          {item.label}
        </Text>
      </Box>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Box mb={6}>
          <BackButton onPress={() => navigation.goBack()} />
          <Heading size="xl" fontWeight="bold" mt={4}>
            {vehicleId ? 'Edit' : 'Add'} Vehicle
          </Heading>
        </Box>
        <VStack space={4}>
          <Box style={styles.card}>
            <Heading size="sm" mb={2}>Basic Information</Heading>
            <VStack space={4}>
              <FormControl isRequired>
                <FormControl.Label _text={styles.label}>Number</FormControl.Label>
                <Input
                  value={vehicleData.vehicleNumber}
                  onChangeText={(value) => handleChange('vehicleNumber', value)}
                  style={styles.input}
                  placeholder="MH 23 AS 2343"
                  InputLeftElement={<Icon as={Ionicons} name="car-outline" size={5} ml={2} color="gray.400" />}
                />
              </FormControl>
              {vehicleData.type === 'Car' && (
                <FormControl>
                  <FormControl.Label _text={styles.label}>Capacity</FormControl.Label>
                  <Input
                    value={vehicleData.capacity}
                    onChangeText={(value) => handleChange('capacity', value)}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="4"
                    InputLeftElement={<Icon as={Ionicons} name="people-outline" size={5} ml={2} color="gray.400" />}
                  />
                </FormControl>
              )}
              <FormControl isRequired>
                <FormControl.Label _text={styles.label}>Driving License</FormControl.Label>
                <Input
                  value={vehicleData.drivingLicense}
                  onChangeText={(value) => handleChange('drivingLicense', value)}
                  style={styles.input}
                  placeholder="ADSFDSFS"
                  InputLeftElement={<Icon as={Ionicons} name="document-outline" size={5} ml={2} color="gray.400" />}
                />
              </FormControl>
            </VStack>
          </Box>

          <Box style={styles.card}>
            <Heading size="sm" mb={2}>Vehicle Details</Heading>
            <VStack space={4}>
              <HStack space={4}>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Make</FormControl.Label>
                  <Input
                    value={vehicleData.make}
                    onChangeText={(value) => handleChange('make', value)}
                    style={styles.input}
                    placeholder="Toyota"
                    InputLeftElement={<Icon as={Ionicons} name="construct-outline" size={5} ml={2} color="gray.400" />}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Model</FormControl.Label>
                  <Input
                    value={vehicleData.model}
                    onChangeText={(value) => handleChange('model', value)}
                    style={styles.input}
                    placeholder="Camry"
                    InputLeftElement={<Icon as={Ionicons} name="car-sport-outline" size={5} ml={2} color="gray.400" />}
                  />
                </FormControl>
              </HStack>
              <HStack space={4}>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Year</FormControl.Label>
                  <Input
                    value={vehicleData.year}
                    onChangeText={(value) => handleChange('year', value)}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="2023"
                    InputLeftElement={<Icon as={Ionicons} name="calendar-outline" size={5} ml={2} color="gray.400" />}
                  />
                </FormControl>
                <FormControl flex={1}>
                  <FormControl.Label _text={styles.label}>Color</FormControl.Label>
                  <Input
                    value={vehicleData.color}
                    onChangeText={(value) => handleChange('color', value)}
                    style={styles.input}
                    placeholder="Black"
                    InputLeftElement={<Icon as={Ionicons} name="color-palette-outline" size={5} ml={2} color="gray.400" />}
                  />
                </FormControl>
              </HStack>
              <FormControl isRequired>
                <FormControl.Label _text={styles.label}>Vehicle Type</FormControl.Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {vehicleTypes.map(renderVehicleTypeItem)}
                </ScrollView>
              </FormControl>
            </VStack>
          </Box>

          <Box style={styles.card}>
            <Heading size="sm" mb={2}>Features</Heading>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {features.map(renderFeatureItem)}
            </ScrollView>
          </Box>

          <Box style={styles.card}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="medium">Set as Default Vehicle</Text>
              <Switch
                isChecked={vehicleData.isDefault}
                onToggle={(value) => handleChange('isDefault', value)}
                colorScheme="emerald"
              />
            </HStack>
          </Box>

          <Button
            onPress={handleSubmit}
            isLoading={loading}
            style={styles.submitButton}
            leftIcon={<Icon as={Ionicons} name="add-circle-outline" size="sm" />}
          >
            <HStack alignItems="center" space={2}>
              <Text style={styles.submitButtonText}>{vehicleId ? 'Update' : 'Add'}</Text>
              <Text style={styles.submitButtonText}>Vehicle</Text>
            </HStack>
          </Button>
        </VStack>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: 'medium',
    color: 'gray.500',
  },
  input: {
    height: 40,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'gray.300',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: 'black',
    height: 50,
    borderRadius: 25,
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default AddVehicleScreen;