import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, Animated, Platform, Image } from 'react-native';
import { Text, Input, Button, VStack, HStack, Pressable, ScrollView, Box, Icon, useToast, Center } from 'native-base';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import birthdayImage from '../assets/Birthday cake.gif';
import ScrollableDatePickerModal from './ScrollableDatePickerModal';

const { width } = Dimensions.get('window');

const calculateAge = (birthDate) => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const OnboardingScreen = ({ route, navigation }) => {
  const { username, email } = route.params || {};
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
  const [showAgeError, setShowAgeError] = useState(false);
  const [ageErrorMessage, setAgeErrorMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

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

  const showErrorAnimation = () => {
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
  };

  const hideErrorAnimation = () => {
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
    ]).start(() => setShowAgeError(false));
  };

  const handleNext = () => {
    if (step === 2) {
      const age = calculateAge(dateOfBirth);
      if (age < 14) {
        setAgeErrorMessage("You must be at least 14 years old to use the app");
        setShowAgeError(true);
        showErrorAnimation();
        setTimeout(() => hideErrorAnimation(), 5000);
        return;
      }
      AsyncStorage.setItem('userAge', age.toString());
    }
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
        email,
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
        email,
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
    <HStack space={4} justifyContent="center" mb={6} mt={2}>
      {[1, 2, 3].map((s) => (
        <Pressable
          key={s}
          onPress={() => s < step && setStep(s)}
          opacity={s <= step ? 1 : 0.5}
        >
          <VStack alignItems="center" space={2}>
            <Box
              w="12"
              h="12"
              rounded="full"
              bg={s === step ? "black" : "white"}
              borderWidth={2}
              borderColor={s <= step ? "black" : "gray.300"}
              justifyContent="center"
              alignItems="center"
              shadow={s === step ? "2" : "none"}
            >
              <Icon 
                as={MaterialIcons} 
                name={s === 1 ? "person" : s === 2 ? "cake" : "wc"}
                size="md"
                color={s === step ? "white" : s <= step ? "black" : "gray.400"}
              />
            </Box>
            <Text
              color={s === step ? "black" : "gray.500"}
              fontWeight={s === step ? "bold" : "normal"}
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="lg"
            >
              {s === 1 ? "Profile" : s === 2 ? "Birthday" : "Gender"}
            </Text>
            {s < 3 && (
              <Box
                h="0.5"
                w="16"
                bg={s < step ? "black" : "gray.200"}
                position="absolute"
                right="-14"
                top="6"
                zIndex="-1"
              />
            )}
          </VStack>
        </Pressable>
      ))}
    </HStack>
  );

  const stepLabels = ["Personal Info", "Birthday", "Gender"];

  const renderStepContent = () => (
    <Animated.View style={[styles.stepsContainer, { transform: [{ translateX }] }]}>
      <ScrollView contentContainerStyle={styles.step}>
        <VStack space={8} width="100%" alignItems="center">
          <Box alignItems="center" space={2}>
            <Icon as={FontAwesome5} name="user-circle" size={16} color="black" mb={4} />
            <Text fontSize="3xl" fontWeight="bold" color="black" textAlign="center">
              What's your name?
            </Text>
            <Text fontSize="md" color="gray.500" textAlign="center" mt={2} mb={6}>
              Let us know how to address you
            </Text>
          </Box>
          <VStack space={4} width="100%">
            <Input
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              fontSize="lg"
              width="100%"
              borderColor="gray.300"
              _focus={{ borderColor: "black", backgroundColor: "gray.50" }}
              p={4}
              rounded="xl"
            />
            <Input
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              fontSize="lg"
              width="100%"
              borderColor="gray.300"
              _focus={{ borderColor: "black", backgroundColor: "gray.50" }}
              p={4}
              rounded="xl"
            />
          </VStack>
        </VStack>
      </ScrollView>

      <ScrollView contentContainerStyle={styles.step}>
        <VStack space={6} width="100%" alignItems="center">
          <Box alignItems="center" space={2}>
            <Text fontSize="3xl" fontWeight="bold" color="black" textAlign="center">
              When's your birthday?
            </Text>
            <Text fontSize="md" color="gray.500" textAlign="center" mt={2} mb={4}>
              We'll send you something special
            </Text>
          </Box>
          <Image source={birthdayImage} style={styles.birthdayImage} />
          <Pressable 
            onPress={() => setShowDatePicker(true)}
            width="100%"
          >
            <Box
              borderWidth={1}
              borderColor="gray.300"
              rounded="xl"
              p={4}
              bg="white"
              shadow={1}
            >
              <HStack alignItems="center" space={3}>
                <Icon as={MaterialIcons} name="event" size={6} color="black" />
                <Text fontSize="lg" color="black">
                  {dateOfBirth.toLocaleDateString('en-US', { 
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </HStack>
            </Box>
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
          <Box alignItems="center" space={2}>
            <Icon as={FontAwesome5} name="venus-mars" size={16} color="black" mb={4} />
            <Text fontSize="3xl" fontWeight="bold" color="black" textAlign="center">
              How do you identify?
            </Text>
            <Text fontSize="md" color="gray.500" textAlign="center" mt={2} mb={6}>
              Help us personalize your experience
            </Text>
          </Box>
          <VStack space={3} width="100%">
            {['Male', 'Female', 'Other', 'Prefer not to say'].map((option) => (
              <Pressable
                key={option}
                onPress={() => setGender(option.toLowerCase())}
                width="100%"
              >
                <Box
                  bg={gender.toLowerCase() === option.toLowerCase() ? "black" : "white"}
                  borderColor={gender.toLowerCase() === option.toLowerCase() ? "black" : "gray.300"}
                  borderWidth={1}
                  p={4}
                  rounded="xl"
                  shadow={gender.toLowerCase() === option.toLowerCase() ? "2" : "none"}
                >
                  <Text
                    color={gender.toLowerCase() === option.toLowerCase() ? "white" : "black"}
                    fontWeight="medium"
                    fontSize="lg"
                    textAlign="center"
                  >
                    {option}
                  </Text>
                </Box>
              </Pressable>
            ))}
          </VStack>
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

  const AgeErrorMessage = () => (
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
      <Pressable onPress={hideErrorAnimation}>
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
              {ageErrorMessage}
            </Text>
          </VStack>
          <Pressable
            onPress={hideErrorAnimation}
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
  );

  return (
    <Box style={styles.container} bg="white" safeArea>
      {step < 4 ? (
        <>
          {renderStepIndicator()}
          {renderStepContent()}
          <HStack space={4} justifyContent="center" px={6} pb={6} mt={6}>
            {step > 1 && (
              <Button
                onPress={handleBack}
                variant="outline"
                borderColor="black"
                _text={{ color: "black", fontWeight: "medium" }}
                w="40%"
                rounded="xl"
                py={4}
              >
                Back
              </Button>
            )}
            <Button
              onPress={step === 3 ? handleSubmit : handleNext}
              isLoading={loading}
              bg="black"
              _text={{ color: "white", fontWeight: "bold" }}
              w={step === 1 ? "80%" : "40%"}
              rounded="xl"
              py={4}
              shadow={2}
            >
              {step === 3 ? 'Complete' : 'Next'}
            </Button>
          </HStack>
        </>
      ) : (
        <Center flex={1} px={6}>
          <Icon as={FontAwesome5} name="check-circle" size={20} color="black" mb={6} />
          <Text fontSize="3xl" fontWeight="bold" color="black" textAlign="center" mb={4}>
            Welcome aboard, {firstName}!
          </Text>
          <Text fontSize="lg" color="gray.600" textAlign="center" mb={8}>
            Your journey with RideShare begins now. Get ready for amazing rides!
          </Text>
          <Button
            onPress={() => navigation.replace('Main')}
            bg="black"
            _text={{ color: "white", fontSize: 'lg', fontWeight: 'bold' }}
            rounded="xl"
            w="100%"
            py={4}
            shadow={2}
          >
            Start Exploring
          </Button>
        </Center>
      )}
      {showAgeError && <AgeErrorMessage />}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    width: width * 3,
  },
  step: {
    width: width,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  birthdayImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginVertical: 20,
  },
});

export default OnboardingScreen;