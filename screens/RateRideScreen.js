import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Button,
  TextArea,
  Pressable,
  useToast,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const RateRideScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId } = route.params;
  const toast = useToast();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.show({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        status: "warning",
        placement: "top"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const passengerId = await AsyncStorage.getItem('passengerId');

      const response = await axios.post(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/create',
        {
          rideId: rideId,
          passengerId: passengerId,
          rating: rating,
          feedback: feedback
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show({
          title: "Thank You!",
          description: "Your rating has been submitted successfully",
          status: "success",
          placement: "top"
        });
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        status: "error",
        placement: "top"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      {/* Header */}
      <Box py="4" px="4">
        <HStack alignItems="center" justifyContent="space-between">
          <Pressable onPress={() => navigation.goBack()}>
            <Icon as={Ionicons} name="arrow-back" size="md" color="black" />
          </Pressable>
          <Text fontSize="lg" fontWeight="semibold" color="black">
            Rate Your Ride
          </Text>
          <Box width={8} />
        </HStack>
      </Box>

      {/* Content */}
      <VStack flex={1} px="4" space="6">
        <Box alignItems="center" mt="8">
          <Text fontSize="xl" fontWeight="bold" mb="4">
            How was your ride?
          </Text>
          <HStack space="2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  setRating(star);
                  Haptics.selectionAsync();
                }}
              >
                <Icon
                  as={Ionicons}
                  name={rating >= star ? "star" : "star-outline"}
                  size="xl"
                  color={rating >= star ? "yellow.400" : "gray.300"}
                />
              </Pressable>
            ))}
          </HStack>
        </Box>

        <Box>
          <Text fontSize="md" fontWeight="semibold" mb="2">
            Additional Feedback (Optional)
          </Text>
          <TextArea
            h={120}
            placeholder="Share your experience..."
            value={feedback}
            onChangeText={setFeedback}
            autoCompleteType={undefined}
          />
        </Box>

        <Button
          onPress={handleSubmitRating}
          isLoading={isSubmitting}
          isLoadingText="Submitting..."
          bg="black"
          _text={{ color: 'white', fontWeight: 'bold' }}
          rounded="full"
          mt="auto"
          mb="4"
        >
          Submit Rating
        </Button>
      </VStack>
    </Box>
  );
};

export default RateRideScreen; 