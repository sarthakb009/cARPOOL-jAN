import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Box, VStack, HStack, Text, Icon } from 'native-base';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../components/sharedComponents';
import { useNavigation } from '@react-navigation/native';

const DriverProfileScreen = () => {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  const fetchDriverData = useCallback(async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/getById?id=${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriverData(response.data);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setError('Failed to fetch driver data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <ActivityIndicator size="large" color="#000" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  const getInitials = () => {
    const firstInitial = driverData.driverFirstName ? driverData.driverFirstName[0] : '';
    const lastInitial = driverData.driverLastName ? driverData.driverLastName[0] : '';
    return (firstInitial + lastInitial).toUpperCase() || 'D';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <HStack alignItems="center" p="4" borderBottomWidth={1} borderColor="gray.200">
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Driver Profile</Text>
      </HStack>
      
      <VStack space={6} mt={6} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold" color="black">
          {driverData.driverFirstName} {driverData.driverLastName}
        </Text>
        <Text fontSize="md" color="gray.500" italic>
          "Driving you towards a greener future!"
        </Text>
      </VStack>

      <VStack space={6} mt={6} alignItems="center">
        <Box style={styles.infoCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <VStack space={4}>
            <HStack justifyContent="space-between">
              <InfoItem icon="phone" label="Phone" value={driverData.driverPhone} />
              <InfoItem icon="envelope" label="Email" value={driverData.email} />
            </HStack>
            <HStack justifyContent="space-between">
              <InfoItem icon="birthday-cake" label="Age" value={`${calculateAge(driverData.dateOfBirth)} years`} />
              <InfoItem icon="venus-mars" label="Gender" value={driverData.gender} />
            </HStack>
          </VStack>
        </Box>

        <Box style={styles.infoCard}>
          <Text style={styles.cardTitle}>Vehicle Information</Text>
          {driverData.vehicles && driverData.vehicles.length > 0 ? (
            driverData.vehicles.map((vehicle, index) => (
              <VStack key={index} space={2} mt={2}>
                <HStack justifyContent="space-between">
                  <InfoItem icon="car" label="Vehicle" value={`${vehicle.make} ${vehicle.model}`} />
                  <InfoItem icon="calendar" label="Year" value={vehicle.year} />
                </HStack>
                <HStack justifyContent="space-between">
                  <InfoItem icon="palette" label="Color" value={vehicle.color} />
                  <InfoItem icon="id-card" label="Number" value={vehicle.vehicleNumber} />
                </HStack>
              </VStack>
            ))
          ) : (
            <Text style={styles.noVehicleText}>No vehicle yet? Time to add your eco-friendly ride!</Text>
          )}
        </Box>

        <Box style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account Status</Text>
          <VStack space={2}>
            <StatusItem 
              label="License Verified" 
              value={driverData.licenseVerified} 
              message={driverData.licenseVerified ? "You're all set to hit the road!" : "Let's get that license verified ASAP!"}
            />
            <StatusItem 
              label="Account Status" 
              value={!driverData.banned} 
              reversed 
              message={!driverData.banned ? "Keep up the great work!" : "Oops! Let's get your account back on track."}
            />
          </VStack>
        </Box>
      </VStack>
    </ScrollView>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <Box width="48%">
    <HStack space={2} alignItems="center">
      <Icon as={FontAwesome5} name={icon} size={4} color="black" />
      <VStack>
        <Text fontSize="xs" color="gray.500">{label.toUpperCase()}</Text>
        <Text fontSize="sm" fontWeight="medium" color="black" numberOfLines={1} ellipsisMode="tail">
          {value}
        </Text>
      </VStack>
    </HStack>
  </Box>
);

const StatusItem = ({ label, value, reversed = false, message }) => (
  <VStack>
    <HStack justifyContent="space-between" alignItems="center">
      <Text fontSize="md" color="gray.600">{label}</Text>
      <Text 
        fontSize="md" 
        fontWeight="bold" 
        color={reversed ? (value ? 'green.500' : 'red.500') : (value ? 'green.500' : 'red.500')}
      >
        {reversed ? (value ? 'Active' : 'Banned') : (value ? 'Yes' : 'No')}
      </Text>
    </HStack>
    <Text fontSize="sm" color="gray.500" italic>
      {message}
    </Text>
  </VStack>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F7FAFC',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    flex: 1,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: "#718096",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  noVehicleText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default DriverProfileScreen;