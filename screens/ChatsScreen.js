import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Box, VStack, HStack, Text, Avatar, Icon, Pressable, Button } from 'native-base';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

const sampleData = {
  upcoming: [
    {
      id: '1',
      type: 'GROUP',
      name: 'Mumbai to Pune Ride',
      participants: [
        { id: '1', name: 'John', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', role: 'DRIVER' },
        { id: '2', name: 'Sarah', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', role: 'PASSENGER' },
        { id: '3', name: 'Mike', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', role: 'PASSENGER' },
      ],
      lastMessage: "We'll start in 10 minutes",
      time: '10:30 AM',
      date: '25 Dec',
      unread: 2,
      status: 'UPCOMING',
    },
    {
      id: '2',
      type: 'INDIVIDUAL',
      name: 'Jane Smith',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      role: 'PASSENGER',
      requestStatus: 'PENDING',
      lastMessage: 'Is there space for luggage?',
      time: '9:15 AM',
      date: '26 Dec',
      unread: 1,
      status: 'UPCOMING',
    }
  ],
  active: [
    {
      id: '3',
      type: 'GROUP',
      name: 'Delhi Airport Ride',
      participants: [
        { id: '4', name: 'Alex', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', role: 'DRIVER' },
        { id: '5', name: 'Emma', avatar: 'https://randomuser.me/api/portraits/women/6.jpg', role: 'PASSENGER' },
      ],
      lastMessage: 'Currently at Terminal 3',
      time: 'Now',
      unread: 3,
      status: 'ACTIVE',
    }
  ],
  requests: [
    {
      id: '4',
      type: 'REQUEST',
      name: 'Mike Johnson',
      avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
      role: 'PASSENGER',
      requestStatus: 'PENDING',
      lastMessage: 'Request to join your ride',
      time: '11:45 AM',
      rideDetails: {
        source: 'Central Mall',
        destination: 'Airport',
        seats: 2,
      },
      status: 'PENDING',
    }
  ],
  past: [
    {
      id: '5',
      type: 'INDIVIDUAL',
      name: 'Sarah Williams',
      avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
      role: 'PASSENGER',
      lastMessage: 'Thanks for the ride!',
      time: 'Yesterday',
      status: 'COMPLETED',
    }
  ]
};

const ChatsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('upcoming');

  const renderChatItem = (chat, index) => (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: 'timing',
        duration: 500,
        delay: index * 100,
        easing: Easing.out(Easing.ease),
      }}
    >
      <Pressable
        onPress={() => navigation.navigate('ChatDetail', { 
          chatId: chat.id, 
          name: chat.name,
          type: chat.type,
          participants: chat.participants,
          status: chat.status,
          avatar: chat.avatar,
          role: chat.role || (chat.type === 'REQUEST' ? 'PASSENGER' : 'DRIVER')
        })}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Box
          bg="white"
          p={4}
          mb={2}
          borderRadius="2xl"
          borderWidth={1}
          borderColor={chat.type === 'REQUEST' ? "yellow.200" : "gray.100"}
          shadow={2}
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <HStack space={3} alignItems="center">
            {chat.type === 'GROUP' ? (
              <Box position="relative">
                <HStack space={-2}>
                  {chat.participants.slice(0, 3).map((participant, idx) => (
                    <Avatar
                      key={participant.id}
                      source={{ uri: participant.avatar }}
                      size="md"
                      borderWidth={2}
                      borderColor="white"
                      style={{ marginLeft: idx > 0 ? -8 : 0 }}
                    />
                  ))}
                  {chat.participants.length > 3 && (
                    <Box
                      bg="gray.200"
                      size="md"
                      borderRadius="full"
                      borderWidth={2}
                      borderColor="white"
                      justifyContent="center"
                      alignItems="center"
                      ml={-2}
                    >
                      <Text fontSize="xs" color="gray.600">+{chat.participants.length - 3}</Text>
                    </Box>
                  )}
                </HStack>
              </Box>
            ) : (
              <Box position="relative">
                <Avatar
                  source={{ uri: chat.avatar }}
                  size="md"
                  borderWidth={2}
                  borderColor="white"
                >
                  {chat.name.charAt(0)}
                </Avatar>
                {chat.status === 'ACTIVE' && (
                  <Box
                    position="absolute"
                    bottom={0}
                    right={0}
                    bg="green.500"
                    w={3}
                    h={3}
                    rounded="full"
                    borderWidth={2}
                    borderColor="white"
                  />
                )}
              </Box>
            )}
            
            <VStack flex={1} space={1}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack>
                  <Text
                    fontSize="md"
                    fontWeight="700"
                    color="gray.800"
                    numberOfLines={1}
                  >
                    {chat.name}
                  </Text>
                  {chat.date && (
                    <Text fontSize="xs" color="gray.400">
                      {chat.date}
                    </Text>
                  )}
                </VStack>
                <HStack space={1} alignItems="center">
                  {chat.type === 'REQUEST' && (
                    <Box
                      bg="yellow.100"
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      <Text fontSize="2xs" color="yellow.800" fontWeight="600">
                        REQUEST
                      </Text>
                    </Box>
                  )}
                  <Text fontSize="xs" color="gray.400">
                    {chat.time}
                  </Text>
                </HStack>
              </HStack>
              
              <HStack justifyContent="space-between" alignItems="center">
                <HStack space={2} flex={1} alignItems="center">
                  {chat.type === 'REQUEST' && (
                    <Icon
                      as={FontAwesome5}
                      name="user-plus"
                      size={3}
                      color="yellow.600"
                    />
                  )}
                  <Text
                    fontSize="sm"
                    color={chat.type === 'REQUEST' ? "yellow.600" : "gray.500"}
                    numberOfLines={1}
                    flex={1}
                    mr={2}
                  >
                    {chat.lastMessage}
                  </Text>
                </HStack>
                {chat.unread > 0 && (
                  <Box
                    bg="black"
                    px={2}
                    py={0.5}
                    rounded="full"
                    minW={6}
                    alignItems="center"
                  >
                    <Text color="white" fontSize="2xs" fontWeight="bold">
                      {chat.unread}
                    </Text>
                  </Box>
                )}
              </HStack>

              {chat.type === 'REQUEST' && (
                <HStack space={2} mt={2}>
                  <Button
                    flex={1}
                    size="sm"
                    bg="black"
                    _pressed={{ bg: 'gray.800' }}
                  >
                    Accept
                  </Button>
                  <Button
                    flex={1}
                    size="sm"
                    variant="outline"
                    borderColor="gray.300"
                    _pressed={{ bg: 'gray.100' }}
                  >
                    Decline
                  </Button>
                </HStack>
              )}
            </VStack>
          </HStack>
        </Box>
      </Pressable>
    </MotiView>
  );

  const renderTabButton = (tab, label, count) => (
    <Pressable
      flex={1}
      onPress={() => setActiveTab(tab)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Box
        bg={activeTab === tab ? 'black' : 'transparent'}
        py={2}
        px={3}
        borderRadius="xl"
        alignItems="center"
      >
        <HStack space={2} alignItems="center">
          <Text
            fontSize="sm"
            fontWeight="600"
            color={activeTab === tab ? 'white' : 'gray.500'}
          >
            {label}
          </Text>
          {count > 0 && (
            <Box
              bg={activeTab === tab ? 'white' : 'gray.200'}
              px={1.5}
              py={0.5}
              borderRadius="full"
            >
              <Text
                fontSize="2xs"
                fontWeight="600"
                color={activeTab === tab ? 'black' : 'gray.600'}
              >
                {count}
              </Text>
            </Box>
          )}
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="gray.50" safeAreaTop>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <HStack alignItems="center" justifyContent="space-between" mb={4}>
          <Text style={styles.headerTitle}>Messages</Text>
          <HStack space={4}>
            <TouchableOpacity>
              <Icon as={MaterialIcons} name="search" size={6} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Icon as={MaterialIcons} name="more-vert" size={6} color="white" />
            </TouchableOpacity>
          </HStack>
        </HStack>

        <Box
          bg="rgba(255,255,255,0.1)"
          p={1}
          borderRadius="2xl"
        >
          <HStack>
            {renderTabButton('upcoming', 'Upcoming', sampleData.upcoming.length)}
            {renderTabButton('active', 'Active', sampleData.active.length)}
            {renderTabButton('requests', 'Requests', sampleData.requests.length)}
            {renderTabButton('past', 'Past', sampleData.past.length)}
          </HStack>
        </Box>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {sampleData[activeTab].map((chat, index) => renderChatItem(chat, index))}
      </ScrollView>

      <Box position="absolute" bottom={8} right={8}>
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            delay: 300,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('NewChat')}
            style={({ pressed }) => [
              styles.newChatButton,
              { transform: [{ scale: pressed ? 0.95 : 1 }] }
            ]}
          >
            <Icon as={MaterialIcons} name="chat" size={6} color="white" />
          </Pressable>
        </MotiView>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  newChatButton: {
    backgroundColor: 'black',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default ChatsScreen;