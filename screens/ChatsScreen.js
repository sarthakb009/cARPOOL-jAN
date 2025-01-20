import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Box, VStack, HStack, Text, Avatar, Divider, Icon } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const sampleChats = [
  {
    id: '1',
    name: 'John Doe',
    lastMessage: 'Hey, are you available for a ride?',
    time: '10:30 AM',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    unread: 2,
  },
  {
    id: '2',
    name: 'Jane Smith',
    lastMessage: 'Thanks for the ride!',
    time: '9:15 AM',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    unread: 0,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    lastMessage: 'See you tomorrow at 9 AM',
    time: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    unread: 1,
  },
  {
    id: '4',
    name: 'Sarah Williams',
    lastMessage: 'Great ride, thanks!',
    time: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    unread: 0,
  },
];

const ChatsScreen = ({ navigation }) => {
  return (
    <Box flex={1} bg="white">
      <LinearGradient
        colors={['#000', '#333']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Chats</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.container}>
        <VStack space={4}>
          {sampleChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              onPress={() => navigation.navigate('ChatDetail', { chatId: chat.id, name: chat.name })}
            >
              <HStack space={3} alignItems="center" py={3}>
                <Avatar source={{ uri: chat.avatar }} size="md" />
                <VStack flex={1}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.chatName}>{chat.name}</Text>
                    <Text style={styles.chatTime}>{chat.time}</Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.chatMessage} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <Box bg="red.500" px={2} py={1} rounded="full">
                        <Text color="white" fontSize="xs" fontWeight="bold">
                          {chat.unread}
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </VStack>
              </HStack>
              <Divider />
            </TouchableOpacity>
          ))}
        </VStack>
      </ScrollView>
      <TouchableOpacity style={styles.newChatButton} onPress={() => navigation.navigate('NewChat')}>
        <Icon as={MaterialIcons} name="chat" size={6} color="white" />
      </TouchableOpacity>
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  container: {
    padding: 20,
  },
  chatName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'black',
  },
  chatMessage: {
    color: 'gray',
    fontSize: 14,
    flex: 1,
  },
  chatTime: {
    color: 'gray',
    fontSize: 12,
  },
  newChatButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: 'black',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default ChatsScreen;