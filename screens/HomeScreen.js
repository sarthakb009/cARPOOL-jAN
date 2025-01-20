import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box, HStack, Button } from 'native-base';
import SearchRideScreen from './SearchRideScreen';
import OfferRideScreen from './OfferRideScreen';

const HomeScreen = () => {
  const [selectedTab, setSelectedTab] = useState('searchRide');

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
        <HStack justifyContent="center" mb={4}>
          <Button
            onPress={() => setSelectedTab('searchRide')}
            bg={selectedTab === 'searchRide' ? 'black' : 'gray.300'}
            colorScheme="black"
            _text={{
              color: selectedTab === 'searchRide' ? 'white' : 'black',
              fontWeight: 'bold',
            }}
            rounded="full"
            px={4}
            py={2}
            mx={2}
          >
            Find a ride
          </Button>
          <Button
            onPress={() => setSelectedTab('offerRide')}
            bg={selectedTab === 'offerRide' ? 'black' : 'gray.300'}
            colorScheme="black"
            _text={{
              color: selectedTab === 'offerRide' ? 'white' : 'black',
              fontWeight: 'bold',
            }}
            rounded="full"
            px={4}
            py={2}
            mx={2}
          >
            Offer a ride
          </Button>
        </HStack>
        {renderContent()}
      </Box>
    </ScrollView>
  );
};

export default HomeScreen;
