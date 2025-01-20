import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Avatar, Tooltip } from 'native-base';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const RideDetailsCard = ({ data, onPress }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'amber.400';
      case 'ongoing': return 'green.400';
      case 'completed': return 'blue.400';
      case 'cancelled': return 'red.400';
      default: return 'gray.400';
    }
  };

  const getStatusText = (status, checkoutStatus) => {
    if (checkoutStatus) return 'Completed';
    return status || 'Unknown';
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPassengerCount = () => {
    return `${data.passengers?.length || 0}/${data.vehicleDto?.capacity || '?'}`;
  };

  const getDriverName = () => {
    return data.driverDetails?.driverFirstName && data.driverDetails?.driverLastName
      ? `${data.driverDetails.driverFirstName} ${data.driverDetails.driverLastName}`
      : '';
  };

  const getVehicleInfo = () => {
    return data.vehicleDto?.make && data.vehicleDto?.model
      ? `${data.vehicleDto.make} ${data.vehicleDto.model}`
      : 'N/A';
  };

  const truncateText = (text, maxLength) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Box 
        bg="black" 
        rounded="xl" 
        shadow={3} 
        mb={4}
        overflow="hidden"
        width="100%"
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)']}
          start={[0, 0]}
          end={[1, 1]}
        >
          <VStack space={3} p={4}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack flex={1} mr={2}>
                <Tooltip label={`${data.source} → ${data.destination}`}>
                  <Text fontSize="md" fontWeight="bold" color="white" numberOfLines={1} ellipsizeMode="tail">
                    {truncateText(`${data.source} → ${data.destination}`, 25)}
                  </Text>
                </Tooltip>
                <HStack alignItems="center" mt={1}>
                  <Icon as={Ionicons} name="calendar-outline" size="xs" color="gray.300" mr={1} />
                  <Text fontSize="xs" color="gray.300">
                    {new Date(data.rideDate).toLocaleDateString()}
                  </Text>
                  <Icon as={Ionicons} name="time-outline" size="xs" color="gray.300" ml={2} mr={1} />
                  <Text fontSize="xs" color="gray.300">
                    {formatTime(data.rideStartTime)}
                  </Text>
                </HStack>
              </VStack>
              <Box bg={getStatusColor(getStatusText(data.status, data.checkoutStatus))} px={2} py={1} rounded="full">
                <Text color="black" fontSize="2xs" fontWeight="bold">
                  {getStatusText(data.status, data.checkoutStatus)}
                </Text>
              </Box>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center" flex={1}>
                <Avatar 
                  size="sm" 
                  source={{ uri: 'https://via.placeholder.com/50' }}
                  bg="gray.600"
                >
                  {getDriverName().charAt(0)}
                </Avatar>
                <VStack flex={1}>
                  <Tooltip label={getDriverName()}>
                    <Text fontSize="sm" fontWeight="semibold" color="white" numberOfLines={1} ellipsizeMode="tail">
                      {getDriverName() ? truncateText(getDriverName(), 15) : null}
                    </Text>
                  </Tooltip>
                  <HStack alignItems="center">
                    <Icon as={Ionicons} name="star" size="2xs" color="yellow.400" />
                    <Text fontSize="2xs" color="gray.300" ml={1}>
                      {data.driverDetails?.avgRating || 'N/A'}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>
              <VStack alignItems="flex-end">
                <HStack alignItems="center" space={1}>
                  <Icon as={MaterialCommunityIcons} name="car-side" size="xs" color="gray.300" />
                  <Text fontSize="xs" color="gray.300">{getVehicleInfo()}</Text>
                </HStack>
                <Text fontSize="2xs" color="gray.400">{data.vehicleDto?.vehicleNumber || 'N/A'}</Text>
              </VStack>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon as={Ionicons} name="people" size="xs" color="gray.300" />
                <Text fontSize="xs" color="gray.300">
                  {getPassengerCount()} seats
                </Text>
              </HStack>
              {data.price ? (
                <Text fontSize="md" fontWeight="bold" color="green.400">
                  ${data.price}
                </Text>
              ) : null}
            </HStack>
          </VStack>
        </LinearGradient>
      </Box>
    </TouchableOpacity>
  );
};

export default RideDetailsCard;
