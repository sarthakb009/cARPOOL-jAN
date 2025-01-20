import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, VStack, HStack, Avatar, Icon, Divider } from 'native-base';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const PassengerDetailsBottomSheet = ({ passenger, isVisible, onClose }) => {
  const bottomSheetRef = React.useRef(null);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      bottomSheetRef.current?.close();
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible]);

  const renderBackground = useCallback(() => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));
    return <Animated.View style={[styles.backgroundOverlay, animatedStyle]} />;
  }, []);

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  if (!passenger) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['70%']}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundComponent={renderBackground}
    >
      <View style={styles.bottomSheetContent}>
        <VStack space={4} alignItems="center">
          <Avatar size="xl" source={{ uri: passenger.avatar }} />
          <Text fontSize="2xl" fontWeight="bold">{passenger.name}</Text>
          <HStack space={2} alignItems="center">
            <Icon as={Ionicons} name="star" size="sm" color="yellow.400" />
            <Text fontSize="lg" fontWeight="semibold">4.8</Text>
            <Text fontSize="md" color="gray.500">(42 rides)</Text>
          </HStack>
        </VStack>
        
        <Divider my={4} />
        
        <VStack space={4}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" color="gray.500">Member since</Text>
            <Text fontSize="md" fontWeight="semibold">March 2022</Text>
          </HStack>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" color="gray.500">Eco-rides taken</Text>
            <Text fontSize="md" fontWeight="semibold">15</Text>
          </HStack>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" color="gray.500">CO₂ saved</Text>
            <Text fontSize="md" fontWeight="semibold">37.5 kg</Text>
          </HStack>
        </VStack>
        
        <Divider my={4} />
        
        <HStack justifyContent="space-around" mt={4}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon as={Ionicons} name="call" size="md" color="white" />
            <Text color="white" fontWeight="semibold" mt={2}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon as={Ionicons} name="chatbubble" size="md" color="white" />
            <Text color="white" fontWeight="semibold" mt={2}>Message</Text>
          </TouchableOpacity>
        </HStack>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default PassengerDetailsBottomSheet;