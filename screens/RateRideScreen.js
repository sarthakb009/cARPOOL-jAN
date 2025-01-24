import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Pressable } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  Icon,
  Button,
  useToast,
  TextArea,
  Progress,
} from 'native-base';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Rating } from 'react-native-ratings';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackButton } from '../components/sharedComponents';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

const RateRideScreen = ({ route, navigation }) => {
  const { rideId } = route.params;
  const [rideDetails, setRideDetails] = useState(null);
  const [driverRating, setDriverRating] = useState(0);
  const [rideRating, setRideRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Fetch ride details
  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/getById?id=${rideId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setRideDetails(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching ride details:', error);
        toast.show({
          title: "Error",
          description: "Failed to load ride details",
          status: "error"
        });
      }
    };

    fetchRideDetails();
  }, [rideId]);

  const handleSubmit = async () => {
    if (driverRating === 0 || rideRating === 0) {
      toast.show({
        title: "Rating Required",
        description: "Please provide both driver and ride ratings",
        status: "error"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Debug logs
      console.log('Ride Details:', {
        rideId: rideDetails.id,
        passengerId: rideDetails.passengers[0]?.passengerId,
        passengerJourneyId: rideDetails.passengers[0]?.passengerJourneyId,
        driverId: rideDetails.driverDetails?.id,
        fullRideDetails: rideDetails
      });
      
      const payload = {
        reviewerId: rideDetails.passengers[0].passengerId, // Changed to passengerId instead of passengerJourneyId
        rideId: rideDetails.id,
        driverId: rideDetails.driverDetails.id,
        content: review.trim(),
        driverRating: driverRating,
        rideRating: rideRating
      };

      console.log('Submitting review with payload:', payload);

      const response = await axios.post(
        'http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/review/create',
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Review submission response:', response.data);

      toast.show({
        title: "Thank You!",
        description: "Your review has been submitted successfully",
        status: "success",
        placement: "top"
      });
      
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting review:', error.response?.data || error.message);
      toast.show({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        status: "error",
        placement: "top"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <HStack px={6} py={4} alignItems="center" space={4}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text fontSize="xl" fontWeight="600">Rate Your Experience</Text>
        </HStack>
        <Box flex={1} justifyContent="center" alignItems="center">
          <Progress size="sm" mb={4} isIndeterminate colorScheme="black" w="70%" />
          <Text color="gray.500">Loading ride details...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50" safeArea>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <HStack px={6} py={4} alignItems="center" space={4}>
          <Pressable onPress={() => navigation.goBack()}>
            <Icon as={Ionicons} name="arrow-back" size="md" color="black" />
          </Pressable>
          <Text fontSize="xl" fontWeight="600">Rate Your Experience</Text>
        </HStack>

        <VStack space={4} p={6}>
          {/* Journey Summary Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
          >
            <LinearGradient
              colors={['#000000', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 24 }}
            >
              <VStack space={4}>
                <Text fontSize="sm" color="gray.400" fontWeight="500">
                  YOUR JOURNEY
                </Text>
                <HStack space={2} alignItems="center">
                  <Icon as={MaterialIcons} name="location-on" size="sm" color="white" />
                  <Text fontSize="md" fontWeight="500" color="white" numberOfLines={1}>
                    {rideDetails?.source} → {rideDetails?.destination}
                  </Text>
                </HStack>
                <HStack space={4} alignItems="center">
                  <HStack space={2} alignItems="center">
                    <Icon as={MaterialIcons} name="access-time" size="sm" color="gray.400" />
                    <Text fontSize="sm" color="gray.400">
                      {new Date(rideDetails?.rideStartTime).toLocaleTimeString()}
                    </Text>
                  </HStack>
                  <HStack space={2} alignItems="center">
                    <Icon as={MaterialIcons} name="payments" size="sm" color="gray.400" />
                    <Text fontSize="sm" color="gray.400">
                      ₹{rideDetails?.price}
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            </LinearGradient>
          </MotiView>

          {/* Driver Rating Section */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100 }}
          >
            <Box bg="white" p={6} rounded="2xl" shadow="2">
              <VStack space={4}>
                <Text fontSize="lg" fontWeight="600" color="gray.800">
                  Rate your driver
                </Text>
                <HStack space={4} alignItems="center">
                  <Avatar 
                    size="lg"
                    bg="black"
                    source={rideDetails?.driverDetails?.profilePicture ? 
                      { uri: rideDetails.driverDetails.profilePicture } : undefined}
                  >
                    {rideDetails?.driverDetails?.driverFirstName?.[0] || 'D'}
                  </Avatar>
                  <VStack>
                    <Text fontSize="lg" fontWeight="600">
                      {rideDetails?.driverDetails?.driverFirstName} {rideDetails?.driverDetails?.driverLastName}
                    </Text>
                    <HStack space={2} alignItems="center">
                      <Icon as={MaterialIcons} name="directions-car" size="sm" color="gray.500" />
                      <Text fontSize="sm" color="gray.500">
                        {rideDetails?.vehicleDto?.make} {rideDetails?.vehicleDto?.model}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
                <Box alignItems="center" mt={2}>
                  <Rating
                    type='custom'
                    ratingCount={5}
                    imageSize={40}
                    startingValue={driverRating}
                    onFinishRating={setDriverRating}
                    style={{ paddingVertical: 10 }}
                    ratingBackgroundColor="#d4d4d4"
                    tintColor="#ffffff"
                  />
                </Box>
              </VStack>
            </Box>
          </MotiView>

          {/* Ride Rating Section */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
          >
            <Box bg="white" p={6} rounded="2xl" shadow="2">
              <VStack space={4}>
                <Text fontSize="lg" fontWeight="600" color="gray.800">
                  How was your ride experience?
                </Text>
                <Box alignItems="center">
                  <Rating
                    type='custom'
                    ratingCount={5}
                    imageSize={40}
                    startingValue={rideRating}
                    onFinishRating={setRideRating}
                    style={{ paddingVertical: 10 }}
                    ratingBackgroundColor="#d4d4d4"
                    tintColor="#ffffff"
                  />
                </Box>
              </VStack>
            </Box>
          </MotiView>

          {/* Review Section */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 }}
          >
            <Box bg="white" p={6} rounded="2xl" shadow="2">
              <VStack space={4}>
                <Text fontSize="lg" fontWeight="600" color="gray.800">
                  Share your thoughts
                </Text>
                <TextArea
                  value={review}
                  onChangeText={setReview}
                  placeholder="How was your journey? Share your experience to help improve our service..."
                  numberOfLines={4}
                  fontSize="md"
                  bg="coolGray.50"
                  borderWidth={0}
                  borderRadius="lg"
                  p={4}
                  _focus={{
                    bg: "coolGray.100",
                    borderWidth: 0,
                  }}
                />
              </VStack>
            </Box>
          </MotiView>
        </VStack>

        {/* Submit Button */}
        <Box p={6}>
          <Button
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isLoadingText="Submitting..."
            bg="black"
            _pressed={{ bg: "gray.800" }}
            rounded="full"
            py={4}
            shadow="2"
            _text={{ fontSize: "md", fontWeight: "semibold" }}
            leftIcon={<Icon as={MaterialIcons} name="star" size="sm" color="white" />}
          >
            Submit Review
          </Button>
        </Box>
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
});

export default RateRideScreen; 