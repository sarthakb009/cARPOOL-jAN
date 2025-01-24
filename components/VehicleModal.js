import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Modal, Button, VStack, Text, Icon, Heading, HStack, Pressable } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
 
const { width } = Dimensions.get('window');

const VehicleModal = ({ isOpen, onClose, onAddVehicle }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Content maxWidth={width * 0.9} borderRadius={20}>
        <Modal.CloseButton />
        <Modal.Body>
          <VStack space={4} alignItems="center" py={6}>
            <Heading size="lg" textAlign="center" color="coolGray.800">
              Add a Vehicle
            </Heading>
            <Text textAlign="center" fontSize="md" color="coolGray.600">
              To offer a ride, you need to add a vehicle first. This helps passengers know what to expect and ensures a smooth ride experience.
            </Text>
            <HStack space={4} mt={4}>
              <Pressable onPress={onClose}>
                {({ isHovered, isFocused, isPressed }) => {
                  return (
                    <Button
                      variant="outline"
                      colorScheme="coolGray"
                      style={[
                        styles.button,
                        {
                          backgroundColor: isPressed ? 'coolGray.100' : 'transparent',
                          borderColor: isPressed ? 'coolGray.300' : 'coolGray.200',
                        },
                      ]}
                    >
                      <HStack space={2} alignItems="center">
                        <Icon as={Ionicons} name="close-outline" size="sm" color="coolGray.600" />
                        <Text color="coolGray.600">Cancel</Text>
                      </HStack>
                    </Button>
                  );
                }}
              </Pressable>
              <Pressable onPress={onAddVehicle}>
                {({ isHovered, isFocused, isPressed }) => {
                  return (
                    <Button
                      colorScheme="blue"
                      style={[
                        styles.button,
                        {
                          backgroundColor: isPressed ? 'blue.700' : 'blue.600',
                        },
                      ]}
                    >
                      <HStack space={2} alignItems="center">
                        <Icon as={Ionicons} name="add-outline" size="sm" color="white" />
                        <Text color="white">Add Vehicle</Text>
                      </HStack>
                    </Button>
                  );
                }}
              </Pressable>
            </HStack>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

const styles = StyleSheet.create({
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});

export default VehicleModal;