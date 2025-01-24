import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Box, VStack, HStack, Text, Icon, Avatar, ScrollView, Pressable, Modal } from 'native-base';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const ProfileModal = ({ isOpen, onClose, userData, userType }) => {
  const renderDriverSpecific = () => (
    <VStack space={4}>
      {/* Vehicles Section */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
          Vehicles
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <HStack space={3}>
            {userData.vehicles?.map((vehicle, index) => (
              <MotiView
                key={index}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'timing',
                  duration: 500,
                  delay: index * 100,
                  easing: Easing.out(Easing.ease),
                }}
              >
                <Box
                  bg="white"
                  p={3}
                  borderRadius="xl"
                  borderWidth={1}
                  borderColor={vehicle.isDefault ? "black" : "gray.100"}
                  shadow={2}
                  width={width * 0.6}
                >
                  <HStack space={3} alignItems="center">
                    <Box
                      bg={vehicle.isDefault ? "black" : "gray.100"}
                      p={2}
                      borderRadius="lg"
                    >
                      <Icon
                        as={FontAwesome5}
                        name={vehicle.type === 'Car' ? 'car' : 'motorcycle'}
                        size={5}
                        color={vehicle.isDefault ? "white" : "gray.700"}
                      />
                    </Box>
                    <VStack flex={1}>
                      <Text fontSize="sm" fontWeight="600" color="gray.800">
                        {vehicle.make} {vehicle.model}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {vehicle.plateNumber}
                      </Text>
                      <HStack space={2} mt={1}>
                        <Text fontSize="2xs" color="gray.500">
                          {vehicle.year}
                        </Text>
                        <Text fontSize="2xs" color="gray.500">
                          •
                        </Text>
                        <Text fontSize="2xs" color="gray.500">
                          {vehicle.color}
                        </Text>
                      </HStack>
                    </VStack>
                    {vehicle.isDefault && (
                      <Box
                        bg="black"
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        <Text color="white" fontSize="2xs" fontWeight="600">
                          DEFAULT
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </Box>
              </MotiView>
            ))}
          </HStack>
        </ScrollView>
      </Box>

      {/* Preferences Section */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
          Preferences
        </Text>
        <HStack space={3} flexWrap="wrap">
          {Object.entries(userData.preferences || {}).map(([key, value], index) => (
            <Box
              key={key}
              bg="white"
              px={3}
              py={2}
              borderRadius="full"
              borderWidth={1}
              borderColor="gray.100"
            >
              <HStack space={2} alignItems="center">
                <Icon
                  as={FontAwesome5}
                  name={
                    key === 'smoking' ? 'smoking' :
                    key === 'music' ? 'music' :
                    key === 'ac' ? 'snowflake' :
                    'paw'
                  }
                  size={3}
                  color={value ? "green.500" : "red.500"}
                />
                <Text
                  fontSize="xs"
                  color={value ? "green.500" : "red.500"}
                  fontWeight="600"
                >
                  {value ? '' : 'No'} {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </HStack>
            </Box>
          ))}
        </HStack>
      </Box>
    </VStack>
  );

  const renderPassengerSpecific = () => (
    <VStack space={4}>
      {/* Preferences Section */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
          Ride Preferences
        </Text>
        <VStack space={3}>
          {Object.entries(userData.preferences || {}).map(([key, value], index) => (
            <Box
              key={key}
              bg="white"
              p={3}
              borderRadius="xl"
              borderWidth={1}
              borderColor="gray.100"
            >
              <HStack justifyContent="space-between" alignItems="center">
                <HStack space={3} alignItems="center">
                  <Box
                    bg="gray.100"
                    p={2}
                    borderRadius="lg"
                  >
                    <Icon
                      as={FontAwesome5}
                      name={
                        key === 'musicPreference' ? 'music' :
                        key === 'chatPreference' ? 'comments' :
                        'chair'
                      }
                      size={4}
                      color="gray.700"
                    />
                  </Box>
                  <VStack>
                    <Text fontSize="xs" color="gray.500" fontWeight="medium">
                      {key.replace('Preference', '').toUpperCase()}
                    </Text>
                    <Text fontSize="sm" color="gray.700" fontWeight="600">
                      {value}
                    </Text>
                  </VStack>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
    </VStack>
  );

  const renderStats = () => (
    <Box>
      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
        Stats
      </Text>
      <HStack space={3} flexWrap="wrap">
        {Object.entries(userData.stats || {}).map(([key, value], index) => (
          <Box
            key={key}
            bg="white"
            p={3}
            borderRadius="xl"
            borderWidth={1}
            borderColor="gray.100"
            width="48%"
            mb={3}
          >
            <VStack>
              <HStack space={2} alignItems="center" mb={1}>
                <Icon
                  as={FontAwesome5}
                  name={
                    key === 'completedRides' ? 'car' :
                    key === 'totalDistance' ? 'road' :
                    key === 'averageRating' ? 'star' :
                    key === 'onTimePercentage' ? 'clock' :
                    'chart-line'
                  }
                  size={3}
                  color="gray.500"
                />
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                </Text>
              </HStack>
              <Text fontSize="lg" fontWeight="700" color="gray.800">
                {typeof value === 'number' && key.includes('Percentage') 
                  ? `${value}%`
                  : key === 'averageRating'
                  ? value.toFixed(1)
                  : value}
              </Text>
            </VStack>
          </Box>
        ))}
      </HStack>
    </Box>
  );

  const renderBadges = () => (
    <Box>
      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
        Achievements
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <HStack space={3}>
          {userData.badges?.map((badge, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'timing',
                duration: 500,
                delay: index * 100,
                easing: Easing.out(Easing.ease),
              }}
            >
              <Box
                bg={
                  badge.type === 'gold' ? 'yellow.50' :
                  badge.type === 'silver' ? 'gray.50' :
                  'blue.50'
                }
                p={3}
                borderRadius="xl"
                borderWidth={1}
                borderColor={
                  badge.type === 'gold' ? 'yellow.100' :
                  badge.type === 'silver' ? 'gray.200' :
                  'blue.100'
                }
                width={width * 0.4}
              >
                <VStack space={2}>
                  <Icon
                    as={FontAwesome5}
                    name={
                      badge.type === 'gold' ? 'crown' :
                      badge.type === 'silver' ? 'award' :
                      'medal'
                    }
                    size={5}
                    color={
                      badge.type === 'gold' ? 'yellow.600' :
                      badge.type === 'silver' ? 'gray.600' :
                      'blue.600'
                    }
                  />
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={
                      badge.type === 'gold' ? 'yellow.600' :
                      badge.type === 'silver' ? 'gray.600' :
                      'blue.600'
                    }
                  >
                    {badge.title}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {badge.description}
                  </Text>
                </VStack>
              </Box>
            </MotiView>
          ))}
        </HStack>
      </ScrollView>
    </Box>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
    >
      <Modal.Content
        marginBottom={0}
        marginTop="auto"
        height="90%"
        borderTopRadius="3xl"
      >
        <Modal.CloseButton />
        <Modal.Body p={0}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            {/* Profile Header */}
            <VStack space={6} alignItems="center" mb={6}>
              <Avatar
                size="2xl"
                source={{ uri: userData.avatar }}
                borderWidth={3}
                borderColor="white"
                shadow={3}
              >
                {userData.name?.charAt(0)}
              </Avatar>
              <VStack alignItems="center" space={2}>
                <Text fontSize="xl" fontWeight="700" color="gray.800">
                  {userData.name}
                </Text>
                <HStack space={3} alignItems="center">
                  <HStack space={1} alignItems="center">
                    <Icon as={FontAwesome5} name="star" size={3} color="yellow.400" />
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {userData.rating?.toFixed(1)}
                    </Text>
                  </HStack>
                  <Text color="gray.400">•</Text>
                  <Text fontSize="sm" color="gray.500">
                    {userData.totalRides} rides
                  </Text>
                </HStack>
                <Box
                  bg={userData.verificationStatus ? "green.100" : "gray.100"}
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  <Text
                    fontSize="xs"
                    color={userData.verificationStatus ? "green.600" : "gray.600"}
                    fontWeight="600"
                  >
                    {userData.verificationStatus ? "VERIFIED" : "UNVERIFIED"} {userType.toUpperCase()}
                  </Text>
                </Box>
              </VStack>
            </VStack>

            {/* Role Specific Content */}
            {userType === 'DRIVER' ? renderDriverSpecific() : renderPassengerSpecific()}

            {/* Common Sections */}
            {renderStats()}
            {renderBadges()}
          </ScrollView>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default ProfileModal; 