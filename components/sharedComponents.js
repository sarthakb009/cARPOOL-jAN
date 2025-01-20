import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box, Text, Icon, HStack, VStack, Input, Button, Pressable } from 'native-base';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'black',
    marginBottom: 5,
  },
  input: {
    height: 50,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 0,
    paddingRight: 10,
    textAlign: 'left',
  },
  button: {
    backgroundColor: 'black',
    height: 50,
    borderRadius: 25,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  locationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'black',
  },
  locationSubtext: {
    fontSize: 14,
    color: 'gray',
  },
});

export const CustomInput = ({ label, value, onChangeText, placeholder, icon, ...props }) => (
  <Box mb={4}>
    <Text style={styles.inputLabel}>{label}</Text>
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      style={[styles.input, { textAlign: 'left' }]}
      numberOfLines={1}
      ellipsizeMode="head"
      InputLeftElement={
        <Icon as={Ionicons} name={icon} size={5} ml={2} color="gray.400" />
      }
      {...props}
    />
  </Box>
);

export const CustomButton = ({ title, onPress, isLoading }) => (
  <Button
    style={styles.button}
    _text={styles.buttonText}
    onPress={onPress}
    isLoading={isLoading}
  >
    {title}
  </Button>
);

export const CarouselItem = ({ item }) => (
  <Box bg="gray.100" borderRadius="md" p={4} mr={4} width={300}>
    <HStack space={4} alignItems="center">
      <Icon as={Ionicons} name={item.icon} size={6} color="black" />
      <VStack flex={1}>
        <Text fontWeight="bold" fontSize="md" color="black">{item.title}</Text>
        <Text color="gray.600" fontSize="sm">{item.text}</Text>
      </VStack>
    </HStack>
  </Box>
);

export const RecentSearchItem = ({ search, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      bg="white"
      borderRadius="md"
      shadow={1}
      p={4}
      mr={3}
      minWidth={250}
    >
      <HStack space={3} alignItems="center">
        <Icon as={Ionicons} name="time-outline" size="sm" color="gray.500" />
        <VStack flex={1}>
          <Text fontSize="sm" color="gray.500">
            {search.time}
          </Text>
          <Text fontSize="md" numberOfLines={1}>
            {search.from}
          </Text>
          <Text fontSize="md" numberOfLines={1}>
            {search.to}
          </Text>
        </VStack>
      </HStack>
    </Box>
  </TouchableOpacity>
);

export const LocationItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Box style={styles.locationItem}>
      <HStack alignItems="center">
        <Icon as={MaterialIcons} name={icon} size={6} color="black" style={styles.locationIcon} />
        <VStack>
          <Text style={styles.locationText}>{title}</Text>
          <Text style={styles.locationSubtext}>{subtitle}</Text>
        </VStack>
      </HStack>
    </Box>
  </TouchableOpacity>
);

export const BackButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Icon as={Ionicons} name="arrow-back" size={6} color="black" />
  </TouchableOpacity>
);