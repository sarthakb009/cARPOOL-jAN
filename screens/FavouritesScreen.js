import React, { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Box, Heading, VStack, Button, HStack, Text } from 'native-base';
import { styles, CustomInput, BackButton } from '../components/sharedComponents';

const FavouritesScreen = ({ navigation }) => {
  const [favourite, setFavourite] = useState('');

  const handleSelectFavourite = () => {
    navigation.navigate('SelectLocation', {
      isPickup: true, 
      onSelect: (location) => setFavourite(location),
    });
  };

  const handleSaveFavourite = () => {
  };

  return (
    <Box style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <HStack alignItems="center" mb={4}>
          <BackButton onPress={() => navigation.goBack()} />
          <Heading size="lg" ml={4}>
            Favourite Location
          </Heading>
        </HStack>

        <TouchableOpacity onPress={handleSelectFavourite}>
          <CustomInput
            label="Favourite Location"
            value={favourite}
            placeholder="Select favourite location"
            icon="star"
            isReadOnly
          />
        </TouchableOpacity>

        <Button onPress={handleSaveFavourite} colorScheme="purple" style={styles.button}>
          Save Favourite
        </Button>
      </ScrollView>
    </Box>
  );
};

export default FavouritesScreen;
