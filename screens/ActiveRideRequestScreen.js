// screens/ActiveRideRequestScreen.js
import React from 'react';
import { ScrollView } from 'react-native';
import { Box, Heading, VStack, Text, HStack, Spinner, IconButton, Icon } from 'native-base';
import CustomButton from '../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';

const ActiveRideRequestScreen = ({ navigation }) => {
  return (
    <ScrollView>
      <Box p="4" bg="#f9f9f9">
        <HStack alignItems="center" mb="4">
          <IconButton
            icon={<Icon as={MaterialIcons} name="arrow-back" />}
            onPress={() => navigation.goBack()}
            _icon={{ color: "black", size: "md" }}
            _hover={{ bg: "gray.200" }}
            _pressed={{ bg: "gray.300" }}
            rounded="full"
          />
          <Heading size="lg" fontWeight="600" color="coolGray.800" ml="2">
            Searching for drivers
          </Heading>
        </HStack>
        <Box bg="white" shadow="2" rounded="lg" p="4" mb="4">
          <Text fontSize="md" color="coolGray.800" fontWeight="500" mb="3">
            Searching for drivers
          </Text>
          <Text fontSize="sm" color="coolGray.500" mb="3">
            There are about 4 rides near your area currently... please wait
          </Text>
          <HStack alignItems="center" justifyContent="center" mb="4">
            <Spinner color="#6B46C1" size="lg" />
          </HStack>
          <CustomButton variant="secondary" onPress={() => navigation.navigate('RideDetails')}>
            Cancel
          </CustomButton>
        </Box>
      </Box>
    </ScrollView>
  );
};

export default ActiveRideRequestScreen;
