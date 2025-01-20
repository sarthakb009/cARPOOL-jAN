// RecurringRidesListScreen.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Switch, Spinner, useToast } from 'native-base';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useAnimatedStyle,
    withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const RecurringRidesListScreen = () => {
    const navigation = useNavigation();
    const [isDriver, setIsDriver] = useState(true);
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchRides();
    }, [isDriver]);

    const fetchRides = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const userId = await AsyncStorage.getItem(isDriver ? 'driverId' : 'passengerId');
            const endpoint = isDriver
                ? `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/GetByDriverId?driverId=${userId}`
                : `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/RecurringRides/GetByPassengerId?passengerId=${userId}`;

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRides(response.data);
        } catch (error) {
            console.error('Error fetching recurring rides:', error);
            toast.show({
                title: "Error",
                description: "Failed to fetch recurring rides. Please try again.",
                status: "error"
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRides();
    };

    const handleLocationSelection = (selectedLocation) => {
        // Handle the selected location
        console.log('Location selected:', selectedLocation);
        // You can update state or perform other actions here
    };

    const renderRideCard = (ride) => (
        <Pressable
            key={ride.rideId}
            onPress={() => navigation.navigate('RideDetails', { rideId: ride.rideId })}
        >
            <Box
                bg="black"
                rounded="xl"
                shadow={3}
                mb={4}
                overflow="hidden"
            >
                <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    start={[0, 0]}
                    end={[1, 1]}
                >
                    <VStack space={3} p={4}>
                        {/* Main Ride Info */}
                        <HStack justifyContent="space-between" alignItems="center">
                            <VStack flex={1} mr={2}>
                                <Text fontSize="lg" fontWeight="bold" color="white" numberOfLines={1} ellipsizeMode="tail">
                                    Ride #{ride.rideId}
                                </Text>
                                <HStack alignItems="center" mt={1}>
                                    <Icon as={MaterialCommunityIcons} name="repeat" size="sm" color="gray.400" mr={1} />
                                    <Text fontSize="sm" color="gray.400">{ride.frequency}</Text>
                                </HStack>
                            </VStack>
                            <Box
                                bg={
                                    ride.frequency === 'DAILY' ? 'green.500' :
                                        ride.frequency === 'WEEKLY' ? 'blue.500' : 'purple.500'
                                }
                                px={2}
                                py={1}
                                rounded="full"
                            >
                                <Text color="white" fontSize="xs" fontWeight="bold">
                                    {ride.frequency}
                                </Text>
                            </Box>
                        </HStack>

                        {/* Date and Time Info */}
                        <HStack space={4} mt={2}>
                            <VStack flex={1}>
                                <Text fontSize="xs" color="gray.400">Start Date</Text>
                                <Text fontSize="sm" color="white" fontWeight="semibold">
                                    {format(new Date(ride.startDate), 'MMM dd, yyyy')}
                                </Text>
                            </VStack>
                            <VStack flex={1}>
                                <Text fontSize="xs" color="gray.400">End Date</Text>
                                <Text fontSize="sm" color="white" fontWeight="semibold">
                                    {format(new Date(ride.endDate), 'MMM dd, yyyy')}
                                </Text>
                            </VStack>
                            <VStack flex={1}>
                                <Text fontSize="xs" color="gray.400">Time</Text>
                                <Text fontSize="sm" color="white" fontWeight="semibold">
                                    {ride.timeOfDay.slice(0, 5)}
                                </Text>
                            </VStack>
                        </HStack>

                        {/* User Info */}
                        <HStack alignItems="center" mt={2}>
                            <Icon as={Feather} name={isDriver ? "user" : "truck"} size="sm" color="gray.400" mr={2} />
                            <Text fontSize="sm" color="gray.400">
                                {isDriver ? `Passenger ID: ${ride.passengerId || 'Not assigned'}` :
                                    `Driver ID: ${ride.driverId || 'Not assigned'}`}
                            </Text>
                        </HStack>
                    </VStack>
                </LinearGradient>
            </Box>
        </Pressable>
    );

    const togglePosition = isDriver ? 120 : 0;
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: withSpring(togglePosition, {
                damping: 15,
                stiffness: 120
            })
        }]
    }));

    return (
        <Box flex={1} bg="white" safeArea>
            <Box style={styles.headerContainer}>
                <HStack alignItems="center" mb={4} width="100%">
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon as={Ionicons} name="chevron-back" size="lg" color="gray.800" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        Recurring Rides
                    </Text>
                </HStack>

                <Box style={styles.toggleWrapper}>
                    <Pressable
                        onPress={() => {
                            setIsDriver(!isDriver);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setLoading(true);
                        }}
                    >
                        <Box style={styles.toggleContainer}>
                            <Animated.View style={[styles.toggleIndicator, animatedStyle]} />
                            <HStack width="100%" px={2}>
                                <Box style={styles.toggleTextContainer}>
                                    <Text style={[
                                        styles.toggleText,
                                        !isDriver && styles.toggleTextActive
                                    ]}>
                                        Passenger
                                    </Text>
                                </Box>
                                <Box style={styles.toggleTextContainer}>
                                    <Text style={[
                                        styles.toggleText,
                                        isDriver && styles.toggleTextActive
                                    ]}>
                                        Driver
                                    </Text>
                                </Box>
                            </HStack>
                        </Box>
                    </Pressable>
                </Box>
            </Box>

            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {loading ? (
                    <Spinner size="lg" color="black" />
                ) : rides.length > 0 ? (
                    rides.map(renderRideCard)
                ) : (
                    <Box flex={1} justifyContent="center" alignItems="center">
                        <Icon as={MaterialCommunityIcons} name="calendar-blank" size="6xl" color="gray.300" mb={4} />
                        <Text fontSize="lg" color="gray.500">No recurring rides found</Text>
                    </Box>
                )}

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('CreateRecurringRide', {
                        source: 'RecurringRidesListScreen',
                        onLocationSelect: handleLocationSelection,
                    })}
                >
                    <Icon as={Feather} name="plus" size="lg" color="white" />
                </TouchableOpacity>
            </ScrollView>
        </Box>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
    },
    addButton: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginLeft: 12,
        flex: 1,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
    },
    toggleWrapper: {
        alignItems: 'center',
        marginTop: 8,
    },
    toggleContainer: {
        width: 240,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        position: 'relative',
        padding: 4,
    },
    toggleIndicator: {
        position: 'absolute',
        width: 116,
        height: 32,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleTextContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        zIndex: 1,
    },
    toggleTextActive: {
        color: '#000000',
    },
});

export default RecurringRidesListScreen;