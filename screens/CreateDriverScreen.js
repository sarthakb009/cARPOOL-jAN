import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Box, Heading, VStack, Button as ChakraButton, FormControl, Input, Icon, Select } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateDriverScreen = ({ navigation, route }) => {
  const { userData } = route.params;
  const [drivingLicense, setDrivingLicense] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState('');

  const handleDriverCreation = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/create', {
        drivingLicense,
        driverFirstName: userData.driverFirstName,
        driverLastName: userData.driverLastName,
        driverPhone: userData.driverPhone,
        email: userData.email,
        dateOfBirth,
        gender
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      navigation.navigate('Profile');
    } catch (error) {
      Alert.alert('Error', 'Something went wrong while creating the driver profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView>
      <Box p="6" bg="#f9f9f9" flex={1}>
        <Heading size="lg" fontWeight="600" color="coolGray.800" mb="6" textAlign="center">
          Complete Your Driver Profile
        </Heading>
        <VStack space={4}>
          <FormControl>
            <FormControl.Label>First Name</FormControl.Label>
            <Input value={userData.driverFirstName} isDisabled />
          </FormControl>
          <FormControl>
            <FormControl.Label>Last Name</FormControl.Label>
            <Input value={userData.driverLastName} isDisabled />
          </FormControl>
          <FormControl>
            <FormControl.Label>Email</FormControl.Label>
            <Input value={userData.email} isDisabled />
          </FormControl>
          <FormControl>
            <FormControl.Label>Phone</FormControl.Label>
            <Input value={userData.driverPhone} isDisabled />
          </FormControl>
          <FormControl mb="4">
            <FormControl.Label>Driving License</FormControl.Label>
            <Input
              value={drivingLicense}
              onChangeText={setDrivingLicense}
              placeholder="Enter your driving license"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              InputLeftElement={<Icon as={MaterialIcons} name="confirmation-number" size="sm" ml="4" color="#6B46C1" />}
            />
          </FormControl>
          <FormControl mb="4">
            <FormControl.Label>Gender</FormControl.Label>
            <Select
              selectedValue={gender}
              minWidth="200"
              placeholder="Select your gender"
              _selectedItem={{
                bg: "teal.600",
                endIcon: <Icon as={MaterialIcons} name="check" size="sm" />,
              }}
              mt={1}
              onValueChange={(itemValue) => setGender(itemValue)}
            >
              <Select.Item label="Male" value="male" />
              <Select.Item label="Female" value="female" />
              <Select.Item label="Other" value="other" />
            </Select>
          </FormControl>
          <FormControl mb="4">
            <FormControl.Label>Date of Birth</FormControl.Label>
            <Input
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="DD-MM-YYYY"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              InputLeftElement={<Icon as={MaterialIcons} name="calendar-today" size="sm" ml="4" color="#6B46C1" />}
            />
          </FormControl>
          <ChakraButton
            mt="4"
            colorScheme="purple"
            onPress={handleDriverCreation}
            isLoading={loading}
            rounded="full"
            px="8"
            py="4"
            _text={{ fontSize: 'lg', fontWeight: 'bold' }}
          >
            Complete Profile
          </ChakraButton>
        </VStack>
      </Box>
    </ScrollView>
  );
};

export default CreateDriverScreen;
