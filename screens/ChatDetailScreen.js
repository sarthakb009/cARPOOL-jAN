import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Box, VStack, HStack, Input, Icon, Text, Avatar, Pressable, Spinner } from 'native-base';
import { Ionicons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatDetailScreen = ({ route, navigation }) => {
  const { rideId, name } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rideDetails, setRideDetails] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserType, setCurrentUserType] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [passengerId, setPassengerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Box style={styles.header}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon as={Ionicons} name="arrow-back" size={6} color="white" />
          </Pressable>
          <Avatar
            source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
            size="sm"
            borderWidth={2}
            borderColor="white"
          />
          <VStack>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>{currentUserType === 'DRIVER' ? 'Passenger' : 'Driver'}</Text>
          </VStack>
        </HStack>
        <HStack space={4}>
          <TouchableOpacity>
            <Icon as={Ionicons} name="call" size={6} color="white" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon as={Ionicons} name="information-circle-outline" size={6} color="white" />
          </TouchableOpacity>
        </HStack>
      </Box>

      {rideDetails && (
        <Box bg="white" py={2} px={4} borderBottomWidth={1} borderBottomColor="gray.200">
          <HStack justifyContent="space-between" alignItems="center">
            <HStack space={2} alignItems="center" flex={1}>
              <Icon as={Feather} name="map-pin" size={4} color="black" />
              <Text fontSize="xs" numberOfLines={1} flex={1}>{rideDetails.source} → {rideDetails.destination}</Text>
            </HStack>
            <HStack space={2} alignItems="center">
              <Icon as={Feather} name="calendar" size={4} color="black" />
              <Text fontSize="xs">{formatDate(rideDetails.rideDate)}</Text>
              <Icon as={Feather} name="clock" size={4} color="black" />
              <Text fontSize="xs">{formatTime(rideDetails.rideScheduledStartTime || rideDetails.rideDate)}</Text>
            </HStack>
          </HStack>
        </Box>
      )}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <Box
            key={message.id}
            style={[
              message.senderId === currentUserId.toString() ? styles.myMessage : styles.theirMessage,
              index === 0 ? { marginTop: 10 } : {}
            ]}
          >
            <Text style={styles.messageText}>{message.message}</Text>
            <HStack justifyContent="flex-end" alignItems="center" space={1}>
              <Text style={styles.messageTime}>{formatTime(message.dateTime)}</Text>
              {message.senderId === currentUserId.toString() && (
                <Icon as={Ionicons} name="checkmark-done" size={3} color="gray.500" />
              )}
            </HStack>
          </Box>
        ))}
      </ScrollView>
      <HStack space={2} alignItems="center" p={4} bg="white" borderTopWidth={1} borderTopColor="gray.200">
        <Input
          flex={1}
          placeholder="Type a message"
          value={newMessage}
          onChangeText={setNewMessage}
          variant="filled"
          bg="gray.100"
          borderRadius="full"
          placeholderTextColor="gray.400"
          color="black"
          py={2}
          px={4}
          InputLeftElement={
            <Icon as={Ionicons} name="happy-outline" size={5} color="gray.400" ml={2} />
          }
        />
        <TouchableOpacity onPress={handleSendMessage} disabled={!currentUserId || !rideDetails}>
          <Box bg={currentUserId && rideDetails ? "black" : "gray.400"} p={2} borderRadius="full">
            <Icon as={Ionicons} name="send" size={5} color="white" />
          </Box>
        </TouchableOpacity>
      </HStack>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    backgroundColor: 'black',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollContainer: {
    padding: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    marginBottom: 10,
    maxWidth: '80%',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    marginBottom: 10,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: 'gray',
  },
});

export default ChatDetailScreen;