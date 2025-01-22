import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Button } from 'react-native';
import { Box, HStack, VStack, Text, Icon, Pressable, Avatar } from 'native-base';
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated'; 
import { calculateAverageRating } from '../utils/ratingUtils';


const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [driverStats, setDriverStats] = useState({
    tripsCompleted: 0,
    totalDistance: 0
  });
  const [reviews, setReviews] = useState([]);
  const [driverVerified, setDriverVerified] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchDriverStats();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const driverId = await AsyncStorage.getItem('driverId');
        if (driverId) {
          setIsDriver(true);
          const token = await AsyncStorage.getItem('userToken');
          const response = await axios.get(
            `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/review/getByDriver?driverId=${driverId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setReviews(response.data);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    };

    fetchReviews();
  }, []);

  const fetchDriverStats = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      const token = await AsyncStorage.getItem('userToken'); // Fetch token from storage
      if (driverId && token) {
        console.log('Making API call to /allRidesCountForDriver');
        const response = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/rides/allRidesCountForDriver?id=${driverId}`,
          {
            headers: { Authorization: `Bearer ${token}` }, // Add the token here
          }
        );
        console.log('API Response:', response.data);
        setDriverStats((prev) => ({
          ...prev,
          tripsCompleted: parseInt(response.data, 10) || 0,
        }));
      } else {
        console.log('Driver ID or token is missing.');
      }
    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  };
  

  const fetchUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/get?username=${username}`);
      setUserData(response.data);
  
      const driverId = await AsyncStorage.getItem('driverId');
      if (driverId) {
        const token = await AsyncStorage.getItem('userToken');
        const driverResponse = await axios.get(
          `http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/driver/getById?id=${driverId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Driver Data:', driverResponse.data); // Debugging
        setDriverVerified(driverResponse.data.licenseVerified || false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  
  
  

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'username',
        'userToken',
        'driverId',
        'passengerId',
        'userId'
      ]);
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNavigation = (screenName) => {
    navigation.navigate(screenName);
  };

  

  if (!userData) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="white">
        <Text fontSize="lg" fontWeight="bold" color="black">Loading...</Text>
      </Box>
    );
  }

  const getInitials = () => {
    const firstInitial = userData.firstName ? userData.firstName[0] : '';
    const lastInitial = userData.lastName ? userData.lastName[0] : '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatGender = (gender) => {
    if (!gender) return 'Not Specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const quickActions = [
    { icon: 'truck', label: 'Vehicles', route: 'Vehicles' },
    { icon: 'user', label: 'Driver Profile', route: 'DriverProfile' },
    { icon: 'map', label: 'Routes', route: 'Routes' },
    { icon: 'map-pin', label: 'Locations', route: 'Locations' },
    // { icon: 'calendar', label: 'Scheduled Rides', route: 'ScheduledRides' },
    // { icon: 'repeat', label: 'Recurring Rides', route: 'RecurringRides' },
    { icon: 'help-circle', label: 'Help', route: 'Help' },
    { icon: 'gift', label: 'Refer & Earn', route: 'ReferAndEarn' },
    // { icon: 'map', label: 'Scheduled Rides List', route: 'ScheduledRidesList' },
    // { icon: 'repeat', label: 'Recurring Rides List', route: 'RecurringRidesList' },
  ];

  const renderStatsContent = () => {
    if (driverStats.tripsCompleted === 0) {
      return (
        <Box
          bg="gray.50"
          p={6}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
          alignItems="center"
        >
          <Icon 
            as={FontAwesome5} 
            name="road" 
            size={8} 
            color="gray.300" 
            mb={4} 
          />
          <Text 
            fontSize="lg" 
            fontWeight="600" 
            color="gray.500"
            textAlign="center"
            mb={2}
          >
            Start Your Journey
          </Text>
          <Text 
            fontSize="sm" 
            color="gray.400"
            textAlign="center"
          >
            Complete your first ride to see your statistics and earn achievements
          </Text>
        </Box>
      );
    }

    return (
      <VStack space={4}>
        <Box
          bg="gray.50"
          p={4}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
        >
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={3} alignItems="center">
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                  shadow={1}
                >
                  <Icon as={FontAwesome5} name="route" size={4} color="gray.700" />
                </Box>
                <Text fontSize="sm" color="gray.600">Trips Completed</Text>
              </HStack>
              <Text fontSize="lg" fontWeight="700" color="gray.800">
                {driverStats.tripsCompleted || '0'}
              </Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={3} alignItems="center">
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                  shadow={1}
                >
                  <Icon as={FontAwesome5} name="road" size={4} color="gray.700" />
                </Box>
                <Text fontSize="sm" color="gray.600">Total Distance</Text>
              </HStack>
              <Text fontSize="lg" fontWeight="700" color="gray.800">
                {driverStats.totalDistance || '0'} km
              </Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={3} alignItems="center">
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                  shadow={1}
                >
                  <Icon as={FontAwesome5} name="calendar-alt" size={4} color="gray.700" />
                </Box>
                <Text fontSize="sm" color="gray.600">Member Since</Text>
              </HStack>
              <Text fontSize="lg" fontWeight="700" color="gray.800">Jan 2023</Text>
            </HStack>
          </VStack>
        </Box>

        {driverStats.tripsCompleted > 0 ? (
          <VStack space={3}>
            <Text fontSize="sm" fontWeight="600" color="gray.700">Achievements</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              <HStack space={3}>
                <Box
                  bg="yellow.50"
                  p={3}
                  borderRadius="xl"
                  borderWidth={1}
                  borderColor="yellow.100"
                >
                  <HStack space={2} alignItems="center">
                    <Icon as={FontAwesome5} name="award" size={4} color="yellow.600" />
                    <Text fontSize="sm" fontWeight="600" color="yellow.600">
                      Top Driver
                    </Text>
                  </HStack>
                </Box>
                <Box
                  bg="green.50"
                  p={3}
                  borderRadius="xl"
                  borderWidth={1}
                  borderColor="green.100"
                >
                  <HStack space={2} alignItems="center">
                    <Icon as={FontAwesome5} name="thumbs-up" size={4} color="green.600" />
                    <Text fontSize="sm" fontWeight="600" color="green.600">
                      95% Happy Riders
                    </Text>
                  </HStack>
                </Box>
                <Box
                  bg="blue.50"
                  p={3}
                  borderRadius="xl"
                  borderWidth={1}
                  borderColor="blue.100"
                >
                  <HStack space={2} alignItems="center">
                    <Icon as={FontAwesome5} name="clock" size={4} color="blue.600" />
                    <Text fontSize="sm" fontWeight="600" color="blue.600">
                      Always On Time
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            </ScrollView>
          </VStack>
        ) : (
          <Box
            bg="gray.50"
            p={4}
            borderRadius="xl"
            borderWidth={1}
            borderColor="gray.100"
            mt={4}
          >
            <VStack space={3} alignItems="center">
              <Icon 
                as={FontAwesome5} 
                name="trophy" 
                size={6} 
                color="gray.300" 
              />
              <Text 
                fontSize="md" 
                fontWeight="600" 
                color="gray.500"
                textAlign="center"
              >
                No Achievements Yet
              </Text>
              <Text 
                fontSize="sm" 
                color="gray.400"
                textAlign="center"
              >
                Complete rides to unlock achievements and rewards
              </Text>
            </VStack>
          </Box>
        )}
      </VStack>
    );
  };

  const renderInfoContent = () => (
    <VStack space={4}>
      <HStack justifyContent="space-between">
        <Box
          bg="gray.50"
          p={3}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
          width="48%"
        >
          <HStack space={2} alignItems="center">
            <Box
              bg="white"
              p={2}
              borderRadius="lg"
              borderWidth={1}
              borderColor="gray.100"
            >
              <Icon as={Feather} name="user" size={4} color="black" />
            </Box>
            <VStack>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                GENDER
              </Text>
              <Text fontSize="sm" color="gray.700" fontWeight="600">
                {formatGender(userData.gender)}
              </Text>
            </VStack>
          </HStack>
        </Box>
        <Box
          bg="gray.50"
          p={3}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
          width="48%"
        >
          <HStack space={2} alignItems="center">
            <Box
              bg="white"
              p={2}
              borderRadius="lg"
              borderWidth={1}
              borderColor="gray.100"
            >
              <Icon as={Feather} name="calendar" size={4} color="black" />
            </Box>
            <VStack>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                AGE
              </Text>
              <Text fontSize="sm" color="gray.700" fontWeight="600">
                {calculateAge(userData.dateOfBirth)}
              </Text>
            </VStack>
          </HStack>
        </Box>
      </HStack>

      <HStack justifyContent="space-between">
        <Box
          bg="gray.50"
          p={3}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
          width="48%"
        >
          <HStack space={2} alignItems="center">
            <Box
              bg="white"
              p={2}
              borderRadius="lg"
              shadow={1}
            >
              <Icon as={FontAwesome5} name="phone" size={4} color="gray.700" />
            </Box>
            <VStack>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">PHONE</Text>
              <Text fontSize="sm" fontWeight="600" color="gray.700">
                {userData.phone || '2342342423'}
              </Text>
            </VStack>
          </HStack>
        </Box>
        <Box
          bg="gray.50"
          p={3}
          borderRadius="xl"
          borderWidth={1}
          borderColor="gray.100"
          width="48%"
        >
          <HStack space={2} alignItems="center">
            <Box
              bg="white"
              p={2}
              borderRadius="lg"
              shadow={1}
            >
              <Icon as={FontAwesome5} name="map-marker-alt" size={4} color="gray.700" />
            </Box>
            <VStack>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">LOCATION</Text>
              <Text fontSize="sm" fontWeight="600" color="gray.700">
                New York
              </Text>
            </VStack>
          </HStack>
        </Box>
      </HStack>
     
    </VStack>
  );

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 500,
          easing: Easing.out(Easing.ease),
        }}
      >
        <Box
          bg="white"
          borderRadius="3xl"
          shadow={2}
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
            margin: 16,
            marginTop: 24,
          }}
        >
          <LinearGradient
            colors={['#000000', '#1a1a1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            <HStack space={4} alignItems="center">
              <Box
                bg="white"
                p={0.5}
                borderRadius="full"
                shadow={3}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Avatar
                  bg="gray.800"
                  size="lg"
                  source={null}
                >
                  {getInitials()}
                </Avatar>
              </Box>
              <VStack flex={1}>
                <Text color="white" fontSize="xl" fontWeight="700" numberOfLines={1}>
                  {userData.firstName || ''} {userData.lastName || ''}
                </Text>
                <HStack space={3} alignItems="center" mt={1}>
                  <Box
                    bg={isDriver ? (userData.licenseVerified ? "rgba(255,255,255,0.2)" : "rgba(255,165,0,0.2)") : "rgba(255,255,255,0.2)"}
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    <HStack space={2} alignItems="center">
                      <Icon 
                        as={MaterialIcons} 
                        name={driverVerified ? "verified" : "error-outline"} 
                        size="xs" 
                        color="white" 
                      />
                      <Text color="white" fontSize="xs" fontWeight="600">
                        {isDriver
                          ? (driverVerified ? 'VERIFIED DRIVER' : 'VERIFICATION NEEDED')
                          : 'VERIFIED USER'}
                      </Text>

                    </HStack>
                  </Box>
                  <HStack space={1} alignItems="center">
                    <Icon as={FontAwesome5} name="star" size={3} color="yellow.400" />
                    <Text color="white" fontSize="sm" fontWeight="600">
                      {calculateAverageRating(reviews)}
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            </HStack>
          </LinearGradient>

          <Box p={5}>
            <HStack 
              bg="gray.50"
              p={1}
              borderRadius="2xl"
              mb={4}
              borderWidth={1}
              borderColor="gray.100"
            >
              <Pressable
                flex={1}
                onPress={() => setActiveTab('info')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Box
                  bg={activeTab === 'info' ? 'black' : 'transparent'}
                  py={2}
                  borderRadius="xl"
                  alignItems="center"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={activeTab === 'info' ? 'white' : 'gray.500'}
                  >
                    Info
                  </Text>
                </Box>
              </Pressable>
              <Pressable
                flex={1}
                onPress={() => setActiveTab('stats')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Box
                  bg={activeTab === 'stats' ? 'black' : 'transparent'}
                  py={2}
                  borderRadius="xl"
                  alignItems="center"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={activeTab === 'stats' ? 'white' : 'gray.500'}
                  >
                    Stats
                  </Text>
                </Box>
              </Pressable>
            </HStack>

            {activeTab === 'info' && renderInfoContent()}

            {activeTab === 'stats' && renderStatsContent()}
          </Box>
        </Box>
      </MotiView>

      {/* Keep existing Quick Actions and Logout button */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <Box style={styles.quickActionsContainer}>
        {quickActions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickAction}
            onPress={() => navigation.navigate(item.route)}
          >
            <Icon as={Feather} name={item.icon} size={6} color="black" mb={2} />
            <Text style={styles.quickActionText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </Box>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <HStack space={2} alignItems="center">
          <Icon as={Feather} name="log-out" size={5} color="white" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </HStack>
      </Pressable>

      
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'white',
    paddingBottom: 80,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  switchContainer: {
    width: 44,
    height: 24,
    padding: 2,
  },
  switchTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    position: 'relative',
  },
  switchTrackActive: {
    backgroundColor: '#000',
  },
  switchThumb: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    position: 'absolute',
    left: 2,
    transition: '0.2s',
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  switchText: {
    fontSize: 14,
    color: '#6B7280',
  },
  switchTextActive: {
    color: '#000',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  tabsList: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  infoItem: {
    flex: 1,
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginTop: 20,
    marginBottom: 15,
    marginLeft: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  quickAction: {
    width: '30%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'black',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  achievementsScroll: {
    paddingVertical: 4,
    paddingRight: 16, // Add some padding at the end of scroll
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8, // Space between badges
  },
  achievementText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 6,
  },
});

export default ProfileScreen;
