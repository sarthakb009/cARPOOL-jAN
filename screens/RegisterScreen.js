import React, { useState, useRef } from 'react';
import { ScrollView, Animated, FlatList, Modal as RNModal } from 'react-native';
import { Box, Heading, VStack, FormControl, Input, Button as ChakraButton, Text, HStack, Icon, Center,Pressable, Select, CheckIcon } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountryPicker } from 'react-native-country-codes-picker';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [errorMessage, setErrorMessage] = useState('');
  const [country, setCountry] = useState(''); // Store selected country
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');

  const handleRegister = async () => {
    if (phone.length !== 10) {
      showErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }

    if (!country) {
      showErrorMessage("Please select your country");
      return;
    }

    if (!username) {
      showErrorMessage("Please enter a username");
      return;
    } 

    if (!email) {
      showErrorMessage("Please enter an email");
      return;
    }

    setLoading(true);
    try {
      // Create the user with country
      await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/create', {
        username,
        password,
        email,
        phone,
        country,
      });
  
      // Login to get the token and user ID
      const loginResponse = await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/token', {
        username,
        password,
      });
  
      const [userId, token] = loginResponse.data.split(' ');
  
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('username', username);
  
      // Pass both username and email to Onboarding
      navigation.replace('Onboarding', { username, email });
    } catch (error) {
      // Detailed error logging
      console.error('Full error object:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error message:', error.message);

      // Get the error message from the response
      const errorMessage = error.response?.data || error.message;
      
      // Show the actual error message from the server
      showErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showErrorMessage = (message) => {
    setErrorMessage(message);
    setShowError(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => hideErrorMessage(), 5000);
  };

  const hideErrorMessage = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowError(false));
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Box p="6" bg="#f9f9f9" flex={1} justifyContent="center" alignItems="center">
        <Heading size="xl" fontWeight="700" color="coolGray.800" mb="1" textAlign="center">
          Create an Account
        </Heading>
        <Text fontSize="lg" color="coolGray.500" textAlign="center">
          Welcome!
        </Text>
        <Text fontSize="lg" color="coolGray.500" mb="6" textAlign="center">
          Join us to get started!
        </Text>
        <VStack space={4} w="90%" maxW="300px">
          <FormControl>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
            />
          </FormControl>
          <FormControl>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              keyboardType="email-address"
            />
          </FormControl>
          <FormControl>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              keyboardType="phone-pad"
            />
          </FormControl>
          <FormControl>
            <Pressable
              onPress={() => setShowCountryPicker(true)}
            >
              <Box
                bg="white"
                borderRadius="md"
                borderColor="coolGray.300"
                borderWidth={1}
                px="4"
                py="3"
                _hover={{ bg: "coolGray.100" }}
              >
                <HStack space={2} alignItems="center">
                  <Text color={selectedCountry ? "coolGray.800" : "coolGray.400"}>
                    {selectedCountry || "Select Your Country"}
                  </Text>
                  {selectedCountryCode && (
                    <Text color="coolGray.500">
                      ({selectedCountryCode})
                    </Text>
                  )}
                  <Icon
                    as={Ionicons}
                    name="chevron-down"
                    size="sm"
                    color="coolGray.500"
                    ml="auto"
                  />
                </HStack>
              </Box>
            </Pressable>

            {/* Country Picker Modal */}
            <CountryPicker
              show={showCountryPicker}
              // when picked, show in custom text format
              pickerButtonOnPress={(item) => {
                setSelectedCountry(item.name.en);
                setSelectedCountryCode(item.dial_code);
                setCountry(item.name.en);
                setShowCountryPicker(false);
              }}
              style={{
                modal: {
                  height: 500,
                  backgroundColor: 'white'
                },
                dialCode: {
                  color: '#000000'
                },
                countryName: {
                  color: '#000000'
                },
                searchInput: {
                  color: '#000000',
                  backgroundColor: '#F4F4F5',
                  borderRadius: 8,
                  height: 45,
                  marginBottom: 16,
                  paddingLeft: 16
                },
                textInput: {
                  height: 45,
                  backgroundColor: '#F4F4F5',
                  borderRadius: 8,
                  paddingLeft: 16,
                  color: '#000000'
                },
                line: {
                  backgroundColor: '#E4E4E7'
                },
                itemsList: {
                  backgroundColor: 'white'
                }
              }}
              onBackdropPress={() => setShowCountryPicker(false)}
              enableModalAvoiding={true}
              searchPlaceholder="Search country..."
              showCloseButton={true}
              showModalTitle={true}
              modalTitle="Select Country"
              lang="en"
            />
          </FormControl>
          <FormControl>
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              InputRightElement={
                <Pressable onPress={() => setShowPassword(!showPassword)} mr="3">
                  <Icon
                    as={Ionicons}
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size="sm"
                    color="coolGray.500"
                  />
                </Pressable>
              }
            />
          </FormControl>
          <Text textAlign="center" color="coolGray.500" mb="4">
            OR
          </Text>
          <HStack space={4} justifyContent="center" mb="4">
            <Icon as={Ionicons} name="logo-google" size="lg" color="coolGray.800" />
            <Icon as={Ionicons} name="logo-facebook" size="lg" color="coolGray.800" />
            <Icon as={Ionicons} name="logo-apple" size="lg" color="coolGray.800" />
          </HStack>
          <ChakraButton
            mt="4"
            bg="black"
            onPress={handleRegister}
            isLoading={loading}
            rounded="full"
            px="8"
            py="4"
            _text={{ fontSize: 'lg', fontWeight: 'bold', color: 'white' }}
            _hover={{ bg: "black" }}
            _pressed={{ bg: "black" }}
          >
            Register
          </ChakraButton>
          <Text
            mt="4"
            textAlign="center"
            color="coolGray.600"
            onPress={() => navigation.navigate('Login')}
          >
            Already have an account? <Text color="black">Sign In</Text>
          </Text>
        </VStack>
      </Box>
      {showError && (
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Pressable onPress={hideErrorMessage}>
          <Box
            bg="white"
            p="4"
            rounded="xl"
            flexDirection="row"
            alignItems="center"
            shadow="3"
            borderLeftWidth={4}
            borderLeftColor="red.500"
          >
            <Icon
              as={Ionicons}
              name="alert-circle"
              size="md"
              color="red.500"
              mr="3"
            />
            <VStack flex={1} space={0.5}>
              <Text color="coolGray.800" fontWeight="medium" fontSize="sm">
                {errorMessage || "Something went wrong"} 
              </Text>
            </VStack>
            <Pressable
              onPress={hideErrorMessage}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                as={Ionicons}
                name="close"
                size="sm"
                color="coolGray.500"
              />
            </Pressable>
          </Box>
        </Pressable>
      </Animated.View>
    )}

    </ScrollView>
  );
};

export default RegisterScreen;