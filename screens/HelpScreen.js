import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Divider, Button } from 'native-base';
import { Feather, MaterialIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HelpScreen = () => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [helpfulResponses, setHelpfulResponses] = useState({});

  const helpSections = [
    {
      title: 'Getting Started',
      items: [
        { 
          icon: 'car', 
          label: 'How to book a ride',
          answer: 'To book a ride:\n\n1. Open the app and enter your destination\n2. Choose your preferred ride type\n3. Confirm your pickup location\n4. Tap "Book Ride"\n\nYou\'ll be matched with a nearby driver and can track their arrival in real-time.',
          route: 'BookingGuide' 
        },
        { 
          icon: 'user-plus', 
          label: 'Creating an account',
          answer: 'To create an account:\n\n1. Download the app\n2. Tap "Sign Up"\n3. Enter your phone number for verification\n4. Fill in your personal details\n5. Add a payment method\n\nOnce verified, you can start booking rides immediately!',
          route: 'AccountGuide' 
        },
        { 
          icon: 'map-pin', 
          label: 'Understanding the map',
          answer: 'The map shows:\n\n• Your current location (blue dot)\n• Nearby drivers (car icons)\n• Pickup and dropoff points\n• Estimated arrival times\n\nYou can drag the map to explore different areas and zoom in/out for better detail.',
          route: 'MapGuide' 
        },
      ]
    },
    {
      title: 'Ride Issues',
      items: [
        { icon: 'clock', label: 'Cancellation policy', route: 'CancellationPolicy' },
        { icon: 'alert-circle', label: 'Report a problem', route: 'ReportIssue' },
        { icon: 'dollar-sign', label: 'Payment issues', route: 'PaymentHelp' },
      ]
    },
    {
      title: 'Contact Us',
      items: [
        { icon: 'mail', label: 'Email support', action: () => Linking.openURL('mailto:support@example.com') },
        { icon: 'phone', label: 'Call us', action: () => Linking.openURL('tel:+1234567890') },
        { icon: 'message-circle', label: 'Live chat', route: 'LiveChat' },
      ]
    }
  ];

  const handleQuestionPress = (item) => {
    setSelectedQuestion(selectedQuestion?.label === item.label ? null : item);
  };

  const handleFeedback = (questionLabel, isHelpful) => {
    setHelpfulResponses({
      ...helpfulResponses,
      [questionLabel]: isHelpful,
    });
  };

  const renderAnswer = (item) => {
    const hasGivenFeedback = helpfulResponses.hasOwnProperty(item.label);

    return (
      <VStack space={4} mt={4}>
        <Text style={styles.answerText}>{item.answer}</Text>
        
        {!hasGivenFeedback ? (
          <VStack space={2}>
            <Text style={styles.feedbackQuestion}>Was this helpful?</Text>
            <HStack space={4} justifyContent="center">
              <Button
                leftIcon={<Icon as={AntDesign} name="like2" size="sm" color="white" />}
                style={styles.feedbackButton}
                onPress={() => handleFeedback(item.label, true)}
              >
                Yes
              </Button>
              <Button
                leftIcon={<Icon as={AntDesign} name="dislike2" size="sm" color="white" />}
                style={styles.feedbackButton}
                onPress={() => handleFeedback(item.label, false)}
              >
                No
              </Button>
            </HStack>
          </VStack>
        ) : (
          <Text style={styles.feedbackThankYou}>
            Thank you for your feedback!
          </Text>
        )}
      </VStack>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#000000', '#333333']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>How can we help you?</Text>
        <Text style={styles.headerSubtitle}>Find answers to your questions</Text>
      </LinearGradient>

      <Box style={styles.content}>
        {helpSections.map((section, index) => (
          <Box key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <VStack space={4}>
              {section.items.map((item, itemIndex) => (
                <Box key={itemIndex}>
                  <TouchableOpacity
                    onPress={() => handleQuestionPress(item)}
                  >
                    <HStack
                      style={[
                        styles.helpItem,
                        selectedQuestion?.label === item.label && styles.selectedItem
                      ]}
                      space={4}
                      alignItems="center"
                    >
                      <Icon
                        as={Feather}
                        name={item.icon}
                        size={6}
                        color={selectedQuestion?.label === item.label ? "white" : "black"}
                      />
                      <VStack flex={1}>
                        <Text style={[
                          styles.itemLabel,
                          selectedQuestion?.label === item.label && styles.selectedText
                        ]}>
                          {item.label}
                        </Text>
                      </VStack>
                      <Icon
                        as={MaterialIcons}
                        name={selectedQuestion?.label === item.label ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                        size={6}
                        color={selectedQuestion?.label === item.label ? "white" : "gray.400"}
                      />
                    </HStack>
                  </TouchableOpacity>
                  
                  {selectedQuestion?.label === item.label && renderAnswer(item)}
                  
                  {itemIndex < section.items.length - 1 && <Divider my={2} />}
                </Box>
              ))}
            </VStack>
          </Box>
        ))}
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
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 16,
  },
  helpItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  itemLabel: {
    fontSize: 16,
    color: 'black',
    fontWeight: '500',
  },
  selectedItem: {
    backgroundColor: 'black',
  },
  selectedText: {
    color: 'white',
  },
  answerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  feedbackQuestion: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  feedbackButton: {
    backgroundColor: 'black',
    minWidth: 100,
  },
  feedbackThankYou: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default HelpScreen;
