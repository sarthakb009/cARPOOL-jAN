import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { Box, HStack, Button } from 'native-base';
import SearchRideScreen from './SearchRideScreen';
import OfferRideScreen from './OfferRideScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';


const HomeScreen = () => {
  const [selectedTab, setSelectedTab] = useState('searchRide');
  const [userData, setUserData] = useState(null);
  const [userAge, setUserAge] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/get?username=${username}`);
      setUserData(response.data);
      if (response.data && response.data.dateOfBirth) {
        const age = calculateAge(response.data.dateOfBirth);
        setUserAge(age);
        await AsyncStorage.setItem('userAge', age.toString());
        console.log('User Age:', age);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'searchRide':
        return <SearchRideScreen />;
      case 'offerRide':
        return <OfferRideScreen />;
      default:
        return <SearchRideScreen />;
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Box flex={1} p={4} bg="#f9f9f9">
        <HStack justifyContent="center" mb={4} space={4}>
          <Button
            onPress={() => setSelectedTab('searchRide')}
            bg={selectedTab === 'searchRide' ? 'black' : 'gray.300'}
            colorScheme="black"
            _text={{
              color: selectedTab === 'searchRide' ? 'white' : 'black',
              fontWeight: 'bold',
            }}
            rounded="full"
            px={6}
            py={3}
          >
            Find a ride
          </Button>
          {userAge !== null && userAge >= 18 && (
            <Button
              onPress={() => setSelectedTab('offerRide')}
              bg={selectedTab === 'offerRide' ? 'black' : 'gray.300'}
              colorScheme="black"
              _text={{
                color: selectedTab === 'offerRide' ? 'white' : 'black',
                fontWeight: 'bold',
              }}
              rounded="full"
              px={6}
              py={3}
            >
              Offer a ride
            </Button>
          )}
        </HStack>
        {renderContent()}
      </Box>
    </ScrollView>
  );
};

export default HomeScreen;
