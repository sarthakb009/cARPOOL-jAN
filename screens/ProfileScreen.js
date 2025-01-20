import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Box, HStack, VStack, Text, Icon, Pressable } from 'native-base';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [isDriver, setIsDriver] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      const response = await axios.get(`http://ec2-3-104-95-118.ap-southeast-2.compute.amazonaws.com:8081/user/manage/get?username=${username}`);
      setUserData(response.data);
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

  const quickActions = [
    { icon: 'truck', label: 'Vehicles', route: 'Vehicles' },
    { icon: 'user', label: 'Driver Profile', route: 'DriverProfile' },
    { icon: 'map', label: 'Routes', route: 'Routes' },
    { icon: 'map-pin', label: 'Locations', route: 'Locations' },
    { icon: 'calendar', label: 'Scheduled Rides', route: 'ScheduledRides' },
    { icon: 'repeat', label: 'Recurring Rides', route: 'RecurringRides' },
    { icon: 'help-circle', label: 'Help', route: 'Help' },
    { icon: 'gift', label: 'Refer & Earn', route: 'ReferAndEarn' },
    { icon: 'map', label: 'Scheduled Rides List', route: 'ScheduledRidesList' },
    { icon: 'repeat', label: 'Recurring Rides List', route: 'RecurringRidesList' },
  ];





  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Box style={styles.profileCard}>
        {/* Header with Avatar and Name */}
        <HStack alignItems="center" mb={4} space={3}>
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </LinearGradient>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {userData.firstName || ''} {userData.lastName || ''}
          </Text>
        </HStack>

        {/* Name and Badge */}
        <VStack space={2} mb={4}>

          <HStack space={3} alignItems="center">
            <Box style={styles.badge}>
              <Text style={styles.badgeText}>
                {isDriver ? 'Verified Driver' : 'Verified User'}
              </Text>
            </Box>
            <HStack alignItems="center" space={1}>
              <Icon as={Feather} name="star" size={3} color="yellow.400" />
              <Text style={styles.ratingText}>4.8</Text>
            </HStack>
          </HStack>
        </VStack>

        {/* Tabs */}
        <HStack style={styles.tabsList} mb={4}>
          <Pressable
            style={[styles.tabButton, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats</Text>
          </Pressable>
        </HStack>

        {/* Info Content */}
        {activeTab === 'info' && (
          <VStack space={3}>
            <HStack justifyContent="space-between">
              <HStack space={3} alignItems="center" style={styles.infoItem}>
                <Icon as={Feather} name="phone" size={4} color="gray.600" />
                <Text style={styles.infoText}>{userData.phone || '2342342423'}</Text>
              </HStack>
              <HStack space={3} alignItems="center" style={styles.infoItem}>
                <Icon as={Feather} name="user" size={4} color="gray.600" />
                <Text style={styles.infoText}>{userData.gender || 'Male'}</Text>
              </HStack>
            </HStack>
            <HStack justifyContent="space-between">
              <HStack space={3} alignItems="center" style={styles.infoItem}>
                <Icon as={Feather} name="calendar" size={4} color="gray.600" />
                <Text style={styles.infoText}>{calculateAge(userData.dateOfBirth)} years</Text>
              </HStack>
              <HStack space={3} alignItems="center" style={styles.infoItem}>
                <Icon as={Feather} name="map-pin" size={4} color="gray.600" />
                <Text style={styles.infoText}>New York</Text>
              </HStack>
            </HStack>
          </VStack>
        )}

        {/* Stats Content */}
        {activeTab === 'stats' && (
          <VStack space={4}>
            {/* Stats Lines */}
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.statLabel}>Trips Completed</Text>
                <Text style={styles.statValue}>142</Text>
              </HStack>

              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.statLabel}>Total Distance</Text>
                <Text style={styles.statValue}>1,230 km</Text>
              </HStack>

              <HStack justifyContent="space-between" alignItems="center">
                <Text style={styles.statLabel}>Member Since</Text>
                <Text style={styles.statValue}>Jan 2023</Text>
              </HStack>
            </VStack>

            {/* Achievement Tags */}
            <VStack space={2}>
              <Text style={styles.statSectionTitle}>Achievements</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.achievementsScroll}
              >
                <Box style={styles.achievementBadge}>
                  <Icon as={Feather} name="award" size={4} color="#FFD700" />
                  <Text style={styles.achievementText}>Top Driver</Text>
                </Box>
                <Box style={styles.achievementBadge}>
                  <Icon as={Feather} name="thumbs-up" size={4} color="#4CAF50" />
                  <Text style={styles.achievementText}>95% Happy Riders</Text>
                </Box>
                <Box style={styles.achievementBadge}>
                  <Icon as={Feather} name="clock" size={4} color="#2196F3" />
                  <Text style={styles.achievementText}>Always On Time</Text>
                </Box>
                <Box style={styles.achievementBadge}>
                  <Icon as={Feather} name="star" size={4} color="#FFA500" />
                  <Text style={styles.achievementText}>5-Star Rating</Text>
                </Box>
              </ScrollView>
            </VStack>
          </VStack>
        )}

      </Box>

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

      {/* Add the ride management section */}
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