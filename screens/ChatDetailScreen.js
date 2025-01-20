import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Box, VStack, HStack, Input, Icon, Text, Avatar, Pressable, Spinner } from 'native-base';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { Easing } from 'react-native-reanimated';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileModal from '../components/ProfileModal';

// Dummy profile data
const dummyDriverProfile = {
  name: "John Driver",
  avatar: "https://randomuser.me/api/portraits/men/1.jpg",
  rating: 4.8,
  totalRides: 156,
  verificationStatus: true,
  vehicles: [
    {
      type: "Car",
      make: "Toyota",
      model: "Camry",
      year: "2020",
      color: "Silver",
      plateNumber: "ABC 123",
      isDefault: true,
    },
    {
      type: "Car",
      make: "Honda",
      model: "Civic",
      year: "2019",
      color: "Black",
      plateNumber: "XYZ 789",
      isDefault: false,
    }
  ],
  preferences: {
    smoking: false,
    music: true,
    ac: true,
    pets: false
  },
  stats: {
    completedRides: 156,
    totalDistance: "2,345 km",
    averageRating: 4.8,
    onTimePercentage: 98
  },
  badges: [
    {
      type: "gold",
      title: "Top Driver",
      description: "Maintained 4.8+ rating for 3 months"
    },
    {
      type: "silver",
      title: "Road Warrior",
      description: "Completed 150+ rides"
    },
    {
      type: "bronze",
      title: "Punctual Pro",
      description: "98% on-time arrival"
    }
  ]
};

const dummyPassengerProfile = {
  name: "Sarah Passenger",
  avatar: "https://randomuser.me/api/portraits/women/1.jpg",
  rating: 4.6,
  totalRides: 42,
  verificationStatus: true,
  preferences: {
    musicPreference: "Any Genre",
    chatPreference: "Friendly Chat",
    seatingPreference: "Front Seat"
  },
  stats: {
    completedRides: 42,
    averageRating: 4.6,
    onTimePercentage: 95,
    cancelRate: "2%"
  },
  badges: [
    {
      type: "gold",
      title: "Perfect Passenger",
      description: "Maintained 4.5+ rating"
    },
    {
      type: "silver",
      title: "Regular Rider",
      description: "Completed 40+ rides"
    }
  ]
};

const ChatDetailScreen = ({ route, navigation }) => {
  const { rideId, name = 'Unknown User', avatar, role = 'USER' } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rideDetails, setRideDetails] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserType, setCurrentUserType] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [passengerId, setPassengerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const scrollViewRef = useRef();

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserDetails();
      await fetchRideDetails();
      await fetchMessages();
      setIsLoading(false);
    };
    initializeData();
    const intervalId = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const fetchUserDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/user-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userDetails = response.data;
      const userType = userDetails.roles.includes('ROLE_PASSENGER') ? 'PASSENGER' : 'DRIVER';
      const userId = userDetails.roles.includes('ROLE_PASSENGER') ? userDetails.customerId : userDetails.driverId;
      setCurrentUserType(userType);
      setCurrentUserId(userId);

      if (userType === 'PASSENGER') {
        setPassengerId(userId);
      } else {
        setDriverId(userId);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchRideDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${rideId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRideDetails(response.data);
      if (currentUserType === 'PASSENGER') {
        setDriverId(response.data.driverDetails.driverId);
      } else {
        setPassengerId(response.data.passengers[0].passengerId);
      }
    } catch (error) {
      console.error('Error fetching ride details:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/chat/receive?rideId=${rideId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !currentUserId || !rideDetails) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/chat/send',
        {
          rideId: rideId,
          senderId: currentUserId.toString(),
          receiverId: currentUserType === 'DRIVER' ? passengerId.toString() : driverId.toString(),
          senderType: currentUserType,
          receiverType: currentUserType === 'DRIVER' ? 'PASSENGER' : 'DRIVER',
          message: newMessage,
          source: rideDetails.source,
          destination: rideDetails.destination,
          timestamp: new Date().toISOString(),
          status: "SENT"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  const renderMessage = (message, index) => {
    const isMyMessage = message.senderId === currentUserId?.toString();
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 300,
          delay: index * 50,
          easing: Easing.out(Easing.ease),
        }}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
        ]}
      >
        <Box
          bg={isMyMessage ? 'black' : 'white'}
          p={4}
          borderRadius="2xl"
          maxW="80%"
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
          ]}
        >
          <Text
            color={isMyMessage ? 'white' : 'gray.800'}
            fontSize="sm"
          >
            {message.message}
          </Text>
          <HStack space={1} alignItems="center" mt={1}>
            <Text
              fontSize="2xs"
              color={isMyMessage ? 'gray.300' : 'gray.500'}
            >
              {formatTime(message.dateTime)}
            </Text>
            {isMyMessage && (
              <Icon
                as={MaterialIcons}
                name="done-all"
                size={3}
                color={message.status === 'READ' ? 'blue.400' : 'gray.400'}
              />
            )}
          </HStack>
        </Box>
      </MotiView>
    );
  };

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <Spinner size="lg" color="black" />
      </Box>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingVertical: 12 }]}
      >
        <HStack alignItems="center" justifyContent="space-between">
          <HStack space={2} alignItems="center" flex={1}>
          <Pressable
  onPress={() => setShowProfile(true)}
  style={({ pressed }) => ({
    opacity: pressed ? 0.7 : 1,
    transform: [{ scale: pressed ? 0.97 : 1 }],
    flex: 1,
  })}
>
  <HStack space={2} alignItems="center">
    <Box position="relative">
      <Avatar
        source={{ uri: avatar }}
        size="xs"
        borderWidth={1.5}
        borderColor="white"
      >
        {name ? name.charAt(0) : '?'}
      </Avatar>
      <Box
        position="absolute"
        bottom={0}
        right={0}
        bg="green.500"
        w={2}
        h={2}
        rounded="full"
        borderWidth={1}
        borderColor="white"
      />
    </Box>
    <VStack flex={1}>
      <Text color="white" fontSize="sm" fontWeight="600" numberOfLines={1}>
        {name || 'Unknown User'}
      </Text>
      <Text color="gray.300" fontSize="2xs" letterSpacing="sm">
        {role ? role.charAt(0) + role.slice(1).toLowerCase() : 'User'}
      </Text>
    </VStack>
  </HStack>
</Pressable>

          </HStack>
          <HStack space={3}>
            <Pressable
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon as={Ionicons} name="call" size={5} color="white" />
            </Pressable>
            <Pressable
              onPress={() => setShowProfile(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon as={Ionicons} name="information-circle-outline" size={5} color="white" />
            </Pressable>
          </HStack>
        </HStack>
      </LinearGradient>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userData={role === 'DRIVER' ? dummyDriverProfile : dummyPassengerProfile}
        userType={role}
      />

      {rideDetails && (
        <Box
          bg="white"
          py={2}
          px={3}
          borderBottomWidth={1}
          borderBottomColor="gray.100"
          shadow={1}
        >
          <HStack space={3} alignItems="center">
            <Box
              bg="gray.50"
              p={1.5}
              borderRadius="lg"
              borderWidth={1}
              borderColor="gray.100"
            >
              <Icon as={FontAwesome5} name="route" size={4} color="black" />
            </Box>
            <VStack flex={1} space={0.5}>
              <HStack space={2} alignItems="center">
                <Text fontSize="2xs" color="gray.500" fontWeight="medium">FROM</Text>
                <Text fontSize="xs" color="gray.700" fontWeight="600" flex={1} numberOfLines={1}>
                  {rideDetails.source}
                </Text>
              </HStack>
              <HStack space={2} alignItems="center">
                <Text fontSize="2xs" color="gray.500" fontWeight="medium">TO</Text>
                <Text fontSize="xs" color="gray.700" fontWeight="600" flex={1} numberOfLines={1}>
                  {rideDetails.destination}
                </Text>
              </HStack>
            </VStack>
            <VStack alignItems="flex-end" space={0.5}>
              <HStack space={1} alignItems="center">
                <Icon as={FontAwesome5} name="calendar-alt" size={2.5} color="gray.500" />
                <Text fontSize="2xs" color="gray.600">{formatDate(rideDetails.rideDate)}</Text>
              </HStack>
              <HStack space={1} alignItems="center">
                <Icon as={FontAwesome5} name="clock" size={2.5} color="gray.500" />
                <Text fontSize="2xs" color="gray.600">
                  {formatTime(rideDetails.rideScheduledStartTime || rideDetails.rideDate)}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>
      )}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: 12 }]}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => renderMessage(message, index))}
      </ScrollView>

      <Box
        bg="white"
        p={3}
        borderTopWidth={1}
        borderTopColor="gray.100"
        shadow={3}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 4,
        }}
      >
        <HStack space={2} alignItems="center">
          <Input
            flex={1}
            placeholder="Type a message"
            value={newMessage}
            onChangeText={setNewMessage}
            variant="filled"
            bg="gray.100"
            borderRadius="xl"
            borderWidth={1}
            borderColor="gray.200"
            placeholderTextColor="gray.400"
            color="gray.800"
            py={2}
            px={3}
            fontSize="xs"
            InputLeftElement={
              <Pressable
                onPress={() => {}}
                ml={2}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon as={Ionicons} name="happy-outline" size={5} color="gray.400" />
              </Pressable>
            }
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!currentUserId || !rideDetails || !newMessage.trim()}
            style={({ pressed }) => ({
              opacity: (!currentUserId || !rideDetails || !newMessage.trim() || pressed) ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Box
              bg={(!currentUserId || !rideDetails || !newMessage.trim()) ? "gray.400" : "black"}
              p={2.5}
              borderRadius="lg"
              shadow={1}
            >
              <Icon as={Ionicons} name="send" size={4} color="white" />
            </Box>
          </Pressable>
        </HStack>
      </Box>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  },
  header: {
    padding: 12,
    paddingTop: Platform.OS === "ios" ? 45 : 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
  },
  myMessageBubble: {
    backgroundColor: 'black',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 12,
  },
  theirMessageBubble: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    padding: 12,
  },
});

export default ChatDetailScreen;