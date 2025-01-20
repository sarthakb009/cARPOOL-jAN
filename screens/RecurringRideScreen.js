import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Animated, ScrollView, Dimensions, Easing, Alert, Platform } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Button, Pressable, Modal, Progress, useDisclose, Select, FlatList, Switch } from 'native-base';
import { Feather, MaterialIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, setHours, setMinutes } from 'date-fns';

const { width } = Dimensions.get('window');
const STEPS = ['Location', 'Schedule', 'Confirm'];

const RecurringRidesScreen = () => {
    const navigation = useNavigation()
    const [currentStep, setCurrentStep] = useState(0);
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarType, setCalendarType] = useState('start');
    const [time, setTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [frequency, setFrequency] = useState('WEEKLY');
    const [userDetails, setUserDetails] = useState(null);
    const [isDriver, setIsDriver] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const { isOpen: isTimePickerOpen, onOpen: onTimePickerOpen, onClose: onTimePickerClose } = useDisclose();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 20, friction: 7, useNativeDriver: true }),
            Animated.timing(progressAnim, {
                toValue: (currentStep + 1) * 33.33,
                duration: 500,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false
            }),
        ]).start();
    }, [currentStep]);

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(
                'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/user-details',
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            setUserDetails(response.data);
            setIsDriver(response.data.roles === "ROLE_DRIVER");
        } catch (error) {
            console.error('Error fetching user details:', error);
            Alert.alert('Error', 'Failed to fetch user details. Please try again.');
        }
    };

    const handleLocationSelect = (isPickup) => {
        navigation.navigate('SelectLocation', {
            isPickup,
            onSelect: (location) => {
                if (isPickup) {
                    setPickup(location);
                } else {
                    setDropoff(location);
                }
                if (pickup && dropoff) setCurrentStep(1);
            },
        });
    };

    const handleDateChange = (day) => {
        if (calendarType === 'start') {
            setStartDate(new Date(day.timestamp));
        } else {
            setEndDate(new Date(day.timestamp));
        }
        setShowCalendar(false);
    };

    const handleTimeChange = (hours, minutes) => {
        const newTime = setMinutes(setHours(new Date(), hours), minutes);
        setTime(newTime);
        onTimePickerClose();
    };

    const handleScheduleRecurringRide = async () => {
        if (!pickup || !dropoff || !startDate || !endDate || !time || !frequency || !userDetails) {
            Alert.alert('Error', 'Please fill in all fields and ensure user details are loaded');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            const payload = {
                driverId: isDriver ? userDetails.driverId : null,
                passengerId: isDriver ? null : userDetails.customerId,
                frequency: frequency,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                timeOfDay: format(time, 'HH:mm')
            };

            console.log('Payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post(
                'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/add',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data) {
                Alert.alert('Success', `Recurring ride scheduled successfully! Ride ID: ${response.data}`);
                navigation.navigate('Home');
            }
        } catch (error) {
            console.error('Error scheduling recurring ride:', error);
            Alert.alert('Error', 'Failed to schedule recurring ride. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <VStack space={4}>
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
                            <Pressable onPress={() => { setShowCalendar(true); setCalendarType('start'); }}>
                                <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                                    <HStack alignItems="center" justifyContent="space-between">
                                        <VStack>
                                            <Text fontSize="md" fontWeight="semibold" color="#333">
                                                Start Date: {format(startDate, 'MMM dd, yyyy')}
                                            </Text>
                                            <Text fontSize="sm" color="gray.500">
                                                Tap to change start date
                                            </Text>
                                        </VStack>
                                        <Icon as={AntDesign} name="calendar" size={6} color="blue.500" />
                                    </HStack>
                                </Box>
                            </Pressable>
                        </Animated.View>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                            <Pressable onPress={() => { setShowCalendar(true); setCalendarType('end'); }}>
                                <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                                    <HStack alignItems="center" justifyContent="space-between">
                                        <VStack>
                                            <Text fontSize="md" fontWeight="semibold" color="#333">
                                                End Date: {format(endDate, 'MMM dd, yyyy')}
                                            </Text>
                                            <Text fontSize="sm" color="gray.500">
                                                Tap to change end date
                                            </Text>
                                        </VStack>
                                        <Icon as={AntDesign} name="calendar" size={6} color="blue.500" />
                                    </HStack>
                                </Box>
                            </Pressable>
                        </Animated.View>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                            <Pressable onPress={onTimePickerOpen}>
                                <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                                    <HStack alignItems="center" justifyContent="space-between">
                                        <VStack>
                                            <Text fontSize="md" fontWeight="semibold" color="#333">
                                                Time: {format(time, 'hh:mm a')}
                                            </Text>
                                            <Text fontSize="sm" color="gray.500">
                                                Tap to change time
                                            </Text>
                                        </VStack>
                                        <Icon as={Ionicons} name="time-outline" size={6} color="blue.500" />
                                    </HStack>
                                </Box>
                            </Pressable>
                        </Animated.View>
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                            <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                                <Text fontSize="md" fontWeight="semibold" mb={2} color="#333">
                                    Frequency
                                </Text>
                                <Select
                                    selectedValue={frequency}
                                    onValueChange={(value) => setFrequency(value)}
                                >
                                    <Select.Item label="Daily" value="DAILY" />
                                    <Select.Item label="Weekly" value="WEEKLY" />
                                    <Select.Item label="Monthly" value="MONTHLY" />
                                </Select>
                            </Box>
                        </Animated.View>
                    </VStack>
                );
            case 2:
                return (
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                        <Box bg="white" p={4} borderRadius="2xl" shadow={3}>
                            <VStack space={2}>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Pickup:</Text>
                                    <Text color="#333">{pickup}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Drop-off:</Text>
                                    <Text color="#333">{dropoff}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Start Date:</Text>
                                    <Text color="#333">{format(startDate, 'MMM dd, yyyy')}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">End Date:</Text>
                                    <Text color="#333">{format(endDate, 'MMM dd, yyyy')}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Time:</Text>
                                    <Text color="#333">{format(time, 'hh:mm a')}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Frequency:</Text>
                                    <Text color="#333">{frequency}</Text>
                                </HStack>
                                <HStack justifyContent="space-between">
                                    <Text fontWeight="bold" color="#333">Role:</Text>
                                    <Text color="#333">{isDriver ? 'Driver' : 'Passenger'}</Text>
                                </HStack>
                            </VStack>
                        </Box>
                    </Animated.View>
                );
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <VStack space={6}>
                <HStack justifyContent="space-between" alignItems="center">
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                        <Text fontSize="3xl" fontWeight="bold" color="#333">
                            Recurring Ride
                        </Text>
                    </Animated.View>
                    <Button
                        onPress={() => navigation.goBack()}
                        variant="ghost"
                        colorScheme="blue"
                        leftIcon={<Icon as={Feather} name="arrow-left" size="sm" />}
                    >
                        Back
                    </Button>
                </HStack>

                <Animated.View style={{ width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
                    <Progress value={100} colorScheme="blue" size="xs" />
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

                <HStack alignItems="center" space={4}>
                    <Text fontSize="md" fontWeight="medium" color="#333">
                        {isDriver ? "Driver" : "Passenger"}
                    </Text>
                    <Switch
                        isChecked={isDriver}
                        onToggle={() => setIsDriver(!isDriver)}
                        colorScheme="blue"
                    />
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
                                onPress={handleScheduleRecurringRide}
                                colorScheme="blue"
                                rightIcon={<Icon as={Ionicons} name="repeat" size="sm" />}
                                isLoading={loading}
                            >
                                Schedule Recurring Ride
                            </Button>
                        </Animated.View>
                    )}
                </HStack>
            </VStack>

            <Modal isOpen={showCalendar} onClose={() => setShowCalendar(false)} size="full">
                <Modal.Content maxWidth="400px">
                    <Modal.CloseButton />
                    <Modal.Header>Select {calendarType === 'start' ? 'Start' : 'End'} Date</Modal.Header>
                    <Modal.Body>
                        <Calendar
                            onDayPress={handleDateChange}
                            markedDates={{
                                [startDate.toISOString().split('T')[0]]: { selected: true, selectedColor: '#4299e1' },
                                [endDate.toISOString().split('T')[0]]: { selected: true, selectedColor: '#4299e1' }
                            }}
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

            <Modal isOpen={isTimePickerOpen} onClose={onTimePickerClose} size="lg">
                <Modal.Content maxWidth="350">
                    <Modal.CloseButton />
                    <Modal.Header>Select Time</Modal.Header>
                    <Modal.Body>
                        <FlatList
                            data={Array.from({ length: 24 * 4 }, (_, i) => {
                                const hours = Math.floor(i / 4);
                                const minutes = (i % 4) * 15;
                                return setMinutes(setHours(new Date(), hours), minutes);
                            })}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => handleTimeChange(item.getHours(), item.getMinutes())}
                                    py={2}
                                >
                                    <Text
                                        fontSize="lg"
                                        color={format(item, 'HH:mm') === format(time, 'HH:mm') ? "blue.500" : "gray.800"}
                                        fontWeight={format(item, 'HH:mm') === format(time, 'HH:mm') ? "bold" : "normal"}
                                    >
                                        {format(item, 'hh:mm a')}
                                    </Text>
                                </Pressable>
                            )}
                            keyExtractor={(item) => item.toISOString()}
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

export default RecurringRidesScreen;