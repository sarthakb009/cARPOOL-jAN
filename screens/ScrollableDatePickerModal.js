import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Dimensions, View } from 'react-native';
import { Modal, Text, HStack, Box, Icon, VStack } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

const ScrollableDatePickerModal = ({
  isOpen,
  onClose,
  onSelect,
  initialDate,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  locale = 'en-US',
}) => {
  const initialDateObj = initialDate ? new Date(initialDate) : new Date();

  const [selectedYear, setSelectedYear] = useState(initialDateObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDateObj.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDateObj.getDate());
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  const yearScrollViewRef = useRef(null);
  const monthScrollViewRef = useRef(null);
  const dayScrollViewRef = useRef(null);

  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2000, i).toLocaleString(locale, { month: 'long' })), [locale]);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

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

      // Center the initial date
      yearScrollViewRef.current?.scrollTo({ y: (years.indexOf(selectedYear) - 2) * ITEM_HEIGHT, animated: false });
      monthScrollViewRef.current?.scrollTo({ y: (selectedMonth - 2) * ITEM_HEIGHT, animated: false });
      dayScrollViewRef.current?.scrollTo({ y: (selectedDay - 3) * ITEM_HEIGHT, animated: false });
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

  const handleScroll = useCallback((event, setSelected, items, type) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    if (type === 'month') {
      setSelected(index);
    } else {
      setSelected(items[index]);
    }
  }, []);

  const handleMomentumScrollEnd = useCallback((event, scrollViewRef, items, type) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    const index = Math.round(yOffset / ITEM_HEIGHT);
    scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  }, []);

  const isValidDate = useCallback((year, month, day) => {
    const date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  }, []);

  const handleConfirm = useCallback(() => {
    if (isValidDate(selectedYear, selectedMonth, selectedDay)) {
      const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
      onSelect(selectedDate);
      onClose();
      setError('');
    } else {
      setError('Selected date is invalid');
    }
  }, [selectedYear, selectedMonth, selectedDay, onSelect, onClose]);

  const renderScrollViewContent = useCallback((items, selectedItem, setSelectedItem, type, scrollViewRef) => {
    return (
      <Animated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={(event) => handleScroll(event, setSelectedItem, items, type)}
        onMomentumScrollEnd={(event) => handleMomentumScrollEnd(event, scrollViewRef, items, type)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollViewContent}
        style={styles.scrollView}
        accessible={true}
        accessibilityLabel={`Select ${type}`}
      >
        {items.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.itemContainer}
            onPress={() => {
              if (type === 'month') {
                setSelectedItem(index);
              } else {
                setSelectedItem(item);
              }
              scrollViewRef.current?.scrollTo({ y: (type === 'month' ? index : items.indexOf(item)) * ITEM_HEIGHT, animated: true });
            }}
            accessible={true}
            accessibilityLabel={`${type} ${item}`}
            accessibilityRole="button"
          >
            <Animated.Text
              style={[
                styles.itemText,
                (type === 'month' ? selectedItem === index : selectedItem === item) && styles.selectedItemText
              ]}
            >
              {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
    );
  }, [handleScroll, handleMomentumScrollEnd]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
        <HStack justifyContent="space-between" alignItems="center" mb={4}>
          <Text style={styles.title}>{new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          <TouchableOpacity onPress={onClose} accessible={true} accessibilityLabel="Close" accessibilityRole="button">
            <Icon as={MaterialIcons} name="close" size={6} color="black" />
          </TouchableOpacity>
        </HStack>

        <Box style={styles.pickerContainer}>
          <HStack justifyContent="space-between" height={ITEM_HEIGHT * VISIBLE_ITEMS}>
            {renderScrollViewContent(years, selectedYear, setSelectedYear, 'year', yearScrollViewRef)}
            {renderScrollViewContent(months, selectedMonth, setSelectedMonth, 'month', monthScrollViewRef)}
            {renderScrollViewContent(days, selectedDay, setSelectedDay, 'day', dayScrollViewRef)}
          </HStack>
          <Box style={styles.selectionIndicator} />
        </Box>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={handleConfirm}
          accessible={true}
          accessibilityLabel="Confirm date selection"
          accessibilityRole="button"
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  pickerContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  itemContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  selectedItemText: {
    fontSize: 20,
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ScrollableDatePickerModal;