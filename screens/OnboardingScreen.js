import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, Animated, Platform, Image } from 'react-native';
import { Text, Input, Button, VStack, HStack, Pressable, ScrollView, Box, Icon, useToast } from 'native-base';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import birthdayImage from '../assets/Birthday cake.gif';
import ScrollableDatePickerModal from './ScrollableDatePickerModal';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ route, navigation }) => {
  const { username } = route.params || {};
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [passengerId, setPassengerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        setToken(storedToken);
        setUserId(storedUserId);

        if (username) {
          const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/get?username=${username}`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });

          const { customerId, driverId, firstName, lastName, dateOfBirth, gender } = response.data;

          setPassengerId(customerId);
          setDriverId(driverId);
          setFirstName(firstName || '');
          setLastName(lastName || '');
          setDateOfBirth(dateOfBirth ? new Date(dateOfBirth) : new Date());
          setGender(gender || '');

          await AsyncStorage.setItem('passengerId', customerId.toString());
          await AsyncStorage.setItem('driverId', driverId.toString());
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [username]);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: step - 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const customerPayload = {
        firstName,
        lastName,
        email: username,
        type: 'passenger',
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
        gender
      };

      await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/customer/edit?id=${passengerId}`, customerPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const driverPayload = {
        driverFirstName: firstName,
        driverLastName: lastName,
        email: username,
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
        gender
      };

      await axios.put(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/edit?id=${driverId}`, driverPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStep(4);
    } catch (error) {
      console.error('Error during onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateX = animation.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -width, -width * 2],
  });

  const renderStepIndicator = () => (
    <HStack space={2} justifyContent="center" my={4}>
      {[1, 2, 3].map((s) => (
        <Box
          key={s}
          w={2}
          h={2}
          rounded="full"
          bg={s === step ? "black" : "gray.300"}
        />
      ))}
    </HStack>
  );

  const renderStepContent = () => (
    <Animated.View style={[styles.stepsContainer, { transform: [{ translateX }] }]}>
      <ScrollView contentContainerStyle={styles.step}>
        <VStack space={6} width="100%" alignItems="center">
          <Icon as={FontAwesome5} name="user-circle" size={20} color="black" />
          <Text fontSize="3xl" fontWeight="bold" color="black">
            What's your name?
          </Text>
          <Input
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            fontSize="xl"
            width="100%"
            borderColor="gray.300"
            _focus={{ borderColor: "black" }}
          />
          <Input
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            fontSize="xl"
            width="100%"
            borderColor="gray.300"
            _focus={{ borderColor: "black" }}
          />
        </VStack>
      </ScrollView>

      <ScrollView contentContainerStyle={styles.step}>
        <VStack space={6} width="100%" alignItems="center">
          <Text fontSize="3xl" fontWeight="bold" color="black">
            When's your birthday?
          </Text>
          <Image source={birthdayImage} style={styles.birthdayImage} />
          <Pressable onPress={() => setShowDatePicker(true)}>
            <HStack
              alignItems="center"
              borderWidth={1}
              borderColor="gray.300"
              rounded="lg"
              px={4}
              py={3}
              space={2}
            >
              <Icon as={MaterialIcons} name="event" size={6} color="black" />
              <Text fontSize="lg" color="black">
                {dateOfBirth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </HStack>
          </Pressable>
          <ScrollableDatePickerModal
            isOpen={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onSelect={(date) => {
              setDateOfBirth(date);
              setShowDatePicker(false);
            }}
            initialDate={dateOfBirth}
          />
        </VStack>
      </ScrollView>

      <ScrollView contentContainerStyle={styles.step}>
        <VStack space={6} width="100%" alignItems="center">
          <Icon as={FontAwesome5} name="venus-mars" size={20} color="black" />
          <Text fontSize="3xl" fontWeight="bold" color="black">
            How do you identify?
          </Text>
          {['Male', 'Female', 'Other', 'Prefer not to say'].map((option) => (
            <Pressable
              key={option}
              onPress={() => setGender(option.toLowerCase())}
              width="100%"
            >
              <Box
                bg={gender.toLowerCase() === option.toLowerCase() ? "black" : "white"}
                borderColor="black"
                borderWidth={1}
                p={4}
                rounded="lg"
              >
                <Text
                  color={gender.toLowerCase() === option.toLowerCase() ? "white" : "black"}
                  fontWeight="bold"
                  fontSize="lg"
                  textAlign="center"
                >
                  {option}
                </Text>
              </Box>
            </Pressable>
          ))}
        </VStack>
      </ScrollView>
    </Animated.View>
  );

  const renderConfirmation = () => (
    <VStack space={6} alignItems="center" justifyContent="center" flex={1}>
      <Icon as={FontAwesome5} name="check-circle" size={20} color="black" />
      <Text fontSize="3xl" fontWeight="bold" color="black" textAlign="center">
        Welcome aboard, {firstName}!
      </Text>
      <Text fontSize="xl" color="gray.600" textAlign="center" px={6}>
        Your journey with RideShare begins now. Get ready for amazing rides!
      </Text>
      <Button
        onPress={() => navigation.replace('Main')}
        bg="black"
        _text={{ color: "white", fontSize: 'lg', fontWeight: 'bold' }}
        rounded="full"
        w="80%"
        py={4}
      >
        Start Exploring
      </Button>
    </VStack>
  );

  return (
    <Box style={styles.container} bg="white">
      {step < 4 ? (
        <>
          {renderStepIndicator()}
          {renderStepContent()}
          <HStack space={4} justifyContent="center" mb={6}>
            {step > 1 && (
              <Button
                onPress={handleBack}
                variant="outline"
                borderColor="black"
                _text={{ color: "black" }}
                w="40%"
                rounded="full"
              >
                Back
              </Button>
            )}
            <Button
              onPress={step === 3 ? handleSubmit : handleNext}
              isLoading={loading}
              bg="black"
              _text={{ color: "white" }}
              w={step === 1 ? "80%" : "40%"}
              rounded="full"
            >
              {step === 3 ? 'Submit' : 'Next'}
            </Button>
          </HStack>
        </>
      ) : renderConfirmation()}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  stepsContainer: {
    flexDirection: 'row',
    width: width * 3,
  },
  step: {
    width: width,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  birthdayImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});

export default OnboardingScreen;