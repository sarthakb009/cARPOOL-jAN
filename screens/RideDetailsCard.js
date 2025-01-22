import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, HStack, Icon, Avatar } from 'native-base';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday, isYesterday } from 'date-fns';

const RideDetailsCard = ({ data, onPress }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return '#FFB800';  // amber
      case 'completed': return '#4299E1';  // blue
      default: return '#A0AEC0';  // gray
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'hh:mm a');
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Box 
        bg="black" 
        rounded="xl" 
        shadow={2} 
        mb={3}
        overflow="hidden"
        width="100%"
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          start={[0, 0]}
          end={[1, 1]}
        >
          <Box p={4}>
            <HStack justifyContent="space-between" alignItems="center" mb={2}>
              <Text fontSize="md" fontWeight="bold" color="white" flex={1} numberOfLines={1}>
                {data.source} → {data.destination}
              </Text>
              <Box
                bg={getStatusColor(data.status)}
                px={2}
                py={0.5}
                rounded="full"
              >
                <Text color="white" fontSize="2xs" fontWeight="bold">
                  {data.status}
                </Text>
              </Box>
            </HStack>

            <HStack alignItems="center" space={1} mb={2}>
              <Icon as={Ionicons} name="calendar-outline" size="xs" color="gray.400" />
              <Text fontSize="xs" color="gray.400">
                {formatDate(data.rideDate)}
              </Text>
              <Text fontSize="xs" color="gray.400" mx={1}>•</Text>
              <Text fontSize="xs" color="gray.400">
                {formatTime(data.rideStartTime)}
              </Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Avatar
                  size="sm"
                  bg="gray.700"
                >
                  {data.driverDetails?.driverFirstName?.charAt(0) || 'D'}
                </Avatar>
                <HStack alignItems="center" space={1}>
                  <Icon as={Ionicons} name="star" size="xs" color="yellow.400" />
                  <Text fontSize="xs" color="gray.400">
                    {data.driverDetails?.avgRating || 'N/A'}
                  </Text>
                </HStack>
              </HStack>

              <HStack alignItems="center" space={3}>
                <HStack alignItems="center" space={1}>
                  <Icon as={MaterialCommunityIcons} name="account-multiple" size="sm" color="gray.400" />
                  <Text fontSize="xs" color="gray.400">
                    {data.passengers?.length || 0}/{data.vehicleDto?.vehicleCapacity || '?'}
                  </Text>
                </HStack>
                <Text fontSize="md" fontWeight="bold" color="green.400">
                  ₹{data.price || 0}
                </Text>
              </HStack>
            </HStack>

            <HStack mt={2}>
              <HStack alignItems="center" space={1}>
                <Icon as={MaterialCommunityIcons} name="car" size="xs" color="gray.400" />
                <Text fontSize="2xs" color="gray.400">
                  {data.vehicleDto?.make} {data.vehicleDto?.model}
                </Text>
                <Text fontSize="2xs" color="gray.400" ml={1}>
                  {data.vehicleDto?.vehicleNumber}
                </Text>
              </HStack>
            </HStack>
          </Box>
        </LinearGradient>
      </Box>
    </TouchableOpacity>
  );
};

export default RideDetailsCard;
