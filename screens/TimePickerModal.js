import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Dimensions, View, Text } from 'react-native';
import { Modal, HStack, Box, Icon } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';

const { width, height } = Dimensions.get('window');

const TimePickerModal = ({ isOpen, onClose, onSelect, initialTime, is24Hour = false }) => {
  const getCurrentTime = () => {
    const now = new Date();
    return {
      hour: now.getHours() % 12 || 12,
      minute: now.getMinutes(),
      period: now.getHours() >= 12 ? 'PM' : 'AM'
    };
  };

  const parseInitialTime = () => {
    if (initialTime) {
      try {
        const [hours, minutes] = initialTime.split(':');
        const parsedHours = parseInt(hours);
        const parsedMinutes = parseInt(minutes);
        if (isNaN(parsedHours) || isNaN(parsedMinutes)) {
          throw new Error('Invalid time format');
        }
        return {
          hour: parsedHours % 12 || 12,
          minute: parsedMinutes,
          period: parsedHours >= 12 ? 'PM' : 'AM'
        };
      } catch (error) {
        console.error('Error parsing initial time:', error);
      }
    }
    return getCurrentTime();
  };

  const initialTimeValues = parseInitialTime();

  const [selectedHour, setSelectedHour] = useState(initialTimeValues.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTimeValues.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialTimeValues.period);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleScroll = (event, setSelected, items) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / 50);
    setSelected(items[index]);
  };

  const handleConfirm = () => {
    let hour = selectedHour;
    if (selectedPeriod === 'PM' && hour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && hour === 12) {
      hour = 0;
    }
    const formattedTime = `${hour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSelect(formattedTime);
    onClose();
  };

  const renderScrollViewContent = (items, selectedItem, setSelectedItem) => {
    return (
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        snapToInterval={50}
        decelerationRate="fast"
        onScroll={(event) => handleScroll(event, setSelectedItem, items)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollViewContent}
        style={styles.scrollView}
      >
        {items.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.itemContainer}
            onPress={() => setSelectedItem(item)}
          >
            <Text
              style={[
                styles.itemText,
                item === selectedItem && styles.selectedItemText
              ]}
            >
              {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
        <HStack justifyContent="space-between" alignItems="center" mb={4}>
          <Text style={styles.title}>Set Time</Text>
          <Text style={styles.selectedTime}>
            {format(new Date(2023, 0, 1, selectedHour, selectedMinute), is24Hour ? 'HH:mm' : 'hh:mm a')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon as={MaterialIcons} name="close" size={6} color="black" />
          </TouchableOpacity>
        </HStack>

        <Box style={styles.pickerContainer}>
          <HStack justifyContent="space-between" height={200}>
            {renderScrollViewContent(hours, selectedHour, setSelectedHour)}
            {renderScrollViewContent(minutes, selectedMinute, setSelectedMinute)}
            {renderScrollViewContent(periods, selectedPeriod, setSelectedPeriod)}
          </HStack>
          <Box style={styles.selectionIndicator} />
        </Box>

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  selectedTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  pickerContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: 75,
  },
  itemContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 20,
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  selectedItemText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    transform: [{ translateY: -25 }],
  },
  confirmButton: {
    backgroundColor: 'black',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TimePickerModal;