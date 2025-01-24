import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Heading, VStack, FormControl, Input, Button as ChakraButton, Text, HStack, Icon, Pressable, Center, Checkbox } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Load saved username, password and save password preference
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('username');
        const savedPassword = await AsyncStorage.getItem('password');
        const savedPreference = await AsyncStorage.getItem('savePassword');
        
        if (savedUsername) setUsername(savedUsername);
        if (savedPassword) setPassword(savedPassword);
        setSavePassword(savedPreference === 'true');
      } catch (error) {
        console.error('Error loading credentials:', error);
      }
    };
    loadCredentials();
  }, []);

  // Handle save password preference change
  const handleSavePasswordChange = async (value) => {
    setSavePassword(value);
    try {
      await AsyncStorage.setItem('savePassword', value.toString());
      
      // If save password is turned off, remove saved password
      if (!value) {
        await AsyncStorage.removeItem('password');
      }
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setShowError(false);
    try {
      const response = await axios.post('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/token', {
        username,
        password,
      });

      // Save credentials if checkbox is checked
      if (savePassword) {
        await AsyncStorage.setItem('username', username);
        await AsyncStorage.setItem('password', password);
      } else {
        await AsyncStorage.removeItem('password');
      }

      const [userId, token] = response.data.split(' ');
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('username', username);

      const userResponse = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/get?username=${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = userResponse.data;

      // Store passenger and driver IDs
      await AsyncStorage.setItem('passengerId', userData.customerId.toString());
      await AsyncStorage.setItem('driverId', userData.driverId.toString());

      // Check if all required fields are filled
      const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'gender'];
      const isProfileComplete = requiredFields.every(field => userData[field] != null && userData[field] !== '');

      if (isProfileComplete) {
        navigation.replace('Main');
      } else {
        navigation.replace('Onboarding', { username });
      }
    } catch (error) {
      console.error('Login error:', error);
      showErrorMessage();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const showErrorMessage = () => {
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
          Let's Sign you in.
        </Heading>
        <Text fontSize="lg" color="coolGray.500" textAlign="center">
          Welcome back
        </Text>
        <Text fontSize="lg" color="coolGray.500" mb="6" textAlign="center">
          You've been missed!
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
          <FormControl>
            <Checkbox
              isChecked={savePassword}
              onChange={handleSavePasswordChange}
              accessibilityLabel="Save Password"
            >
              Save Password
            </Checkbox>
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
            onPress={handleLogin}
            isLoading={loading}
            rounded="full"
            px="8"
            py="4"
            _text={{ fontSize: 'lg', fontWeight: 'bold', color: 'white' }}
            _hover={{ bg: "black" }}
            _pressed={{ bg: "black" }}
          >
            Sign In
          </ChakraButton>
          <Text
            mt="4"
            textAlign="center"
            color="coolGray.600"
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            Forgot Password?
          </Text>
          <Text
            mt="4"
            textAlign="center"
            color="coolGray.600"
            onPress={() => navigation.navigate('Register')}
          >
            Don't have an account? <Text color="black">Register</Text>
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
            Login Failed
          </Text>
          <Text color="coolGray.600" fontSize="xs">
            Invalid username or password
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

export default LoginScreen;
