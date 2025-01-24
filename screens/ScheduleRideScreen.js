import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated, ScrollView, Dimensions, Easing, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Button, Input, Pressable, Modal, Progress, Switch } from 'native-base';
import { Feather, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import Slider from '@react-native-community/slider';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';

const { width } = Dimensions.get('window');
const STEPS = ['Location', 'Date & Time', 'Details', 'Confirm'];
const HERE_API_KEY = 'BLiCQHHuN3GFygSHe27hv4rRBpbto7K35v7HXYtANC8';

const ScheduleRideScreen = ({ navigation }) => {
  const route = useRoute();
  const { isEditing, rideData } = route.params || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [passengerId, setPassengerId] = useState(null);
  const [showToggle, setShowToggle] = useState(false);
  const [rideId, setRideId] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserDetails();
    if (isEditing && rideData) {
      setPickup(rideData.source);
      setDropoff(rideData.destination);
      setSelectedDate(parseISO(rideData.date));
      setTime(parseISO(`${rideData.date}T${rideData.scheduledTime}`));
      setRideId(rideData.rideId);
      setPassengerId(rideData.passengerId);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) * 25,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false
      }),
    ]).start();
  }, [currentStep]);

  const fetchUserDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/user-details',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriverId(response.data.driverId);
      setPassengerId(response.data.customerId);
     
      if (response.data.driverId && response.data.customerId) {
        setShowToggle(true);
        setIsDriver(true);
      } else if (response.data.driverId) {
        setIsDriver(true);
      } else if (response.data.customerId) {
        setIsDriver(false);
      } else {
        Alert.alert('Error', 'User has no valid role. Please contact support.');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details. Please try again.');
    }
  };

  const handleLocationSelect = (isPickup) => {
    navigation.navigate('SelectLocation', {
      isPickup,
      onSelect: (location, coords) => {
        if (isPickup) {
          setPickup(location);
          setFromCoords(coords);
        } else {
          setDropoff(location);
          setToCoords(coords);
        }
        if (pickup && dropoff) setCurrentStep(1);
      },
    });
  };

  const handleTimeChange = (value) => {
    const newTime = new Date(time);
    newTime.setHours(Math.floor(value));
    newTime.setMinutes((value % 1) * 60);
    setTime(newTime);
  };

  const handleDateChange = (day) => {
    setSelectedDate(new Date(day.timestamp));
    setShowCalendar(false);
  };

  const handleScheduleRide = async () => {
    if (!pickup || !dropoff || !selectedDate || !time) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
 
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
 
      const payload = {
        passengerId: isDriver ? null : passengerId,
        driverId: isDriver ? driverId : null,
        date: format(selectedDate, 'yyyy-MM-dd'),
        source: pickup,
        destination: dropoff,
        scheduledTime: format(time, 'HH:mm'),
        status: "Scheduled"
      };
 
      console.log('Payload:', JSON.stringify(payload, null, 2));
 
      let response;
      if (isEditing) {
        // Always use the edit endpoint when in editing mode
        response = await axios.put(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/edit?id=${rideId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        response = await axios.post(
          'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/scheduled-rides',
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
 
      if (response.data) {
        Alert.alert('Success', isEditing ? 'Ride updated successfully!' : 'Ride scheduled successfully!');
        navigation.navigate('ScheduledRides');  // Navigate back to the Scheduled Rides screen
      }
    } catch (error) {
      console.error('Error scheduling/updating ride:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      Alert.alert('Error', 'Failed to schedule/update ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <VStack space={4}>
            {showToggle && (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                  <HStack alignItems="center" justifyContent="space-between">
                    <Text fontSize="md" fontWeight="semibold" color="#333">
                      {isDriver ? "Driver" : "Passenger"} Mode
                    </Text>
                    <Switch
                      isChecked={isDriver}
                      onToggle={() => setIsDriver(!isDriver)}
                      colorScheme="blue"
                    />
                  </HStack>
                </Box>
              </Animated.View>
            )}
            {['pickup', 'dropoff'].map((type, index) => (
              <Animated.View
                key={type}
                style={{
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ],
                }}
              >
                <Pressable onPress={() => handleLocationSelect(type === 'pickup')}>
                  <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                    <HStack alignItems="center">
                      <Icon
                        as={MaterialIcons}
                        name="location-on"
                        size={6}
                        color={type === 'pickup' ? "blue.500" : "red.500"}
                        mr={3}
                      />
                      <VStack flex={1}>
                        <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                          {type === 'pickup' ? 'Pickup' : 'Drop-off'}
                        </Text>
                        <Text fontSize="md" fontWeight="semibold" color="#333">
                          {type === 'pickup' ? (pickup || 'Select pickup location') : (dropoff || 'Select drop-off location')}
                        </Text>
                      </VStack>
                      <Icon as={Feather} name="chevron-right" size={6} color="gray.400" />
                    </HStack>
                  </Box>
                </Pressable>
              </Animated.View>
            ))}
          </VStack>
        );
      case 1:
        return (
          <VStack space={4}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
              <Pressable onPress={() => setShowCalendar(true)}>
                <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                  <HStack alignItems="center" justifyContent="space-between">
                    <VStack>
                      <Text fontSize="md" fontWeight="semibold" color="#333">
                        {selectedDate.toDateString()}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Tap to change date
                      </Text>
                    </VStack>
                    <Icon as={AntDesign} name="calendar" size={6} color="blue.500" />
                  </HStack>
                </Box>
              </Pressable>
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
              <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                <Text fontSize="md" fontWeight="semibold" mb={2} color="#333">
                  Select Time: {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Slider
                  style={{width: '100%', height: 40}}
                  minimumValue={0}
                  maximumValue={24}
                  step={0.5}
                  value={time.getHours() + time.getMinutes() / 60}
                  onValueChange={handleTimeChange}
                  minimumTrackTintColor="#4299e1"
                  maximumTrackTintColor="#d1d5db"
                  thumbTintColor="#4299e1"
                />
              </Box>
            </Animated.View>
          </VStack>
        );
      case 2:
        return (
          <VStack space={4}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
              <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                <Input
                  placeholder="Additional notes"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  fontSize="md"
                  color="#333"
                />
              </Box>
            </Animated.View>
          </VStack>
        );
      case 3:
        return (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
            <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
              <VStack space={2}>
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold" color="#333">Role:</Text>
                  <Text color="#333">{isDriver ? "Driver" : "Passenger"}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold" color="#333">Pickup:</Text>
                  <Text color="#333">{pickup}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold" color="#333">Drop-off:</Text>
                  <Text color="#333">{dropoff}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold" color="#333">Date:</Text>
                  <Text color="#333">{selectedDate.toDateString()}</Text>
                </HStack>
                <HStack justifyContent="space-between">
                  <Text fontWeight="bold" color="#333">Time:</Text>
                  <Text color="#333">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </HStack>
                <Text fontWeight="bold" color="#333">Notes:</Text>
                <Text color="#333">{notes || 'No additional notes'}</Text>
              </VStack>
            </Box>
          </Animated.View>
        );
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <VStack space={6}>
        <HStack justifyContent="space-between" alignItems="center">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <Text fontSize="3xl" fontWeight="bold" color="#333">
              {isEditing ? 'Edit Your Ride' : 'Schedule Your Ride'}
            </Text>
          </Animated.View>
          <Button
            onPress={handleGoBack}
            variant="ghost"
            colorScheme="blue"
            leftIcon={<Icon as={Feather} name="arrow-left" size="sm" />}
          >
            Back
          </Button>
        </HStack>
       
        <Animated.View style={{ width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
          <Progress value={100} colorScheme="blue" />
        </Animated.View>
       
        <HStack justifyContent="space-between" mb={4}>
          {STEPS.map((step, index) => (
            <Animated.View
              key={step}
              style={{
                opacity: fadeAnim,
                transform: [{ scale: currentStep >= index ? scaleAnim : 1 }]
              }}
            >
              <Text
                fontSize="sm"
                fontWeight={currentStep === index ? "bold" : "normal"}
                color={currentStep >= index ? "blue.500" : "gray.400"}
              >
                {step}
              </Text>
            </Animated.View>
          ))}
        </HStack>

        {renderStep()}

        <HStack justifyContent="space-between" mt={6}>
          {currentStep > 0 && (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
              <Button
                onPress={() => setCurrentStep(currentStep - 1)}
                variant="ghost"
                colorScheme="blue"
                leftIcon={<Icon as={Feather} name="arrow-left" size="sm" />}
              >
                Back
              </Button>
            </Animated.View>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: Animated.multiply(slideAnim, -1) }] }}>
              <Button
                onPress={() => setCurrentStep(currentStep + 1)}
                colorScheme="blue"
                rightIcon={<Icon as={Feather} name="arrow-right" size="sm" />}
              >
                Next
              </Button>
            </Animated.View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
              <Button
                onPress={handleScheduleRide}
                colorScheme="blue"
                isLoading={loading}
              >
                {isEditing ? 'Update Ride' : 'Schedule Ride'}
              </Button>
            </Animated.View>
          )}
        </HStack>
      </VStack>

      <Modal isOpen={showCalendar} onClose={() => setShowCalendar(false)} size="full">
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>Select Date</Modal.Header>
          <Modal.Body>
            <Calendar
              onDayPress={handleDateChange}
              markedDates={{[selectedDate.toISOString().split('T')[0]]: {selected: true, selectedColor: '#4299e1'}}}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#4299e1',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4299e1',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#4299e1',
                selectedDotColor: '#ffffff',
                arrowColor: '#4299e1',
                monthTextColor: '#4299e1',
                indicatorColor: '#4299e1',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 16
              }}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
});

export default ScheduleRideScreen;