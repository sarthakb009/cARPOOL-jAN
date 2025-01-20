import React, { useState, useRef } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Heading, VStack, FormControl, Input, Button as ChakraButton, Text, Center, Icon, Pressable } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const ForgotPasswordScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isError, setIsError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  const showNotification = (error = false) => {
    setIsError(error);
    setShowMessage(true);
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

    setTimeout(() => hideNotification(), 5000);
  };

  const hideNotification = () => {
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
    ]).start(() => setShowMessage(false));
  };

  const handleUpdatePassword = async () => {
    if (!username || !newPassword) {
      showNotification(true);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/updatePassword`,
        null,
        {
          params: {
            username: username,
            newPassword: newPassword,
          },
        }
      );

      if (response.status === 200) {
        showNotification(false);
        setTimeout(() => navigation.navigate('Login'), 2000);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Box p="6" bg="#f9f9f9" flex={1} justifyContent="center" alignItems="center">
        <Heading size="xl" fontWeight="700" color="coolGray.800" mb="1" textAlign="center">
          Reset Password
        </Heading>
        <Text fontSize="lg" color="coolGray.500" textAlign="center">
          Don't worry!
        </Text>
        <Text fontSize="lg" color="coolGray.500" mb="6" textAlign="center">
          We'll help you recover it.
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
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
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
          <ChakraButton
            mt="4"
            bg="black"
            onPress={handleUpdatePassword}
            isLoading={loading}
            rounded="full"
            px="8"
            py="4"
            _text={{ fontSize: 'lg', fontWeight: 'bold', color: 'white' }}
            _hover={{ bg: "black" }}
            _pressed={{ bg: "black" }}
          >
            Reset Password
          </ChakraButton>
          <Text
            mt="4"
            textAlign="center"
            color="coolGray.600"
            onPress={() => navigation.navigate('Login')}
          >
            Remember your password? <Text color="black">Sign In</Text>
          </Text>
        </VStack>
      </Box>
      {showMessage && (
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
          <Pressable onPress={hideNotification}>
            <Box
              bg={isError ? "red.500" : "green.500"}
              p="4"
              rounded="2xl"
              flexDirection="row"
              alignItems="center"
              shadow={5}
            >
              <Center w="60px" h="60px" mr="4">
                <Text fontSize="4xl">{isError ? "😕" : "✅"}</Text>
              </Center>
              <VStack flex={1}>
                <Text color="white" fontWeight="bold" fontSize="lg">
                  {isError ? "Password Reset Failed" : "Success!"}
                </Text>
                <Text color="white" fontSize="sm">
                  {isError
                    ? "Please check your username and try again."
                    : "Password updated successfully! Redirecting to login..."}
                </Text>
              </VStack>
              <Icon as={Ionicons} name="close-circle-outline" size="sm" color="white" onPress={hideNotification} />
            </Box>
          </Pressable>
        </Animated.View>
      )}
    </ScrollView>
  );
};

export default ForgotPasswordScreen; 