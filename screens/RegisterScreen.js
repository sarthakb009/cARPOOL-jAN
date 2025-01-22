import React, { useState, useRef } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Heading, VStack, FormControl, Input, Button as ChakraButton, Text, HStack, Icon, Center,Pressable, Select, CheckIcon } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [country, setCountry] = useState('');

  const countries = [
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    // Add more countries as needed
  ];

  const handleRegister = async () => {
    if (phone.length !== 10) {
      showErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }

    if (!country) {
      showErrorMessage("Please select your country");
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
      console.error('Registration error:', error);
      showErrorMessage(error?.response?.data?.message || "Registration failed. Please try again.");
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
            <Select
              selectedValue={country}
              minWidth="200"
              accessibilityLabel="Choose Country"
              placeholder="Select Your Country"
              _selectedItem={{
                bg: "coolGray.100",
                endIcon: <CheckIcon size="5" color="black" />
              }}
              bg="white"
              borderRadius="md"
              borderColor="coolGray.300"
              px="4"
              py="3"
              _hover={{ bg: "coolGray.100" }}
              _focus={{ bg: "coolGray.100" }}
              onValueChange={itemValue => setCountry(itemValue)}
            >
              {countries.map((country) => (
                <Select.Item 
                  key={country.code} 
                  label={country.name} 
                  value={country.name}
                />
              ))}
            </Select>
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
            bottom: 20,
            left: 20,
            right: 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Box bg="red.500"
            p="4"
            rounded="2xl"
            flexDirection="row"
            alignItems="center"
            shadow={5}
          >
            <Center w="60px" h="60px" mr="4">
              <Text fontSize="4xl">😕</Text>
            </Center>
            <VStack flex={1}>
              <Text color="white" fontWeight="bold" fontSize="lg">
                Registration Failed
              </Text>
              <Text color="white" fontSize="sm">
                {errorMessage || "An unexpected error occurred. Please try again."}
              </Text>
            </VStack>
            <Icon as={Ionicons} name="close-circle-outline" size="sm" color="white" onPress={hideErrorMessage} />
          </Box>
        </Animated.View>
      )}
    </ScrollView>
  );
};

export default RegisterScreen;