import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box, Heading, VStack, FormControl, Input, Button as ChakraButton, Text, HStack, Icon } from 'native-base';



const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      // Create the user
      await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/create', {
        username,
        password,
        email,
        phone,
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
  
      // Navigate to onboarding
      navigation.replace('Onboarding', { username });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response && error.response.data === 'User with email already exists as a passenger!') {
        Toast.show({
          title: "Registration Failed",
          description: "This email is already registered. Please use a different email or try logging in.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        Toast.show({
          title: "Registration Error",
          description: "Something went wrong during registration. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
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
            <Input
              type="password"
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
              secureTextEntry
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
    </ScrollView>
  );
};

export default RegisterScreen;