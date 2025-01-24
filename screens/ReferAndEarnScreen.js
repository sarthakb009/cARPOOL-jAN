import React, { useState } from 'react';
import { ScrollView, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Button } from 'native-base';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

const ReferAndEarnScreen = () => {
  const [referralCode] = useState('RIDE2023');

  const shareReferralCode = async () => {
    try {
      await Share.share({
        message: `Join me on RideShare! Use my referral code ${referralCode} to get your first ride free!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(referralCode);
    // You might want to show a toast message here
  };

  const rewards = [
    { icon: 'gift', title: 'For Your Friend', description: 'First ride free up to $20' },
    { icon: 'dollar-sign', title: 'For You', description: '$10 credit for each referral' },
    { icon: 'users', title: 'Unlimited Referrals', description: 'No limit on earnings' },
  ];

  return (
    <ScrollView style={styles.container}>
 

      <Box style={styles.content}>
        <Box style={styles.referralCard}>
          <Text style={styles.referralTitle}>Your Referral Code</Text>
          <HStack style={styles.codeContainer} space={4} alignItems="center">
            <Text style={styles.referralCode}>{referralCode}</Text>
            <TouchableOpacity onPress={copyToClipboard}>
              <Icon as={Feather} name="copy" size={5} color="white" />
            </TouchableOpacity>
          </HStack>
          <Button
            leftIcon={<Icon as={Feather} name="share-2" size={5} color="white" />}
            style={styles.shareButton}
            onPress={shareReferralCode}
          >
            Share Code
          </Button>
        </Box>

        <Text style={styles.sectionTitle}>How it works</Text>
        <VStack space={4}>
          {rewards.map((reward, index) => (
            <Box key={index} style={styles.rewardCard}>
              <HStack space={4} alignItems="center">
                <Box style={styles.iconContainer}>
                  <Icon as={Feather} name={reward.icon} size={6} color="black" />
                </Box>
                <VStack flex={1}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>

        <Box style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Referral Stats</Text>
          <HStack justifyContent="space-between" mt={4}>
            <VStack alignItems="center">
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </VStack>
            <VStack alignItems="center">
              <Text style={styles.statNumber}>$0</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </VStack>
            <VStack alignItems="center">
              <Text style={styles.statNumber}>$0</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </VStack>
          </HStack>
        </Box>
      </Box>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  referralCard: {
    backgroundColor: 'black',
    borderRadius: 15,
    padding: 20,
    marginTop: -30,
    marginBottom: 24,
  },
  referralTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  codeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  shareButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 16,
  },
  rewardCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  rewardDescription: {
    fontSize: 14,
    color: 'gray',
  },
  statsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginTop: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  statLabel: {
    fontSize: 14,
    color: 'gray',
  },
});

export default ReferAndEarnScreen;
